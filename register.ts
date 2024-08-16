import express = require("express");
import { BaseRemoteCallHandler, ConsoleLogger, Logger } from "./base_handler";
import { CorsAllowedPreflightHandler } from "./cors_allowed_preflight_handler";
import { SessionExtractor } from "./session_signer";
import { HandlerInterface } from "@selfage/service_descriptor/handler_interface";

export class HandlerRegister {
  public static create(
    router: express.Router,
    logger: Logger = new ConsoleLogger(),
  ): HandlerRegister {
    return new HandlerRegister(
      router,
      BaseRemoteCallHandler.create(SessionExtractor.create(), logger),
    );
  }

  public constructor(
    private router: express.Router,
    private baseHandler: BaseRemoteCallHandler,
  ) {}

  public register(remoteCallHandler: HandlerInterface): this {
    this.router.post(remoteCallHandler.descriptor.path, (req, res) =>
      this.baseHandler.handle(remoteCallHandler, req, res),
    );
    return this;
  }

  public registerCorsAllowedPreflightHandler(): this {
    let handler = new CorsAllowedPreflightHandler();
    this.router.options("/*", (req, res) => handler.handle(res));
    return this;
  }
}
