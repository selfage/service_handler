import { MessageDescriptor, PrimitiveType } from '@selfage/message/descriptor';
import { AuthedServiceDescriptor } from '@selfage/service_descriptor';

export interface MySession {
  sessionId?: string,
  userId?: string,
}

export let MY_SESSION: MessageDescriptor<MySession> = {
  name: 'MySession',
  factoryFn: () => {
    return new Object();
  },
  fields: [
    {
      name: 'sessionId',
      primitiveType: PrimitiveType.STRING,
    },
    {
      name: 'userId',
      primitiveType: PrimitiveType.STRING,
    },
  ]
};

export interface GetHistoryRequest {
  signedSession?: string,
  page?: number,
}

export let GET_HISTORY_REQUEST: MessageDescriptor<GetHistoryRequest> = {
  name: 'GetHistoryRequest',
  factoryFn: () => {
    return new Object();
  },
  fields: [
    {
      name: 'signedSession',
      primitiveType: PrimitiveType.STRING,
    },
    {
      name: 'page',
      primitiveType: PrimitiveType.NUMBER,
    },
  ]
};

export interface GetHistoryResponse {
  videos?: Array<string>,
}

export let GET_HISTORY_RESPONSE: MessageDescriptor<GetHistoryResponse> = {
  name: 'GetHistoryResponse',
  factoryFn: () => {
    return new Object();
  },
  fields: [
    {
      name: 'videos',
      primitiveType: PrimitiveType.STRING,
      arrayFactoryFn: () => {
        return new Array<any>();
      },
    },
  ]
};

export let GET_HISTORY: AuthedServiceDescriptor<GetHistoryRequest, GetHistoryResponse> = {
  name: "GetHistory",
  path: "/get_history",
  requestDescriptor: GET_HISTORY_REQUEST,
  responseDescriptor: GET_HISTORY_RESPONSE,
};
