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
  destringifyMessage,
  stringifyMessage,
} from "@selfage/message/stringifier";
import { PrimitveTypeForBody } from "@selfage/service_descriptor";
import { HandlerInterface } from "@selfage/service_descriptor/handler_interface";

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

export class BaseRemoteCallHandler {
  public static create(
    sessionExtractor: SessionExtractor,
    logger: Logger,
  ): BaseRemoteCallHandler {
    return new BaseRemoteCallHandler(sessionExtractor, logger);
  }

  public constructor(
    private sessionExtractor: SessionExtractor,
    private logger: Logger,
  ) {}

  public async handle(
    remoteCallHandler: HandlerInterface,
    req: express.Request,
    res: express.Response,
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
    }
  }

  private async handleRequest(
    remoteCallHandler: HandlerInterface,
    req: express.Request,
    loggingPrefix: string,
  ): Promise<any> {
    let args: any[] = [loggingPrefix];
    if (remoteCallHandler.descriptor.body.messageType) {
      let bodyBuffer = await getStream.buffer(req, {
        maxBuffer: 1 * 1024 * 1024,
      });
      args.push(
        this.destringify(
          bodyBuffer.toString(),
          remoteCallHandler.descriptor.body.messageType,
          loggingPrefix,
          `body`,
        ),
      );
    } else if (remoteCallHandler.descriptor.body.streamMessageType) {
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

    if (remoteCallHandler.descriptor.auth) {
      let authStr = this.sessionExtractor.extract(
        req.header(remoteCallHandler.descriptor.auth.key),
      );
      args.push(
        this.destringify(
          authStr,
          remoteCallHandler.descriptor.auth.type,
          loggingPrefix,
          `auth`,
        ),
      );
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

  private async sendResponse(
    res: express.Response,
    handlerResponse: any,
    messageDescriptor: MessageDescriptor<any>,
  ): Promise<void> {
    res.end(stringifyMessage(handlerResponse, messageDescriptor));
  }
}
