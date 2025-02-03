import express = require("express");
import getStream = require("get-stream");
import promClient = require("prom-client");
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
import { HandlerInterface } from "@selfage/service_descriptor/handler_interface";

let TOTAL_COUNTER = new promClient.Counter({
  name: "remote_calls_total",
  help: "The total number of calls received.",
  labelNames: ["path"],
});
let FAILURE_COUNTER = new promClient.Counter({
  name: "remote_calls_failure",
  help: "The number of failed calls.",
  labelNames: ["path", "error_code"],
});

export class BaseHandler {
  public static create(): BaseHandler {
    return new BaseHandler();
  }

  public async handle(
    remoteCallHandler: HandlerInterface,
    req: express.Request,
    res: express.Response,
  ): Promise<void> {
    TOTAL_COUNTER.inc({ path: remoteCallHandler.descriptor.path });
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
        loggingPrefix,
        remoteCallHandler,
        req,
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
      let statusCode: number;
      if (e.statusCode) {
        statusCode = e.statusCode;
      } else {
        statusCode = 500;
      }
      FAILURE_COUNTER.inc({
        path: remoteCallHandler.descriptor.path,
        error_code: statusCode,
      });
      res.sendStatus(statusCode);
      await new Promise<void>((resolve) => res.end(resolve));
    }
  }

  private async handleRequest(
    loggingPrefix: string,
    remoteCallHandler: HandlerInterface,
    req: express.Request,
  ): Promise<any> {
    let args: any[] = [loggingPrefix];
    if (remoteCallHandler.descriptor.body.messageType) {
      let bodyBuffer = await getStream.buffer(req, {
        maxBuffer: 1 * 1024 * 1024,
      });
      args.push(
        this.deserialize(
          loggingPrefix,
          bodyBuffer,
          remoteCallHandler.descriptor.body.messageType,
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
          loggingPrefix,
          req.query[remoteCallHandler.descriptor.metadata.key] as string,
          remoteCallHandler.descriptor.metadata.type,
          `metadata`,
        ),
      );
    }

    if (remoteCallHandler.descriptor.authKey) {
      let authStr = req.header(remoteCallHandler.descriptor.authKey);
      if (!authStr) {
        throw newUnauthorizedError(
          `${loggingPrefix} No auth string is found in the header ${remoteCallHandler.descriptor.authKey}.`,
        );
      }
      args.push(authStr);
    }
    return remoteCallHandler.handle(...args);
  }

  private destringify(
    loggingPrefix: string,
    value: string,
    messageDescriptor: MessageDescriptor<any>,
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
    loggingPrefix: string,
    value: Uint8Array,
    messageDescriptor: MessageDescriptor<any>,
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
