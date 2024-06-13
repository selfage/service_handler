import { MessageDescriptor, PrimitiveType } from "@selfage/message/descriptor";
import { ServiceDescriptor } from "@selfage/service_descriptor";
import { ServiceHandlerInterface } from "@selfage/service_descriptor/service_handler_interface";

export interface MySession {
  sessionId?: string;
  userId?: string;
}

export let MY_SESSION: MessageDescriptor<MySession> = {
  name: "MySession",
  fields: [
    {
      name: "sessionId",
      primitiveType: PrimitiveType.STRING,
    },
    {
      name: "userId",
      primitiveType: PrimitiveType.STRING,
    },
  ],
};

export interface GetHistoryRequestBody {
  page?: number;
}

export let GET_HISTORY_REQUEST_BODY: MessageDescriptor<GetHistoryRequestBody> =
  {
    name: "GetHistoryRequestBody",
    fields: [
      {
        name: "page",
        primitiveType: PrimitiveType.NUMBER,
      },
    ],
  };

export interface GetHistoryResponse {
  videos?: Array<string>;
}

export let GET_HISTORY_RESPONSE: MessageDescriptor<GetHistoryResponse> = {
  name: "GetHistoryResponse",
  fields: [
    {
      name: "videos",
      primitiveType: PrimitiveType.STRING,
      isArray: true,
    },
  ],
};

export let GET_HISTORY: ServiceDescriptor = {
  name: "GetHistory",
  path: "/GetHistory",
  auth: {
    key: "u",
    type: MY_SESSION,
  },
  body: {
    messageType: GET_HISTORY_REQUEST_BODY,
  },
  response: {
    messageType: GET_HISTORY_RESPONSE,
  },
};

export abstract class GetHistoryHandlerInterface
  implements ServiceHandlerInterface
{
  public descriptor = GET_HISTORY;
  public abstract handle(
    requestId: string,
    body: GetHistoryRequestBody,
    auth: MySession,
  ): Promise<GetHistoryResponse>;
}
