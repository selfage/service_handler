import express = require("express");
import getStream = require("get-stream");
import http = require("http");
import { registerAuthed, registerUnauthed } from "./register";
import {
  AuthedServiceHandler,
  UnauthedServiceHandler,
} from "./service_handler";
import { SessionBuilder } from "./session_signer";
import {
  GET_COMMENTS,
  GET_COMMENTS_REQUEST,
  GetCommentsRequest,
  GetCommentsResponse,
} from "./test_data/get_comments";
import {
  GET_HISTORY,
  GET_HISTORY_REQUEST,
  GetHistoryRequest,
  GetHistoryResponse,
  MY_SESSION,
  MySession,
} from "./test_data/get_history";
import { eqMessage } from "@selfage/message/test_matcher";
import { assertThat, eq } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

let HOST_NAME = "localhost";
let PORT = 8000;

async function createServer(app: express.Express): Promise<http.Server> {
  let server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen({ host: HOST_NAME, port: PORT }, () => resolve());
  });
  return server;
}

async function closeServer(server: http.Server): Promise<void> {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
}

async function postToLocal(
  path: string,
  jsonString: string
): Promise<http.IncomingMessage> {
  let reqStream = http.request({
    hostname: HOST_NAME,
    port: PORT,
    path: path,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(jsonString),
    },
  });
  reqStream.write(jsonString);
  reqStream.end();
  return await new Promise<http.IncomingMessage>((resolve) => {
    reqStream.on("response", (resStream) => {
      resolve(resStream);
    });
  });
}

TEST_RUNNER.run({
  name: "RegisterTest",
  cases: [
    {
      name: "GetComments",
      execute: async () => {
        // Prepare
        let app = express();
        let server = await createServer(app);
        let request: GetCommentsRequest = { videoId: "hahaha" };
        let response: GetCommentsResponse = { texts: ["1", "2"] };

        class GetCommentsHandler
          implements
            UnauthedServiceHandler<GetCommentsRequest, GetCommentsResponse> {
          public serviceDescriptor = GET_COMMENTS;
          public async handle(
            logContext: string,
            actualRequest: GetCommentsRequest
          ): Promise<GetCommentsResponse> {
            assertThat(
              actualRequest,
              eqMessage(request, GET_COMMENTS_REQUEST),
              "GetCommentsRequest"
            );
            return Promise.resolve(response);
          }
        }

        // Execute
        registerUnauthed(app, new GetCommentsHandler());
        let resStream = await postToLocal(
          "/get_comments",
          JSON.stringify(request)
        );

        // Verify
        let res = await getStream(resStream);
        assertThat(res, eq(JSON.stringify(response)), "GetCommentsResponse");

        // Cleanup
        await closeServer(server);
      },
    },
    {
      name: "GetCommentsError",
      execute: async () => {
        // Prepare
        let app = express();
        let server = await createServer(app);
        let request: GetCommentsRequest = { videoId: "hahaha" };

        class GetCommentsHandler
          implements
            UnauthedServiceHandler<GetCommentsRequest, GetCommentsResponse> {
          public serviceDescriptor = GET_COMMENTS;
          public async handle(
            logContext: string,
            request: GetCommentsRequest
          ): Promise<GetCommentsResponse> {
            throw new Error("Something wrong");
          }
        }

        // Execute
        registerUnauthed(app, new GetCommentsHandler());
        let resStream = await postToLocal(
          "/get_comments",
          JSON.stringify(request)
        );

        // Verify
        assertThat(resStream.statusCode, eq(500), "error code");
        let res = await getStream(resStream);
        assertThat(res, eq("Internal Server Error"), "error body");

        // Cleanup
        await closeServer(server);
      },
    },
    {
      name: "GetHistory",
      execute: async () => {
        // Prepare
        let app = express();
        let server = await createServer(app);
        let sessionBuilder = SessionBuilder.create();
        let mySession: MySession = { sessionId: "id1" };
        let request: GetHistoryRequest = {
          signedSession: sessionBuilder.build(JSON.stringify(mySession)),
          page: 12,
        };
        let response: GetHistoryResponse = { videos: ["sss", "aaa"] };

        class GetHistoryHandler
          implements
            AuthedServiceHandler<
              GetHistoryRequest,
              GetHistoryResponse,
              MySession
            > {
          public sessionDescriptor = MY_SESSION;
          public serviceDescriptor = GET_HISTORY;
          public async handle(
            logContext: string,
            actualRequest: GetHistoryRequest,
            session: MySession
          ): Promise<GetHistoryResponse> {
            assertThat(session, eqMessage(mySession, MY_SESSION), "MySession");
            assertThat(
              actualRequest,
              eqMessage(request, GET_HISTORY_REQUEST),
              "GetHistoryRequest"
            );
            return Promise.resolve(response);
          }
        }

        // Execute
        registerAuthed(app, new GetHistoryHandler());
        let resStream = await postToLocal(
          "/get_history",
          JSON.stringify(request)
        );

        // Verify
        let res = await getStream(resStream);
        assertThat(res, eq(JSON.stringify(response)), "GetHistoryResponse");

        // Cleanup
        await closeServer(server);
      },
    },
    {
      name: "GetHistoryInvalidSession",
      execute: async () => {
        // Prepare
        let app = express();
        let server = await createServer(app);
        let request: GetHistoryRequest = {
          signedSession: "random stuff",
          page: 12,
        };

        class GetHistoryHandler
          implements
            AuthedServiceHandler<
              GetHistoryRequest,
              GetHistoryResponse,
              MySession
            > {
          public sessionDescriptor = MY_SESSION;
          public serviceDescriptor = GET_HISTORY;
          public async handle(
            logContext: string,
            request: GetHistoryRequest,
            session: MySession
          ): Promise<GetHistoryResponse> {
            throw new Error("Do not reach!");
          }
        }

        // Execute
        registerAuthed(app, new GetHistoryHandler());
        let resStream = await postToLocal(
          "/get_history",
          JSON.stringify(request)
        );

        // Verify
        assertThat(resStream.statusCode, eq(401), "error code");
        let res = await getStream(resStream);
        assertThat(res, eq(`Unauthorized`), "error body");

        // Cleanup
        await closeServer(server);
      },
    },
    {
      name: "GetHistoryError",
      execute: async () => {
        // Prepare
        let app = express();
        let server = await createServer(app);
        let sessionBuilder = SessionBuilder.create();
        let mySession: MySession = { sessionId: "id1" };
        let request: GetHistoryRequest = {
          signedSession: sessionBuilder.build(JSON.stringify(mySession)),
          page: 12,
        };

        class GetHistoryHandler
          implements
            AuthedServiceHandler<
              GetHistoryRequest,
              GetHistoryResponse,
              MySession
            > {
          public sessionDescriptor = MY_SESSION;
          public serviceDescriptor = GET_HISTORY;
          public async handle(
            logContext: string,
            request: GetHistoryRequest,
            session: MySession
          ): Promise<GetHistoryResponse> {
            throw new Error("Something wrong");
          }
        }

        // Execute
        registerAuthed(app, new GetHistoryHandler());
        let resStream = await postToLocal(
          "/get_history",
          JSON.stringify(request)
        );

        // Verify
        assertThat(resStream.statusCode, eq(500), "error code");
        let res = await getStream(resStream);
        assertThat(res, eq(`Internal Server Error`), "error body");

        // Cleanup
        await closeServer(server);
      },
    },
  ],
});
