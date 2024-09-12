import express = require("express");
import getStream = require("get-stream");
import { StreamMessageReader } from "./stream_message_reader";
import {
  newBadRequestError,
  newInternalServerErrorError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { MessageDescriptor } from "@selfage/message/descriptor";
import {
  deserializeMessage,
  serializeMessage,
} from "@selfage/message/serializer";
import { destringifyMessage } from "@selfage/message/stringifier";
import { PrimitveTypeForBody } from "@selfage/service_descriptor";
import {
  NodeHandlerInterface,
  WebHandlerInterface,
} from "@selfage/service_descriptor/handler_interface";

export class BaseWebRemoteCallHandler {
  public static create(): BaseWebRemoteCallHandler {
    return new BaseWebRemoteCallHandler();
  }

  public async handleWeb(
    remoteCallHandler: WebHandlerInterface,
    req: express.Request,
    res: express.Response,
  ): Promise<void> {
    await this.handle(remoteCallHandler, req, res, (loggingPrefix, args) => {
      if (remoteCallHandler.descriptor.sessionKey) {
        let sessionStr = req.header(remoteCallHandler.descriptor.sessionKey);
        if (!sessionStr) {
          throw newUnauthorizedError(
            `${loggingPrefix} no session string is found in the header ${remoteCallHandler.descriptor.sessionKey}.`,
          );
        }
        args.push(sessionStr);
      }
    });
  }

  public async handleNode(
    remoteCallHandler: NodeHandlerInterface,
    req: express.Request,
    res: express.Response,
  ): Promise<void> {
    await this.handle(remoteCallHandler, req, res, () => {});
  }

  public async handle(
    remoteCallHandler: WebHandlerInterface | NodeHandlerInterface,
    req: express.Request,
    res: express.Response,
    getSessionStr: (loggingPrefix: string, args: Array<any>) => void,
  ): Promise<void> {
    // Always allow CORS.
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");

    let requestId = `${Math.floor(Date.now() / 1000)}-${Math.floor(
      Math.random() * 10000,
    )}`;
    let loggingPrefix = `Request ${requestId}:`;
    console.info(`${loggingPrefix} ${req.url}.`);

    try {
      let response = await this.handleRequest(
        remoteCallHandler,
        req,
        loggingPrefix,
        getSessionStr,
      );
      await this.sendResponse(
        res,
        response,
        remoteCallHandler.descriptor.response.messageType,
      );
    } catch (e) {
      if (e.stack) {
        console.error(`${loggingPrefix} ${e.stack}`);
      } else {
        console.error(`${loggingPrefix} ${e}`);
      }
      if (e.statusCode) {
        res.sendStatus(e.statusCode);
      } else {
        res.sendStatus(500);
      }
      await new Promise<void>((resolve) => res.end(resolve));
    }
  }

  private async handleRequest(
    remoteCallHandler: WebHandlerInterface | NodeHandlerInterface,
    req: express.Request,
    loggingPrefix: string,
    getSessionStr: (loggingPrefix: string, args: Array<any>) => void,
  ): Promise<any> {
    let args: any[] = [loggingPrefix];
    if (remoteCallHandler.descriptor.body.messageType) {
      let bodyBuffer = await getStream.buffer(req, {
        maxBuffer: 1 * 1024 * 1024,
      });
      args.push(
        this.deserialize(
          bodyBuffer,
          remoteCallHandler.descriptor.body.messageType,
          loggingPrefix,
          `body`,
        ),
      );
    } else if (remoteCallHandler.descriptor.body.streamMessageType) {
      // NOTE: Doesn't work! Client side requires http2 to enable custom streaming with unspecified content length.
      let streamReader = new StreamMessageReader(
        req,
        remoteCallHandler.descriptor.body.streamMessageType,
      );
      args.push(streamReader);
    } else if (
      remoteCallHandler.descriptor.body.primitiveType ===
      PrimitveTypeForBody.BYTES
    ) {
      args.push(req);
    } else {
      throw newInternalServerErrorError(`Unsupported server request body.`);
    }

    if (remoteCallHandler.descriptor.metadata) {
      args.push(
        this.destringify(
          req.query[remoteCallHandler.descriptor.metadata.key] as string,
          remoteCallHandler.descriptor.metadata.type,
          loggingPrefix,
          `metadata`,
        ),
      );
    }

    getSessionStr(loggingPrefix, args);
    return remoteCallHandler.handle(...args);
  }

  private destringify(
    value: string,
    messageDescriptor: MessageDescriptor<any>,
    loggingPrefix: string,
    what: string,
  ): any {
    try {
      return destringifyMessage(value, messageDescriptor);
    } catch (e) {
      throw newBadRequestError(
        `${loggingPrefix} Unable to destringify ${what}. Raw string: ${value}.`,
      );
    }
  }

  private deserialize(
    value: Uint8Array,
    messageDescriptor: MessageDescriptor<any>,
    loggingPrefix: string,
    what: string,
  ): any {
    try {
      return deserializeMessage(value, messageDescriptor);
    } catch (e) {
      throw newBadRequestError(
        `${loggingPrefix} Unable to deserialize ${what}. Raw value as base64: ${Buffer.from(value).toString("base64")}.`,
      );
    }
  }

  private async sendResponse(
    res: express.Response,
    handlerResponse: any,
    messageDescriptor: MessageDescriptor<any>,
  ): Promise<void> {
    await new Promise<void>((resolve) =>
      res.end(serializeMessage(handlerResponse, messageDescriptor), resolve),
    );
  }
}
