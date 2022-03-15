import express = require("express");
import {
  AuthedBaseServiceHandler,
  BaseServiceHandler,
  UnauthedBaseServiceHandler,
} from "./base_handler";
import {
  AuthedServiceHandler,
  UnauthedServiceHandler,
} from "./service_handler";
import { SessionExtractor } from "./session_signer";
import { WithSession } from "@selfage/service_descriptor";

export interface Logger {
  info(str: string): void;
  error(str: string): void;
}

export class ConsoleLogger {
  public info(str: string): void {
    console.info(str);
  }
  public error(str: string): void {
    console.error(str);
  }
}

export class HandlerRegister {
  public constructor(
    private app: express.Express,
    private logger: Logger = new ConsoleLogger()
  ) {}

  public registerUnauthed<ServiceRequest, ServiceResponse>(
    unauthedServiceHandler: UnauthedServiceHandler<
      ServiceRequest,
      ServiceResponse
    >
  ): this {
    this.register(new UnauthedBaseServiceHandler(unauthedServiceHandler));
    return this;
  }

  public registerAuthed<
    ServiceRequest extends WithSession,
    ServiceResponse,
    Session
  >(
    authedServiceHandler: AuthedServiceHandler<
      ServiceRequest,
      ServiceResponse,
      Session
    >
  ): this {
    this.register(
      new AuthedBaseServiceHandler(
        authedServiceHandler,
        SessionExtractor.create()
      )
    );
    return this;
  }

  private register(serviceHandler: BaseServiceHandler): void {
    this.app.post(
      serviceHandler.path,
      express.json({ limit: 1024 * 1024 }),
      (req, res) => this.handle(req, res, serviceHandler)
    );
  }

  private async handle(
    req: express.Request,
    res: express.Response,
    serviceHandler: BaseServiceHandler
  ): Promise<void> {
    let requestId = `${Date.now() / 1000000}-${Math.floor(
      Math.random() * 10000
    )}`;
    this.logger.info(`Request ${requestId}: ${req.url}.`);

    // Always allow CORS.
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");

    let serviceResponse: any;
    try {
      serviceResponse = await serviceHandler.handle(req, requestId);
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
      return;
    }
    res.json(serviceResponse);
  }

  public registerCorsAllowedPreflightHandler(): this {
    this.app.options("/*", (req, res) => {
      // Allow all.
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "*");
      res.setHeader("Access-Control-Allow-Headers", "*");

      res.send("ok");
    });
    return this;
  }
}
