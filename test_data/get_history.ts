import { MessageDescriptor, PrimitiveType } from "@selfage/message/descriptor";
import { RemoteCallDescriptor } from "@selfage/service_descriptor";
import { HandlerInterface } from "@selfage/service_descriptor/handler_interface";

export interface MySession {
  sessionId?: string;
  userId?: string;
}

export let MY_SESSION: MessageDescriptor<MySession> = {
  name: "MySession",
  fields: [
    {
      name: "sessionId",
      index: 1,
      primitiveType: PrimitiveType.STRING,
    },
    {
      name: "userId",
      index: 2,
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
        index: 1,
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
      index: 1,
      primitiveType: PrimitiveType.STRING,
      isArray: true,
    },
  ],
};

export let GET_HISTORY: RemoteCallDescriptor = {
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
  implements HandlerInterface
{
  public descriptor = GET_HISTORY;
  public abstract handle(
    requestId: string,
    body: GetHistoryRequestBody,
    auth: MySession,
  ): Promise<GetHistoryResponse>;
}
