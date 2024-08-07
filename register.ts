import express = require("express");
import { BaseServiceHandler, ConsoleLogger, Logger } from "./base_handler";
import { CorsAllowedPreflightHandler } from "./cors_allowed_preflight_handler";
import { SessionExtractor } from "./session_signer";
import { ServiceHandlerInterface } from "@selfage/service_descriptor/service_handler_interface";

export class HandlerRegister {
  public constructor(
    private router: express.Router,
    private logger: Logger = new ConsoleLogger()
  ) {}

  public register(serviceHandler: ServiceHandlerInterface): this {
    let handler = new BaseServiceHandler(
      serviceHandler,
      SessionExtractor.create(),
      this.logger
    );
    this.router.post(serviceHandler.descriptor.path, (req, res) =>
      handler.handle(req, res)
    );
    return this;
  }

  public registerCorsAllowedPreflightHandler(): this {
    let handler = new CorsAllowedPreflightHandler();
    this.router.options("/*", (req, res) => handler.handle(res));
    return this;
  }
}
