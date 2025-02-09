import { ServiceDescriptor } from "@selfage/service_descriptor";
import { ClientType } from "@selfage/service_descriptor/client_type";

export let WEB_SERVICE: ServiceDescriptor = {
  name: "WebService",
  clientType: ClientType.WEB,
  port: 8080,
  protocol: "http://",
};
