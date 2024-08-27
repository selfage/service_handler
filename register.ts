import express = require("express");
import {
  BaseWebRemoteCallHandler,
  ConsoleLogger,
  Logger,
} from "./base_web_handler";
import { CorsAllowedPreflightHandler } from "./cors_allowed_preflight_handler";
import { SessionExtractor } from "./session_signer";
import { NodeHandlerInterface, WebHandlerInterface } from "@selfage/service_descriptor/handler_interface";

export class HandlerRegister {
  public static create(
    router: express.Router,
    logger: Logger = new ConsoleLogger(),
  ): HandlerRegister {
    return new HandlerRegister(
      router,
      BaseWebRemoteCallHandler.create(SessionExtractor.create(), logger),
    );
  }

  public constructor(
    private router: express.Router,
    private baseHandler: BaseWebRemoteCallHandler,
  ) {}

  public registerWeb(remoteCallHandler: WebHandlerInterface): this {
    this.router.post(remoteCallHandler.descriptor.path, (req, res) =>
      this.baseHandler.handleWeb(remoteCallHandler, req, res),
    );
    return this;
  }

  public registerNode(remoteCallHandler: NodeHandlerInterface): this {
    this.router.post(remoteCallHandler.descriptor.path, (req, res) =>
      this.baseHandler.handleNode(remoteCallHandler, req, res),
    );
    return this
  }

  public registerCorsAllowedPreflightHandler(): this {
    let handler = new CorsAllowedPreflightHandler();
    this.router.options("/*", (req, res) => handler.handle(res));
    return this;
  }
}
