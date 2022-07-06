import express = require("express");
import { BaseServiceHandler, ConsoleLogger, Logger } from "./base_handler";
import { CorsAllowedPreflightHandler } from "./cors_allowed_preflight_handler";
import { SessionExtractor } from "./session_signer";
import { ServiceHandler } from "@selfage/service_descriptor";

export class HandlerRegister {
  public constructor(
    private app: express.Express,
    private logger: Logger = new ConsoleLogger()
  ) {}

  public register<HandlerRequest, HandlerResponse>(
    serviceHandler: ServiceHandler<HandlerRequest, HandlerResponse>
  ): this {
    let handler = new BaseServiceHandler(
      serviceHandler,
      SessionExtractor.create(),
      this.logger
    );
    this.app.post(serviceHandler.descriptor.path, (req, res) => handler.handle(req, res));
    return this;
  }

  public registerCorsAllowedPrelightHandler(): this {
    let handler = new CorsAllowedPreflightHandler();
    this.app.options("/*", (req, res) => handler.handle(res));
    return this;
  }
}
