import express = require("express");
import fs = require("fs");
import getStream = require("get-stream");
import http = require("http");
import path = require("path");
import stream = require("stream");
import nodeFetch from "node-fetch";
import { HandlerRegister } from "./register";
import { SessionBuilder } from "./session_signer";
import { StreamMessageReader } from "./stream_message_reader";
import {
  GET_COMMENTS_REQUEST_BODY,
  GET_COMMENTS_RESPONSE,
  GetCommentsHandlerInterface,
  GetCommentsRequestBody,
  GetCommentsResponse,
} from "./test_data/get_comments";
import {
  GET_HISTORY_REQUEST_BODY,
  GET_HISTORY_RESPONSE,
  GetHistoryHandlerInterface,
  GetHistoryRequestBody,
  GetHistoryResponse,
} from "./test_data/get_history";
import {
  HEART_BEAT_REQUEST_METADATA,
  HEART_BEAT_RESPONSE,
  HEART_BEAT_STREAM_REQUEST_BODY,
  HeartBeatHandlerInterface,
  HeartBeatRequestMetadata,
  HeartBeatResponse,
  HeartBeatStreamRequestBody,
} from "./test_data/heart_beat";
import { MY_SESSION, MySession } from "./test_data/my_session";
import {
  UPLOAD_FILE_REQUEST_METADATA,
  UPLOAD_FILE_RESPONSE,
  UploadFileHandlerInterface,
  UploadFileRequestMetadata,
  UploadFileResponse,
} from "./test_data/upload_file";
import {
  destringifyMessage,
  stringifyMessage,
} from "@selfage/message/stringifier";
import { eqMessage } from "@selfage/message/test_matcher";
import { assertThat, eq, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER, TestCase } from "@selfage/test_runner";

let HOST_NAME = "localhost";
let PORT = 8000;
let ORIGIN = `http://${HOST_NAME}:${PORT}`;

async function createServer(): Promise<[http.Server, express.Express]> {
  let app = express();
  let server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen({ host: HOST_NAME, port: PORT }, () => resolve());
  });
  return [server, app];
}

