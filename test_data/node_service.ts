import { HttpServiceDescriptor } from "@selfage/service_descriptor";
import { ClientType } from "@selfage/service_descriptor/client_type";

export let NODE_SERVICE: HttpServiceDescriptor = {
  name: "NodeService",
  clientType: ClientType.NODE,
  port: 8080,
  protocol: "http",
};
