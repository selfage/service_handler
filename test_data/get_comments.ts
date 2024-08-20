import { MessageDescriptor, PrimitiveType } from "@selfage/message/descriptor";
import { NodeRemoteCallDescriptor } from "@selfage/service_descriptor";
import { NodeHandlerInterface } from "@selfage/service_descriptor/handler_interface";

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

export let GET_COMMENTS: NodeRemoteCallDescriptor = {
  name: "GetComments",
  path: "/GetComments",
  body: {
    messageType: GET_COMMENTS_REQUEST_BODY,
  },
  response: {
    messageType: GET_COMMENTS_RESPONSE,
  },
};

export abstract class GetCommentsHandlerInterface
  implements NodeHandlerInterface
{
  public descriptor = GET_COMMENTS;
  public abstract handle(
    requestId: string,
    body: GetCommentsRequestBody,
  ): Promise<GetCommentsResponse>;
}
