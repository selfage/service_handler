import {
  AuthedServiceDescriptor,
  UnauthedServiceDescriptor,
  WithSession,
} from "@selfage/service_descriptor";
import { MessageDescriptor } from "@selfage/message/descriptor";

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
  sessionDescriptor: MessageDescriptor<Session>;
  serviceDescriptor: AuthedServiceDescriptor<
    ServiceRequest,
    ServiceResponse
  >;
  handle: (
    logContext: string,
    request: ServiceRequest,
    session: Session
  ) => Promise<ServiceResponse>;
}