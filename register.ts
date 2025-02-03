import express = require("express");
import { BaseHandler } from "./base_handler";
import { CorsAllowedPreflightHandler } from "./cors_allowed_preflight_handler";
import { HandlerInterface } from "@selfage/service_descriptor/handler_interface";

export class HandlerRegister {
  public static create(router: express.Router): HandlerRegister {
    return new HandlerRegister(router, BaseHandler.create());
  }

  public constructor(
    private router: express.Router,
    private baseHandler: BaseHandler,
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
