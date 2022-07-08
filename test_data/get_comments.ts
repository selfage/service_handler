import { MessageDescriptor, PrimitiveType } from "@selfage/message/descriptor";
import { ServiceDescriptor, ServiceHandler } from "@selfage/service_descriptor";

export interface GetCommentsRequestBody {
  videoId?: string;
}

export let GET_COMMENTS_REQUEST_BODY: MessageDescriptor<GetCommentsRequestBody> =
  {
    name: "GetCommentsRequestBody",
    fields: [
      {
        name: "videoId",
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
      primitiveType: PrimitiveType.STRING,
      isArray: true,
    },
  ],
};

export let GET_COMMENTS: ServiceDescriptor = {
  name: "GetComments",
  path: "/GetComments",
  body: {
    messageType: GET_COMMENTS_REQUEST_BODY,
  },
  response: {
    messageType: GET_COMMENTS_RESPONSE,
  },
};

export interface GetCommentsHandlerRequest {
  requestId: string;
  body: GetCommentsRequestBody;
}

export abstract class GetCommentsHandlerInterface
  implements ServiceHandler<GetCommentsHandlerRequest, GetCommentsResponse>
{
  public descriptor = GET_COMMENTS;
  public abstract handle(
    args: GetCommentsHandlerRequest
  ): Promise<GetCommentsResponse>;
}
