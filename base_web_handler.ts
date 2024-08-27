import express = require("express");
import getStream = require("get-stream");
import { SessionExtractor } from "./session_signer";
import { StreamMessageReader } from "./stream_message_reader";
import {
  newBadRequestError,
  newInternalServerErrorError,
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

export interface Logger {
  info(str: string): void;
  warn(str: string): void;
  error(str: string): void;
}

export class ConsoleLogger {
  public info(str: string): void {
    console.info(str);
  }
  public warn(str: string): void {
    console.warn(str);
  }
  public error(str: string): void {
    console.error(str);
  }
}

export class BaseWebRemoteCallHandler {
  public static create(
    sessionExtractor: SessionExtractor,
    logger: Logger,
  ): BaseWebRemoteCallHandler {
    return new BaseWebRemoteCallHandler(sessionExtractor, logger);
  }

  public constructor(
    private sessionExtractor: SessionExtractor,
    private logger: Logger,
  ) {}

  public async handleWeb(
    remoteCallHandler: WebHandlerInterface,
    req: express.Request,
    res: express.Response,
  ): Promise<void> {
    await this.handle(remoteCallHandler, req, res, (loggingPrefix: string) => {
      if (remoteCallHandler.descriptor.auth) {
        return this.sessionExtractor.extract(
          req.header(remoteCallHandler.descriptor.auth.key),
          remoteCallHandler.descriptor.auth.type,
          loggingPrefix,
        );
      }
    });
  }

  public async handleNode(
    remoteCallHandler: NodeHandlerInterface,
    req: express.Request,
    res: express.Response,
  ): Promise<void> {
    await this.handle(remoteCallHandler, req, res);
  }

  public async handle(
    remoteCallHandler: WebHandlerInterface | NodeHandlerInterface,
    req: express.Request,
    res: express.Response,
    getAuthArg?: (loggingPrefix: string) => string,
  ): Promise<void> {
    // Always allow CORS.
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");

    let requestId = `${Math.floor(Date.now() / 1000)}-${Math.floor(
      Math.random() * 10000,
    )}`;
    let loggingPrefix = `Request ${requestId}:`;
    this.logger.info(`${loggingPrefix} ${req.url}.`);

    try {
      let response = await this.handleRequest(
        remoteCallHandler,
        req,
        loggingPrefix,
        getAuthArg,
      );
      await this.sendResponse(
        res,
        response,
        remoteCallHandler.descriptor.response.messageType,
      );
    } catch (e) {
      if (e.stack) {
        this.logger.error(`${loggingPrefix} ${e.stack}`);
      } else {
        this.logger.error(`${loggingPrefix} ${e}`);
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
    getAuthArg?: (loggingPrefix: string) => string,
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

    if (getAuthArg) {
      args.push(getAuthArg(loggingPrefix));
    }
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
