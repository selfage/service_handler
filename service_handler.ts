import express = require("express");
import http = require("http");
import https = require("https");
import { BaseRemoteCallHandler } from "./base_remote_call_handler";
import { CorsAllowedPreflightHandler } from "./cors_allowed_preflight_handler";
import {
  HttpServiceDescriptor,
  HttpsServiceDescriptor,
  ServiceDescriptor,
} from "@selfage/service_descriptor";
import { RemoteCallHandlerInterface } from "@selfage/service_descriptor/remote_call_handler_interface";

export class ServiceHandler {
  public static createHttpServer(
    serviceDescriptor: HttpServiceDescriptor,
  ): ServiceHandler {
    return new ServiceHandler(
      http.createServer(),
      serviceDescriptor,
      BaseRemoteCallHandler.create(),
    );
  }

  public static createHttpsServer(
    serviceDescriptor: HttpsServiceDescriptor,
    options: https.ServerOptions,
  ): ServiceHandler {
    return new ServiceHandler(
      https.createServer(options),
      serviceDescriptor,
      BaseRemoteCallHandler.create(),
    );
  }

  private app = express();

  public constructor(
    private server: http.Server | https.Server,
    private serviceDescriptor: ServiceDescriptor,
    private baseHandler: BaseRemoteCallHandler,
  ) {
    this.server.on("request", this.app);
    this.addCorsAllowedPreflightHandler();
  }

  private addCorsAllowedPreflightHandler(): void {
    let handler = new CorsAllowedPreflightHandler();
    this.app.options("/*", (req, res) => handler.handle(res));
  }

  public add(remoteCallHandler: RemoteCallHandlerInterface): this {
    if (remoteCallHandler.descriptor.service !== this.serviceDescriptor) {
      throw new Error(
        `The remote call handler ${remoteCallHandler.descriptor.name} is defined in service ${remoteCallHandler.descriptor.service.name} but being added to service ${this.serviceDescriptor.name}.`,
      );
    }
    this.app.post(remoteCallHandler.descriptor.path, (req, res) =>
      this.baseHandler.handle(remoteCallHandler, req, res),
    );
    return this;
  }

  public async start(): Promise<this> {
    await new Promise<void>((resolve) => {
      this.server.listen(this.serviceDescriptor.port, () => resolve());
    });
    console.log(
      `Service ${this.serviceDescriptor.name} is listening on port ${this.serviceDescriptor.port}.`,
    );
    return this;
  }

  public async stop(): Promise<void> {
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
    console.log(`Service ${this.serviceDescriptor.name} has stopped.`);
    // Wait for the server to close all connections.
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
