import { NODE_SERVICE } from "./services";
import { MessageDescriptor, PrimitiveType } from "@selfage/message/descriptor";
import { RemoteCallDescriptor } from "@selfage/service_descriptor";
import { RemoteCallHandlerInterface } from "@selfage/service_descriptor/remote_call_handler_interface";

export interface GetCommentsRequestBody {
  videoId?: string;
}

export let GET_COMMENTS_REQUEST_BODY: MessageDescriptor<GetCommentsRequestBody> =
  {
    name: "GetCommentsRequestBody",
    fields: [
      {
        name: "videoId",
        index: 1,
        primitiveType: PrimitiveType.STRING,
      },
    ],
  };

export interface GetCommentsResponse {
  texts?: Array<string>;
}

export let GET_COMMENTS_RESPONSE: MessageDescriptor<GetCommentsResponse> = {
  name: "GetCommentsResponse",
  fields: [
    {
      name: "texts",
      index: 2,
      primitiveType: PrimitiveType.STRING,
      isArray: true,
    },
  ],
};

export let GET_COMMENTS: RemoteCallDescriptor = {
  name: "GetComments",
  service: NODE_SERVICE,
  path: "/GetComments",
  body: {
    messageType: GET_COMMENTS_REQUEST_BODY,
  },
  response: {
    messageType: GET_COMMENTS_RESPONSE,
  },
};

export abstract class GetCommentsHandlerInterface
  implements RemoteCallHandlerInterface
{
  public descriptor = GET_COMMENTS;
  public abstract handle(
    loggingPrefix: string,
    body: GetCommentsRequestBody,
  ): Promise<GetCommentsResponse>;
}
