import express = require("express");
import getStream = require("get-stream");
import promClient = require("prom-client");
import { StreamMessageReader } from "./stream_message_reader";
import {
  StatusCode,
  newBadRequestError,
  newInternalServerErrorError,
  newUnauthorizedError,
} from "@selfage/http_error";
import { MessageDescriptor } from "@selfage/message/descriptor";
import { parseMessage } from "@selfage/message/parser";
import {
  deserializeMessage,
  serializeMessage,
} from "@selfage/message/serializer";
import { destringifyMessage } from "@selfage/message/stringifier";
import { PrimitveTypeForBody } from "@selfage/service_descriptor";
import { RemoteCallHandlerInterface } from "@selfage/service_descriptor/remote_call_handler_interface";

let TOTAL_COUNTER = new promClient.Counter({
  name: "remote_calls_total",
  help: "The total number of calls received.",
  labelNames: ["path"],
});
let FAILURE_COUNTER = new promClient.Counter({
  name: "remote_calls_failure",
  help: "The number of failed calls.",
  labelNames: ["path", "errorCode"],
});

export class BaseRemoteCallHandler {
  public static create(allowOrigin: string): BaseRemoteCallHandler {
    return new BaseRemoteCallHandler(allowOrigin);
  }

  public constructor(private allowOrigin: string) {}

  public async handle(
    remoteCallHandler: RemoteCallHandlerInterface,
    req: express.Request,
    res: express.Response,
  ): Promise<void> {
    TOTAL_COUNTER.inc({
      path:
        remoteCallHandler.descriptor.service.path +
        remoteCallHandler.descriptor.path,
    });
    // Add CORS rules.
    res.setHeader("Access-Control-Allow-Origin", this.allowOrigin);
    res.setHeader("Access-Control-Allow-Methods", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");

    let requestId = `${Math.floor(Date.now() / 1000)}-${Math.floor(
      Math.random() * 10000,
    )}`;
    let loggingPrefix = `Request ${requestId}:`;
    console.info(`${loggingPrefix} ${req.url}.`);

    try {
      await this.handleRequest(loggingPrefix, remoteCallHandler, req, res);
    } catch (e) {
      console.error(`${loggingPrefix} ${e.stack ?? e.message ?? e}`);
      let statusCode = e.statusCode ?? StatusCode.InternalServerError;
      FAILURE_COUNTER.inc({
        path:
          remoteCallHandler.descriptor.service.path +
          remoteCallHandler.descriptor.path,
        errorCode: statusCode,
      });
      res.sendStatus(statusCode);
      await new Promise<void>((resolve) => res.end(resolve));
    }
  }

  private async handleRequest(
    loggingPrefix: string,
    remoteCallHandler: RemoteCallHandlerInterface,
    req: express.Request,
    res: express.Response,
  ): Promise<void> {
    let args: any[] = [loggingPrefix];
    let legacyJsonQuery = false;
    if (remoteCallHandler.descriptor.body.messageType) {
      let bodyBuffer = await getStream.buffer(req, {
        maxBuffer: 1 * 1024 * 1024,
      });
      if (req.headers["content-type"] === "application/json") {
        legacyJsonQuery = true;
        let bodyStr = bodyBuffer.toString("utf-8");
        args.push(
          this.parse(
            loggingPrefix,
            bodyStr,
            remoteCallHandler.descriptor.body.messageType,
            `body`,
          ),
        );
      } else {
        args.push(
          this.deserialize(
            loggingPrefix,
            bodyBuffer,
            remoteCallHandler.descriptor.body.messageType,
            `body`,
          ),
        );
      }
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
          `No auth string is found in the header ${remoteCallHandler.descriptor.authKey}.`,
        );
      }
      args.push(authStr);
    }
    let response = await remoteCallHandler.handle(...args);

    await new Promise<void>((resolve) => {
      if (legacyJsonQuery) {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(response), resolve);
      } else {
        res.setHeader("Content-Type", "application/octet-stream");
        res.end(
          serializeMessage(
            response,
            remoteCallHandler.descriptor.response.messageType,
          ),
          resolve,
        );
      }
    });
  }

  private destringify(
    loggingPrefix: string,
    value: string,
    messageDescriptor: MessageDescriptor<any>,
    what: string,
  ): any {
    let ret: any;
    try {
      ret = destringifyMessage(value, messageDescriptor);
    } catch (e) {
      throw newBadRequestError(
        `Unable to destringify ${what}. Raw string: ${value}.`,
        e,
      );
    }
    if (!ret) {
      throw newBadRequestError(`${what} is empty.`);
    }
    return ret;
  }

  private deserialize(
    loggingPrefix: string,
    value: Uint8Array,
    messageDescriptor: MessageDescriptor<any>,
    what: string,
  ): any {
    let ret: any;
    try {
      ret = deserializeMessage(value, messageDescriptor);
    } catch (e) {
      throw newBadRequestError(
        `Unable to deserialize ${what}. Raw value as base64: ${Buffer.from(value).toString("base64")}.`,
        e,
      );
    }
    if (!ret) {
      throw newBadRequestError(`${what} is empty.`);
    }
    return ret;
  }

  private parse(
    loggingPrefix: string,
    value: string,
    messageDescriptor: MessageDescriptor<any>,
    what: string,
  ): any {
    let ret: any;
    try {
      ret = parseMessage(JSON.parse(value), messageDescriptor);
    } catch (e) {
      throw newBadRequestError(
        `Unable to parse ${what}. Raw value: ${value}.`,
        e,
      );
    }
    if (!ret) {
      throw newBadRequestError(`${what} is empty.`);
    }
    return ret;
  }
}
