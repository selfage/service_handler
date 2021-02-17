import express = require("express");
import {
  AuthedBaseServiceHandler,
  BaseServiceHandler,
  UnauthedBaseServiceHandler,
  handleBase,
} from "./base_handler";
import {
  AuthedServiceHandler,
  UnauthedServiceHandler,
} from "./service_handler";
import { SessionExtractor } from "./session_signer";
import { WithSession } from "@selfage/service_descriptor";

function registerBase(
  app: express.Express,
  serviceHandler: BaseServiceHandler
): void {
  app.post(serviceHandler.path, express.json(), (req, res) =>
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
