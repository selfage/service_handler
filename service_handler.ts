import { MessageDescriptor } from "@selfage/message/descriptor";
import {
  AuthedServiceDescriptor,
  UnauthedServiceDescriptor,
  WithSession,
} from "@selfage/service_descriptor";

export interface UnauthedServiceHandler<ServiceRequest, ServiceResponse> {
  serviceDescriptor: UnauthedServiceDescriptor<ServiceRequest, ServiceResponse>;
  handle: (
    request: ServiceRequest,
    requestId: string
  ) => Promise<ServiceResponse>;
}

export interface AuthedServiceHandler<
  ServiceRequest extends WithSession,
  ServiceResponse,
  Session
> {
  sessionDescriptor: MessageDescriptor<Session>;
  serviceDescriptor: AuthedServiceDescriptor<ServiceRequest, ServiceResponse>;
  handle: (
    request: ServiceRequest,
    session: Session,
    requestId: string
  ) => Promise<ServiceResponse>;
}
