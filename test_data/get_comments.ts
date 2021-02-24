import { MessageDescriptor, PrimitiveType } from '@selfage/message/descriptor';
import { UnauthedServiceDescriptor } from '@selfage/service_descriptor';

export interface GetCommentsRequest {
  videoId?: string,
}

export let GET_COMMENTS_REQUEST: MessageDescriptor<GetCommentsRequest> = {
  name: 'GetCommentsRequest',
  factoryFn: () => {
    return new Object();
  },
  fields: [
    {
      name: 'videoId',
      primitiveType: PrimitiveType.STRING,
    },
  ]
};

export interface GetCommentsResponse {
  texts?: Array<string>,
}

export let GET_COMMENTS_RESPONSE: MessageDescriptor<GetCommentsResponse> = {
  name: 'GetCommentsResponse',
  factoryFn: () => {
    return new Object();
  },
  fields: [
    {
      name: 'texts',
      primitiveType: PrimitiveType.STRING,
      arrayFactoryFn: () => {
        return new Array<any>();
      },
    },
  ]
};

export let GET_COMMENTS: UnauthedServiceDescriptor<GetCommentsRequest, GetCommentsResponse> = {
  name: "GetComments",
  path: "/get_comments",
  requestDescriptor: GET_COMMENTS_REQUEST,
  responseDescriptor: GET_COMMENTS_RESPONSE,
};
