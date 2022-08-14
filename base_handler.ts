import express = require("express");
import getStream = require("get-stream");
import { SessionExtractor } from "./session_signer";
import {
  newBadRequestError,
  newInternalServerErrorError,
} from "@selfage/http_error";
import { parseMessage } from "@selfage/message/parser";
import {
  PrimitveTypeForBody,
  ServiceHandler,
} from "@selfage/service_descriptor";

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

export class BaseServiceHandler<HandlerRequest, HandlerResponse> {
  public constructor(
    private serviceHandler: ServiceHandler<HandlerRequest, HandlerResponse>,
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
    this.logger.info(`Request ${requestId}: ${req.url}.`);

    try {
      let handlerRequest = await this.parseRequest(req, requestId);
      let handlerResponse = await this.serviceHandler.handle(handlerRequest);
      await this.sendResponse(res, handlerResponse);
    } catch (e) {
      if (e.stack) {
        this.logger.error(`Request ${requestId}: ${e.stack}`);
      } else {
        this.logger.error(`Request ${requestId}: ${e}`);
      }
      if (e.statusCode) {
        res.sendStatus(e.statusCode);
      } else {
        res.sendStatus(500);
      }
    }
  }

  private async parseRequest(
    req: express.Request,
    requestId: string
  ): Promise<any> {
    let handlerRequest: any = {
      requestId,
    };
    if (this.serviceHandler.descriptor.signedUserSession) {
      let sessionStr = this.sessionExtractor.extract(
        req.query[this.serviceHandler.descriptor.signedUserSession.key]
      );
      handlerRequest.userSession = parseMessage(
        this.parseJson(sessionStr, requestId, `user session`),
        this.serviceHandler.descriptor.signedUserSession.type
      );
    }
    if (this.serviceHandler.descriptor.side) {
      handlerRequest.side = parseMessage(
        this.parseJson(
          req.query[this.serviceHandler.descriptor.side.key],
          requestId,
          `side message`
        ),
        this.serviceHandler.descriptor.side.type
      );
    }

    if (this.serviceHandler.descriptor.body.messageType) {
      let bodyStr = (
        await getStream.buffer(req, {
          maxBuffer: 1 * 1024 * 1024,
        })
      ).toString("utf8");
      handlerRequest.body = parseMessage(
        this.parseJson(bodyStr, requestId, `body`),
        this.serviceHandler.descriptor.body.messageType
      );
    } else if (
      this.serviceHandler.descriptor.body.primitiveType ===
      PrimitveTypeForBody.BYTES
    ) {
      handlerRequest.body = req;
    } else {
      throw newInternalServerErrorError(`Unsupported server request body.`);
    }

    return handlerRequest;
  }

  private parseJson(value: any, requestId: string, what: string): any {
    try {
      return JSON.parse(value);
    } catch (e) {
      throw newBadRequestError(
        `Request ${requestId}: Unable to parse ${what}. Raw json string: ${value}.`
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
