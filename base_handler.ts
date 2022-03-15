import express = require("express");
import { Logger } from "./logger";
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
  handle: (
    req: express.Request,
    requestId: string,
    logger: Logger
  ) => Promise<any>;
}

export class UnauthedBaseServiceHandler<ServiceRequest, ServiceResponse>
  implements BaseServiceHandler
{
  public path = this.serviceHandler.serviceDescriptor.path;

  public constructor(
    private serviceHandler: UnauthedServiceHandler<
      ServiceRequest,
      ServiceResponse
    >
  ) {}

  public async handle(
    req: express.Request,
    requestId: string,
    logger: Logger
  ): Promise<any> {
    return this.serviceHandler.handle(
      parseMessage(
        req.body,
        this.serviceHandler.serviceDescriptor.requestDescriptor
      ),
      requestId,
      logger
    );
  }
}

export class AuthedBaseServiceHandler<
  ServiceRequest extends WithSession,
  ServiceResponse,
  Session
> implements BaseServiceHandler
{
  public path = this.serviceHandler.serviceDescriptor.path;

  public constructor(
    private serviceHandler: AuthedServiceHandler<
      ServiceRequest,
      ServiceResponse,
      Session
    >,
    private sessionExtractor: SessionExtractor
  ) {}

  public async handle(
    req: express.Request,
    requestId: string,
    logger: Logger
  ): Promise<any> {
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
    return this.serviceHandler.handle(
      serviceRequest,
      session,
      requestId,
      logger
    );
  }
}
