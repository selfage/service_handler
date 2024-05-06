import express = require("express");
import getStream = require("get-stream");
import { SessionExtractor } from "./session_signer";
import {
  newBadRequestError,
  newInternalServerErrorError,
} from "@selfage/http_error";
import { parseMessage } from "@selfage/message/parser";
import { PrimitveTypeForBody } from "@selfage/service_descriptor";
import { ServiceHandlerInterface } from "@selfage/service_descriptor/service_handler_interface";

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

export class BaseServiceHandler {
  public constructor(
    private serviceHandler: ServiceHandlerInterface,
    private sessionExtractor: SessionExtractor,
    private logger: Logger
  ) {}

  public async handle(
    req: express.Request,
    res: express.Response
  ): Promise<void> {
    // Always allow CORS.
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");

    let requestId = `${Math.floor(Date.now() / 1000)}-${Math.floor(
      Math.random() * 10000
    )}`;
    let loggingPrefix = `Request ${requestId}:`;
    this.logger.info(`${loggingPrefix} ${req.url}.`);

    try {
      let response = await this.handleRequest(req, loggingPrefix);
      await this.sendResponse(res, response);
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
    req: express.Request,
    loggingPrefix: string
  ): Promise<any> {
    let args: any[] = [loggingPrefix];
    if (this.serviceHandler.descriptor.body.messageType) {
      let bodyStr = (
        await getStream.buffer(req, {
          maxBuffer: 1 * 1024 * 1024,
        })
      ).toString("utf8");
      args.push(
        parseMessage(
          this.parseJson(bodyStr, loggingPrefix, `body`),
          this.serviceHandler.descriptor.body.messageType
        )
      );
    } else if (
      this.serviceHandler.descriptor.body.primitiveType ===
      PrimitveTypeForBody.BYTES
    ) {
      args.push(req);
    } else {
      throw newInternalServerErrorError(`Unsupported server request body.`);
    }

    if (this.serviceHandler.descriptor.metadata) {
      args.push(
        parseMessage(
          this.parseJson(
            req.query[this.serviceHandler.descriptor.metadata.key],
            loggingPrefix,
            `metadata`
          ),
          this.serviceHandler.descriptor.metadata.type
        )
      );
    }

    if (this.serviceHandler.descriptor.auth) {
      let authStr = this.sessionExtractor.extract(
        req.header(this.serviceHandler.descriptor.auth.key)
      );
      args.push(
        parseMessage(
          this.parseJson(authStr, loggingPrefix, `auth`),
          this.serviceHandler.descriptor.auth.type
        )
      );
    }
    return this.serviceHandler.handle(...args);
  }

  private parseJson(value: any, loggingPrefix: string, what: string): any {
    try {
      return JSON.parse(value);
    } catch (e) {
      throw newBadRequestError(
        `${loggingPrefix} Unable to parse ${what}. Raw json string: ${value}.`
      );
    }
  }

  private async sendResponse(
    res: express.Response,
    handlerResponse: any
  ): Promise<void> {
    res.json(handlerResponse);
  }
}
