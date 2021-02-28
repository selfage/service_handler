import express = require("express");
import {
  AuthedServiceHandler,
  UnauthedServiceHandler,
} from "./service_handler";
import { SessionExtractor } from "./session_signer";
import { newUnauthorizedError } from "@selfage/http_error";
import { parseMessage } from "@selfage/message/parser";
import { WithSession } from "@selfage/service_descriptor";

export interface BaseServiceHandler {
  path: string;
  handle: (logContext: string, req: express.Request) => Promise<any>;
}

export class UnauthedBaseServiceHandler<ServiceRequest, ServiceResponse>
  implements BaseServiceHandler {
  public path = this.serviceHandler.serviceDescriptor.path;

  public constructor(
    private serviceHandler: UnauthedServiceHandler<
      ServiceRequest,
      ServiceResponse
    >
  ) {}

  public async handle(logContext: string, req: express.Request): Promise<any> {
    return this.serviceHandler.handle(
      logContext,
      parseMessage(
        req.body,
        this.serviceHandler.serviceDescriptor.requestDescriptor
      )
    );
  }
}

export class AuthedBaseServiceHandler<
  ServiceRequest extends WithSession,
  ServiceResponse,
  Session
> implements BaseServiceHandler {
  public path = this.serviceHandler.serviceDescriptor.path;

  public constructor(
    private serviceHandler: AuthedServiceHandler<
      ServiceRequest,
      ServiceResponse,
      Session
    >,
    private sessionExtractor: SessionExtractor
  ) {}

  public async handle(logContext: string, req: express.Request): Promise<any> {
    let serviceRequest = parseMessage(
      req.body,
      this.serviceHandler.serviceDescriptor.requestDescriptor
    );
    let rawSessionStr: string;
    try {
      rawSessionStr = this.sessionExtractor.extract(
        serviceRequest.signedSession
      );
    } catch (e) {
      throw newUnauthorizedError(
        `Failed to validate session string "${serviceRequest.signedSession}".`,
        e
      );
    }
    let session = parseMessage(
      JSON.parse(rawSessionStr),
      this.serviceHandler.sessionDescriptor
    );
    return this.serviceHandler.handle(logContext, serviceRequest, session);
  }
}

export async function handleBase(
  req: express.Request,
  res: express.Response,
  serviceHandler: BaseServiceHandler
): Promise<void> {
  let randomId = Math.floor(Math.random() * 10000);
  let logContext = `Request ${Date.now()}-${randomId}: `;
  console.log(logContext + `Path: ${req.url}.`);

  // Always allow CORS.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");

  let serviceResponse: any;
  try {
    serviceResponse = await serviceHandler.handle(logContext, req);
  } catch (e) {
    if (e.stack) {
      console.error(logContext + e.stack);
    } else {
      console.error(logContext + e);
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
