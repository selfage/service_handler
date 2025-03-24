import express = require("express");
import http = require("http");
import https = require("https");
import promClient = require("prom-client");
import { BaseRemoteCallHandler } from "./base_remote_call_handler";
import { CorsAllowedPreflightHandler } from "./cors_allowed_preflight_handler";
import { ServiceDescriptor } from "@selfage/service_descriptor";
import { RemoteCallHandlerInterface } from "@selfage/service_descriptor/remote_call_handler_interface";

export class HandlerRegister {
  private router = express.Router();

  public constructor(
    app: express.Application,
    private baseHandler: BaseRemoteCallHandler,
    private serviceDescriptor: ServiceDescriptor,
  ) {
    app.use(this.serviceDescriptor.path, this.router);
  }

  public add(remoteCallHandler: RemoteCallHandlerInterface): this {
    if (remoteCallHandler.descriptor.service !== this.serviceDescriptor) {
      throw new Error(
        `The remote call handler ${remoteCallHandler.descriptor.name} is defined in service ${remoteCallHandler.descriptor.service.name} but being added to service ${this.serviceDescriptor.name}.`,
      );
    }
    this.router.post(remoteCallHandler.descriptor.path, (req, res) =>
      this.baseHandler.handle(remoteCallHandler, req, res),
    );
    return this;
  }
}

export class ServiceHandler {
  public static create(
    server: http.Server | https.Server,
    allowOrigin: string = "*",
  ): ServiceHandler {
    return new ServiceHandler(
      server,
      BaseRemoteCallHandler.create(allowOrigin),
      CorsAllowedPreflightHandler.create(allowOrigin),
    );
  }

  private app = express();

  public constructor(
    private server: http.Server | https.Server,
    private baseHandler: BaseRemoteCallHandler,
    private corsAllowedPreflightHandler: CorsAllowedPreflightHandler,
  ) {
    this.server.on("request", this.app);
  }

  public addCorsAllowedPreflightHandler(): this {
    this.app.options("/*", (req, res) =>
      this.corsAllowedPreflightHandler.handle(res),
    );
    return this;
  }

  public addMetricsHandler(): this {
    this.app.get("/metricsz", async (req, res) => {
      res.setHeader("Content-Type", "text/plain");
      res.end(await promClient.register.metrics());
    });
    return this;
  }

  public addHealthCheckHandler(): this {
    this.app.get("/healthz", (req, res) => {
      res.end("OK");
    });
    return this;
  }

  public addReadinessHandler(): this {
    this.app.get("/readiness", (req, res) => {
      res.end("OK");
    });
    return this;
  }

  public addHandlerRegister(
    serviceDescriptor: ServiceDescriptor,
  ): HandlerRegister {
    return new HandlerRegister(this.app, this.baseHandler, serviceDescriptor);
  }

  public async start(port: number): Promise<this> {
    await new Promise<void>((resolve) => {
      this.server.listen(port, () => resolve());
    });
    console.log(`Server is listening on port ${port}.`);
    return this;
  }

  public async stop(): Promise<void> {
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
    console.log(`Server has stopped.`);
    // Wait for the server to close all connections.
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
