# @selfage/service_handler

## Install

`npm install @selfage/service_handler`

## Overview

Written in TypeScript and compiled to ES6. Provides type-safe service handler interfaces to be implemented and hooked onto `Express.js`. The service here only refers to one simple kind of client-server interaction: Sending a HTTP POST request in JSON as request body and receiving a response in JSON.

## UnauthedServiceHandler

`UnauthedServiceHandler` is an [interface](https://github.com/selfage/service_handler/blob/857e340c67aa21d259e7d56fb5875c1d07e6e396/service_handler.ts#L8) that can be implemented as the following example.

```TypeScript
import { UnauthedServiceHandler } from '@selfage/service_handler';
import { GetCommentsRequest, GetCommentsResponse, GET_COMMENTS } from './get_comments_service';

export class GetCommentsHandler implements UnauthedServiceHandler<GetCommentsRequest, GetCommentsResponse> {
  public serviceDescriptor = GET_COMMENTS;

  public async handle(logContext: string, request: GetCommentsRequest): Promise<GetCommentsResponse> {
    // await database operations.
    return {
      texts: ["comment1", "comment2"]
    };
  }
}
```

`logContext` contains a randomly generated request id, though not guaranteed to be universally unique, that can be prepended to any logging happened within the life of a request processing, making it easier to group logs associated with a certain request.

`get_comments_service.ts` is typically generated by `@selfage/cli` with an input file `get_comments_service.json` looks like the following, specifying the url endpoint/path as `/get_comments`.

```JSON
[{
  "message": {
    "name": "GetCommentsRequest",
    "fields": [{
      "name": "videoId",
      "type": "string"
    }]
  }
}, {
  "message": {
    "name": "GetCommentsResponse",
    "fields": [{
      "name": "texts",
      "type": "string",
      "isArray": true
    }]
  }
}, {
  "service": {
    "name": "GetComments",
    "path": "/get_comments",
    "request": "GetCommentsRequest",
    "response": "GetCommentsResponse"
  }
}]
```

The schema of the JSON file is an array of [definition](https://github.com/selfage/cli/blob/0f724015a4ea309d80ff231db555fe0383c91329/generate/definition.ts#L73). Typically this definition will also be shared with your client-side code.

It's not that important to know what's inside `get_comments_service.ts` except the exported interfaces and variables that are referenced above, but we still show it as the following for completeness.

```TypeScript
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
```

## Partial implementation of AuthedServiceHandler

Authentication/Authorization is done through validating a signed session string, passed from the request body, i.e., `signedSession` field from the request. See `@selfage/service_descriptor` for an example of generating an `AuthedServiceDescriptor`. Also read further below for how to obtain a signed session string and catch validation error.

`AuthedServiceHandler` is an [interface](https://github.com/selfage/service_handler/blob/857e340c67aa21d259e7d56fb5875c1d07e6e396/service_handler.ts#L16) requiring `sessionDescriptor` to help parse the validated session string into a structured data. See `@selfage/message` for how to generate a `MessageDescriptor`.

Typically for one project, the session strucutre is always the same. By partially implementing `AuthedServiceHandler`, i.e., by only providing `sessionDescriptor`, the rest of the project can extends it for consistent session parsing.

Suppose we have a session defined like the following in `my_session.json`.

```JSON
[{
  "message": {
    "name": "MySession",
    "fields": [{
      "name": "sessionId",
      "type": "string"
    }, {
      "name": "userId",
      "type": "string"
    }]
  }
}]
```

Then we can partially implement `AuthedServiceHandler` as an abstract class as the following in `authed_service_handler.ts`.

```TypeScript
import { AuthedServiceHandler } from '@selfage/service_handler';
import { AuthedServiceDescriptor } from '@selfage/service_descriptor';
import { MySession, MY_SESSION } from './my_session';

export abstract class AuthedServiceHandlerWithSession<ServiceRequest, ServiceResponse> implements AuthedServiceHandler<ServiceRequest, ServiceResponse, MySession> {
  public sessionDescriptor = MY_SESSION;
  abstract serviceDescriptor: AuthedServiceDescriptor<ServiceRequest, ServiceResponse>;
  abstract handle: handle: (logContext: string, request: ServiceRequest, session: MySession ) => Promise<ServiceResponse>;
}
```

## Full implementation of AuthedServiceHandler

An example that extends the partially implemented `AuthedServiceHandler` above looks like the following.

```TypeScript
import { AuthedServiceHandlerWithSession } from './authed_service_handler';
import { GetHistoryRequest, GetHistoryResponse, GET_HISTORY } from './get_history_service';
import { MySession } from './my_session';

export class GetHistoryHandler extends AuthedServiceHandlerWithSession<GetHistoryRequest, GetHistoryResponse> {
  public serviceDescriptor = GET_HISTORY;

  public async handle(logContext: string, request: GetHistoryRequest, session: MySession): Promise<GetHistoryResponse> {
    // await database operations.
    return {
      // ...
    };
  }
}
```

Except extending `AuthedServiceHandlerWithSession` and the additional `session` argument in method `handle()`, see [UnauthedServiceHandler](#UnauthedServiceHandler) for a full example.

## Register unauthed/authed handlers

The following is an exmaple to register the handlers above to `Express.js`. Under the hood, it takes `path` field in a service descriptor as the routing path in `Express.js`, allows CORS for all sites, catches error followed by responding with `statusCode` field of the error or 500 if not present, and uses `express.json()` middleware to read and parse JSON string followed by parsing JSON object into typed objects as well as validating and parsing `signedSession` field into a typed session object if it's an `AuthedServiceHandler`.

```TypeScript
import express = require('express');
import { registerUnauthed } from '@selfage/servie_handler/register';
import { GetCommentsHandler } from './get_comments_handler';
import { GetHistoryHandler } from './get_history_handler';

let app = express();
registerUnauthed(app, new GetCommentsHandler());
registerAuthed(app, new GetHistoryHandler());
```

## CORS & preflight handler

Allowing CORS for all domains is an opinionated decision that restricting CORS doesn't help account/data security at all, but might annoy future development. We should guarantee security by other approaches.

Before making any cross-site request, browsers might send a preflight request to ask for valid domain/site. We provide a simple preflight handler to allow all sites.

```TypeScript
import express = require('express');
import { registerUnauthed } from '@selfage/servie_handler/preflight_handler';

let app = express();
registerCorsAllowedPreflightHandler(app);
```

## Sign a session string

You have to configure your secret key for signing at the startup of your server, i.e., a secret key for sha256 algorithm. Please refer to other instructions on the best practice of generating a secret key and storing it.

```TypeScript
import { SessionSigner } from '@selfage/service_handler/session_signer';

SessionSigner.SECRET_KEY = 'Configure a secrect key';
// Configure routing and start server.
```

A typical example showing below is to return the signed session string when signing in, supposing `SignInResponse` containing a `signedSession` field.

```TypeScript
import { SessionBuilder } from '@selfage/service_handler/session_signer';
import { UnauthedServiceHandler } from '@selfage/service_handler';
import { SignInRequest, SignInResponse, SIGN_IN } from './sign_in_service';

export class GetCommentsHandler implements UnauthedServiceHandler<SignInRequest, SignInResponse> {
  public serviceDescriptor = SIGN_IN;
  private sessionBuilder = SessionBuilder.create();

  public async handle(logContext: string, request: SignInRequest): Promise<SignInResponse> {
    // await database operations.
    let signedSession = this.sessionBuilder.build(JSON.stringify({sessionId: '1234', userId: '5678'}));
    return {
      signedSession: signedSession
    };
  }
}
```

## Session expiration

Regardless of the data structure of your session, the signed session string always contains the timestamp when signing. By default, a session is expired 30 days after the signing timestamp. You have to re-sign a session the same way as a new session and return it to the client to refresh the timestamp.

You can configure the session longevity as the following, usually before starting your server.

```TypeScript
import { SessionExtractor } from '@selfage/service_handler/session_signer';

SessionExtractor.SESSION_LONGEVITY = 30 * 24 * 60 * 60 * 1000; // milliseconds
// Configure routing and start server.
```

## Session validation error

All `AuthedServiceHandler`s registered with `registerAuthed()` will validate incoming requests' `signedSession` field, and either catch validation errors or proceed to the implemented `AuthedServiceHandler`s. For any validatoin error caught, we will return the 401 error code to the client, regardless of missing session, invalid signature or expired timestamp.