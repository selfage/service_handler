# @selfage/service_handler

Implement a fully typed Express service without touching raw request parsing.

## Why @selfage/service_handler

`@selfage/service_handler` is the runtime companion to `@selfage/generator_cli`. The generator emits strongly typed TypeScript interfaces that describe your remote calls, and this package gives you the glue to implement and register them in production in two simple moves:

1. **Implement a strongly typed handler** – extend the generated base class and focus solely on business logic.
2. **Register handlers and start the service** – mount them on Express without writing any serialization or routing boilerplate.

The [`@selfage/generator_cli` README](https://www.npmjs.com/package/@selfage/generator_cli) shows how a single YAML definition yields service descriptors, handler interfaces, and message types. Once you have that output, this package handles everything else.

## Install

`npm install @selfage/service_handler`

## Step 1: Implement your handler with strong types

```ts
import {
  GetCommentsHandlerInterface,
  GetCommentsRequestBody,
  GetCommentsResponse,
} from "./generated/node_handlers";

class GetCommentsHandler extends GetCommentsHandlerInterface {
  public async handle(
    loggingPrefix: string,
    body: GetCommentsRequestBody,
  ): Promise<GetCommentsResponse> {
    return { texts: ["aaaa", "bbb", "cc"] };
  }
}
```

The generated interface enforces the request and response schema at compile time and at runtime. You never call `JSON.parse`, handle headers manually, or guess the shape of the payload—the `BaseRemoteCallHandler` inside this package deserializes it for you.

## Step 2: Register handlers and start your service

```ts
import express = require("express");
import http = require("http");
import { ServiceHandler } from "@selfage/service_handler";
import { NODE_SERVICE } from "./generated/node_service";

async function main() {
  const app = express();
  const httpServer = http.createServer();

  const service = ServiceHandler.create(httpServer, "*", app)
    .addCorsAllowedPreflightHandler()
    .addMetricsHandler()
    .addHealthCheckHandler()
    .addReadinessHandler()
    .addHandlerRegister(NODE_SERVICE)
    .add(new GetCommentsHandler());

  await service.start(8080);
}

main();
```

`ServiceHandler` wires the generated descriptors into Express, attaches CORS headers, collects metrics, and exposes health endpoints.

## What you get out of the box

- **Typed request handling** – JSON, streaming, metadata, and auth headers are all parsed and validated using the generated descriptors.
- **Production diagnostics** – Prometheus counters (`remote_calls_total`, `remote_calls_failure`) plus optional `/metricsz`, `/healthz`, and `/readiness` routes.
- **Express integration** – leverage familiar middleware while keeping your RPC layer type-safe.
- **Logging and error handling** – every request carries a unique log prefix and converts unexpected failures into structured HTTP responses.

You can browse `service_handler_test.ts` and the fixtures in `test_data/` for end-to-end scenarios covering uploads, JSON clients, and metadata-authenticated calls.