async function closeServer(server?: http.Server): Promise<void> {
  if (server) {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
}

TEST_RUNNER.run({
  name: "BaseHandlerTest",
  cases: [
    new (class implements TestCase {
      public name = "GetComments";
      private server: http.Server;
      public async execute() {
        // Prepare
        let capturedBody: GetCommentsRequestBody;
        let getCommentHandler: GetCommentsHandlerInterface =
          new (class extends GetCommentsHandlerInterface {
            public async handle(
              requestId: string,
              body: GetCommentsRequestBody,
            ): Promise<GetCommentsResponse> {
              capturedBody = body;
              return { texts: ["aaaa", "bbb", "cc"] };
            }
          })();
        let app: express.Express;
        [this.server, app] = await createServer();

        // Execute
        HandlerRegister.create(app).register(getCommentHandler);
        let response = destringifyMessage(
          await (
            await nodeFetch(`${ORIGIN}/GetComments`, {
              method: "post",
              body: stringifyMessage(
                { videoId: "idx" },
                GET_COMMENTS_REQUEST_BODY,
              ),
              headers: { "Content-Type": "text/plain" },
            })
          ).text(),
          GET_COMMENTS_RESPONSE,
        );

        // Verify
        assertThat(
          capturedBody,
          eqMessage({ videoId: "idx" }, GET_COMMENTS_REQUEST_BODY),
          "request body",
        );
        assertThat(
          response,
          eqMessage({ texts: ["aaaa", "bbb", "cc"] }, GET_COMMENTS_RESPONSE),
          "response",
        );
      }
      public async tearDown() {
        await closeServer(this.server);
      }
    })(),
    new (class implements TestCase {
      public name = "GetCommentsNoRequestBody";
      private server: http.Server;
      public async execute() {
        // Prepare
        let getCommentHandler: GetCommentsHandlerInterface =
          new (class extends GetCommentsHandlerInterface {
            public async handle(
              requestId: string,
              body: GetCommentsRequestBody,
            ): Promise<GetCommentsResponse> {
              throw new Error("Should not be reachable.");
            }
          })();
        let app: express.Express;
        [this.server, app] = await createServer();

        // Execute
        HandlerRegister.create(app).register(getCommentHandler);
        let response = await nodeFetch(`${ORIGIN}/GetComments`, {
          method: "post",
          body: "",
          headers: { "Content-Type": "text/plain" },
        });

        // Verify
        assertThat(response.status, eq(400), "status code");
      }
      public async tearDown() {
        await closeServer(this.server);
      }
    })(),
    new (class implements TestCase {
      public name = "GetHistory";
      private server: http.Server;
      public async execute() {
        // Prepare
        let session: MySession;
        let capturedBody: GetHistoryRequestBody;
        let getHistoryHandler: GetHistoryHandlerInterface =
          new (class extends GetHistoryHandlerInterface {
            public async handle(
              requestId: string,
              body: GetHistoryRequestBody,
              auth: MySession,
            ): Promise<GetHistoryResponse> {
              session = auth;
              capturedBody = body;
              return { videos: ["id1", "id2", "id3"] };
            }
          })();
        let app: express.Express;
        [this.server, app] = await createServer();

        // Execute
        HandlerRegister.create(app).register(getHistoryHandler);
        let response = destringifyMessage(
          await (
            await nodeFetch(`${ORIGIN}/GetHistory`, {
              method: "post",
              body: stringifyMessage({ page: 10 }, GET_HISTORY_REQUEST_BODY),
              headers: {
                "Content-Type": "text/plain",
                u: SessionBuilder.create().build(
                  { sessionId: "ses1", userId: "u1" },
                  MY_SESSION,
                ),
              },
            })
          ).text(),
          GET_HISTORY_RESPONSE,
        );

        // Verify
        assertThat(
          session,
          eqMessage({ sessionId: "ses1", userId: "u1" }, MY_SESSION),
          "user session",
        );
        assertThat(
          capturedBody,
          eqMessage({ page: 10 }, GET_HISTORY_REQUEST_BODY),
          "request body",
        );
        assertThat(
          response,
          eqMessage({ videos: ["id1", "id2", "id3"] }, GET_HISTORY_RESPONSE),
          "response",
        );
      }
      public async tearDown() {
        await closeServer(this.server);
      }
    })(),
    new (class implements TestCase {
      public name = "GetHistoryNoSession";
      private server: http.Server;
      public async execute() {
        // Prepare
        let getHistoryHandler: GetHistoryHandlerInterface =
          new (class extends GetHistoryHandlerInterface {
            public async handle(
              requestId: string,
              body: GetHistoryRequestBody,
              auth: MySession,
            ): Promise<GetHistoryResponse> {
              throw new Error("Should not be reachable.");
            }
          })();
        let app: express.Express;
        [this.server, app] = await createServer();

        // Execute
        HandlerRegister.create(app).register(getHistoryHandler);
        let response = await nodeFetch(`${ORIGIN}/GetHistory`, {
          method: "post",
          body: stringifyMessage({ page: 10 }, GET_HISTORY_REQUEST_BODY),
          headers: { "Content-Type": "text/plain" },
        });

        // Verify
        assertThat(response.status, eq(401), "status code");
      }
      public async tearDown() {
        await closeServer(this.server);
      }
    })(),
    new (class implements TestCase {
      public name = "UploadFile";
      private server: http.Server;
      public async execute() {
        // Prepare
        let bodyAsString: string;
        let capturedMetadata: UploadFileRequestMetadata;
        let uploadFileHandler: UploadFileHandlerInterface =
          new (class extends UploadFileHandlerInterface {
            public async handle(
              requestId: string,
              body: stream.Readable,
              metadata: UploadFileRequestMetadata,
            ): Promise<UploadFileResponse> {
              capturedMetadata = metadata;
              bodyAsString = await getStream(body);
              return { byteSize: 121, success: true };
            }
          })();
        let app: express.Express;
        [this.server, app] = await createServer();

        let searchParam = new URLSearchParams();
        searchParam.set(
          "sd",
          stringifyMessage({ fileName: "file1" }, UPLOAD_FILE_REQUEST_METADATA),
        );

        // Execute
        HandlerRegister.create(app).register(uploadFileHandler);
        let response = destringifyMessage(
          await (
            await nodeFetch(`${ORIGIN}/UploadFile?${searchParam}`, {
              method: "post",
              body: fs.createReadStream(
                path.join(__dirname, "test_data", "text.txt"),
              ),
              headers: { "Content-Type": "application/octet-stream" },
            })
          ).text(),
          UPLOAD_FILE_RESPONSE,
        );

        // Verify
        assertThat(
          capturedMetadata,
          eqMessage({ fileName: "file1" }, UPLOAD_FILE_REQUEST_METADATA),
          "request metadata",
        );
        assertThat(bodyAsString, eq("some random bytes"), "request body");
        assertThat(
          response,
          eqMessage({ byteSize: 121, success: true }, UPLOAD_FILE_RESPONSE),
          "response",
        );
      }
      public async tearDown() {
        await closeServer(this.server);
      }
    })(),
    new (class implements TestCase {
      public name = "UploadFileNoRequestMetadata";
      private server: http.Server;
      public async execute() {
        // Prepare
        let uploadFileHandler: UploadFileHandlerInterface =
          new (class extends UploadFileHandlerInterface {
            public async handle(
              requestId: string,
              body: stream.Readable,
              metadata: UploadFileRequestMetadata,
            ): Promise<UploadFileResponse> {
              throw new Error("Should not be reachable.");
            }
          })();
        let app: express.Express;
        [this.server, app] = await createServer();

        // Execute
        HandlerRegister.create(app).register(uploadFileHandler);
        let response = await nodeFetch(`${ORIGIN}/UploadFile`, {
          method: "post",
          body: fs.createReadStream(
            path.join(__dirname, "test_data", "text.txt"),
          ),
          headers: { "Content-Type": "application/octet-stream" },
        });

        // Verify
        assertThat(response.status, eq(400), "status code");
      }
      public async tearDown() {
        await closeServer(this.server);
      }
    })(),
    new (class implements TestCase {
      public name = "HeartBeat";
      private server: http.Server;
      public async execute() {
        // Prepare
        let messageBodies = new Array<HeartBeatStreamRequestBody>();
        let heartBeatHandler: HeartBeatHandlerInterface =
          new (class extends HeartBeatHandlerInterface {
            public async handle(
              requestId: string,
              body: StreamMessageReader<HeartBeatStreamRequestBody>,
              metadata: HeartBeatRequestMetadata,
            ): Promise<HeartBeatResponse> {
              body.on("data", (messageBody) => messageBodies.push(messageBody));
              body.start();
              await new Promise<void>((resolve) => body.on("end", resolve));
              return {};
            }
          })();
        let app: express.Express;
        [this.server, app] = await createServer();

        let searchParam = new URLSearchParams();
        searchParam.set(
          "sd",
          stringifyMessage({ userId: "user1" }, HEART_BEAT_REQUEST_METADATA),
        );

        // Execute
        HandlerRegister.create(app).register(heartBeatHandler);
        let response = destringifyMessage(
          await (
            await nodeFetch(`${ORIGIN}/HeartBeat?${searchParam}`, {
              method: "post",
              body: fs.createReadStream(
                path.join(__dirname, "test_data", "heartbeat_stream_data.txt"),
              ),
              headers: { "Content-Type": "application/octet-stream" },
            })
          ).text(),
          HEART_BEAT_RESPONSE,
        );

        // Verify
        assertThat(
          messageBodies,
          isArray([
            eqMessage(
              {
                rnd: 1,
              },
              HEART_BEAT_STREAM_REQUEST_BODY,
            ),
            eqMessage(
              {
                rnd: 2,
              },
              HEART_BEAT_STREAM_REQUEST_BODY,
            ),
            eqMessage(
              {
                rnd: 3,
              },
              HEART_BEAT_STREAM_REQUEST_BODY,
            ),
          ]),
          "collected messages",
        );
        assertThat(response, eqMessage({}, HEART_BEAT_RESPONSE), "response");
      }
      public async tearDown() {
        await closeServer(this.server);
      }
    })(),
  ],
});
