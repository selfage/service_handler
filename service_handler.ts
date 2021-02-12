import express = require("express");
import {
  AuthedBaseServiceHandler,
  BaseServiceHandler,
  UnauthedBaseServiceHandler,
  handleBase,
} from "./base_handler";
import { SessionExtractor } from "./session_signer";
import {
  AuthedServiceDescriptor,
  UnauthedServiceDescriptor,
  WithSession,
} from "@selfage/service_descriptor";

export interface UnauthedServiceHandler<ServiceRequest, ServiceResponse> {
  serviceDescriptor: UnauthedServiceDescriptor<ServiceRequest, ServiceResponse>;
  handle: (
    logContext: string,
    request: ServiceRequest
  ) => Promise<ServiceResponse>;
}

export interface AuthedServiceHandler<
  ServiceRequest extends WithSession,
  ServiceResponse,
  Session
> {
  serviceDescriptor: AuthedServiceDescriptor<
    ServiceRequest,
    ServiceResponse,
    Session
  >;
  handle: (
    logContext: string,
    request: ServiceRequest,
    session: Session
  ) => Promise<ServiceResponse>;
}

function registerBase(
  app: express.Express,
  serviceHandler: BaseServiceHandler
): void {
  app.post(serviceHandler.path, (req, res) =>
    handleBase(req, res, serviceHandler)
  );
}

export function registerUnauthed<ServiceRequest, ServiceResponse>(
  app: express.Express,
  unauthedServiceHandler: UnauthedServiceHandler<
    ServiceRequest,
    ServiceResponse
  >
): void {
  registerBase(app, new UnauthedBaseServiceHandler(unauthedServiceHandler));
}

export function registerAuthed<
  ServiceRequest extends WithSession,
  ServiceResponse,
  Session
>(
  app: express.Express,
  authedServiceHandler: AuthedServiceHandler<
    ServiceRequest,
    ServiceResponse,
    Session
  >
): void {
  registerBase(
    app,
    new AuthedBaseServiceHandler(
      authedServiceHandler,
      SessionExtractor.create()
    )
  );
}
