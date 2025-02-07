import fs = require("fs");
import getStream = require("get-stream");
import path = require("path");
import stream = require("stream");
import nodeFetch from "node-fetch";
import { ServiceHandler } from "./service_handler";
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
import { NODE_SERVICE } from "./test_data/node_service";
import {
  UPLOAD_FILE_REQUEST_METADATA,
  UPLOAD_FILE_RESPONSE,
  UploadFileHandlerInterface,
  UploadFileRequestMetadata,
  UploadFileResponse,
} from "./test_data/upload_file";
import { WEB_SERVICE } from "./test_data/web_service";
import {
  deserializeMessage,
  serializeMessage,
} from "@selfage/message/serializer";
import { stringifyMessage } from "@selfage/message/stringifier";
import { eqMessage } from "@selfage/message/test_matcher";
import {
  assertThat,
  assertThrow,
  eq,
  eqError,
  isArray,
} from "@selfage/test_matcher";
import { TEST_RUNNER, TestCase } from "@selfage/test_runner";

let ORIGIN = "http://localhost";

TEST_RUNNER.run({
  name: "BaseHandlerTest",
  cases: [
    new (class implements TestCase {
      public name = "GetComments";
      private service: ServiceHandler;
      public async execute() {
        // Prepare
        let capturedBody: GetCommentsRequestBody;
        let getCommentHandler: GetCommentsHandlerInterface =
          new (class extends GetCommentsHandlerInterface {
            public async handle(
              loggingPrefix: string,
              body: GetCommentsRequestBody,
            ): Promise<GetCommentsResponse> {
              capturedBody = body;
              return { texts: ["aaaa", "bbb", "cc"] };
            }
          })();

        // Execute
        this.service = await ServiceHandler.create(NODE_SERVICE)
          .createHttpServer()
          .add(getCommentHandler)
          .start();
        let response = deserializeMessage(
          await (
            await nodeFetch(`${ORIGIN}:${NODE_SERVICE.port}/GetComments`, {
              method: "post",
              body: serializeMessage(
                { videoId: "idx" },
                GET_COMMENTS_REQUEST_BODY,
              ),
              headers: { "Content-Type": "application/octet-stream" },
            })
          ).buffer(),
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
        await this.service.stop();
      }
    })(),
    new (class implements TestCase {
      public name = "GetCommentsNoRequestBody";
      private service: ServiceHandler;
      public async execute() {
        // Prepare
        let getCommentHandler: GetCommentsHandlerInterface =
          new (class extends GetCommentsHandlerInterface {
            public async handle(
              loggingPrefix: string,
              body: GetCommentsRequestBody,
            ): Promise<GetCommentsResponse> {
              throw new Error("Should not be reachable.");
            }
          })();

        // Execute
        this.service = await ServiceHandler.create(NODE_SERVICE)
          .createHttpServer()
          .add(getCommentHandler)
          .start();
        let response = await nodeFetch(
          `${ORIGIN}:${NODE_SERVICE.port}/GetComments`,
          {
            method: "post",
            body: "",
            headers: { "Content-Type": "text/plain" },
          },
        );

        // Verify
        assertThat(response.status, eq(400), "status code");
      }
      public async tearDown() {
        await this.service.stop();
      }
    })(),
    new (class implements TestCase {
      public name = "GetCommentsHandlerAddedToWrongService";
      public async execute() {
        // Prepare
        let getCommentHandler: GetCommentsHandlerInterface =
          new (class extends GetCommentsHandlerInterface {
            public async handle(
              loggingPrefix: string,
              body: GetCommentsRequestBody,
            ): Promise<GetCommentsResponse> {
              throw new Error("Should not be reachable.");
            }
          })();

        // Execute
        let error = assertThrow(() =>
          ServiceHandler.create(WEB_SERVICE)
            .createHttpServer()
            .add(getCommentHandler),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              "The remote call handler GetComments is defined in service NodeService but being added to service WebService.",
            ),
          ),
          "error",
        );
      }
    })(),
    new (class implements TestCase {
      public name = "GetHistory";
      private service: ServiceHandler;
      public async execute() {
        // Prepare
        let sessionStrCaptured: string;
        let bodyCaptured: GetHistoryRequestBody;
        let getHistoryHandler: GetHistoryHandlerInterface =
          new (class extends GetHistoryHandlerInterface {
            public async handle(
              loggingPrefix: string,
              body: GetHistoryRequestBody,
              sessionStr: string,
            ): Promise<GetHistoryResponse> {
              sessionStrCaptured = sessionStr;
              bodyCaptured = body;
              return { videos: ["id1", "id2", "id3"] };
            }
          })();

        // Execute
        this.service = await ServiceHandler.create(WEB_SERVICE)
          .createHttpServer()
          .add(getHistoryHandler)
          .start();
        let response = deserializeMessage(
          await (
            await nodeFetch(`${ORIGIN}:${WEB_SERVICE.port}/GetHistory`, {
              method: "post",
              body: serializeMessage({ page: 10 }, GET_HISTORY_REQUEST_BODY),
              headers: {
                "Content-Type": "application/octet-stream",
                u: "session 1",
              },
            })
          ).buffer(),
          GET_HISTORY_RESPONSE,
        );

        // Verify
        assertThat(sessionStrCaptured, eq("session 1"), "user session");
        assertThat(
          bodyCaptured,
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
        await this.service.stop();
      }
    })(),
    new (class implements TestCase {
      public name = "GetHistoryNoSession";
      private service: ServiceHandler;
      public async execute() {
        // Prepare
        let getHistoryHandler: GetHistoryHandlerInterface =
          new (class extends GetHistoryHandlerInterface {
            public async handle(
              loggingPrefix: string,
              body: GetHistoryRequestBody,
              sessionStr: string,
            ): Promise<GetHistoryResponse> {
              throw new Error("Should not be reachable.");
            }
          })();

        // Execute
        this.service = await ServiceHandler.create(WEB_SERVICE)
          .createHttpServer()
          .add(getHistoryHandler)
          .start();
        let response = await nodeFetch(
          `${ORIGIN}:${WEB_SERVICE.port}/GetHistory`,
          {
            method: "post",
            body: serializeMessage({ page: 10 }, GET_HISTORY_REQUEST_BODY),
            headers: { "Content-Type": "application/octet-stream" },
          },
        );

        // Verify
        assertThat(response.status, eq(401), "status code");
      }
      public async tearDown() {
        await this.service.stop();
      }
    })(),
    new (class implements TestCase {
      public name = "UploadFile";
      private service: ServiceHandler;
      public async execute() {
        // Prepare
        let bodyAsString: string;
        let capturedMetadata: UploadFileRequestMetadata;
        let uploadFileHandler: UploadFileHandlerInterface =
          new (class extends UploadFileHandlerInterface {
            public async handle(
              loggingPrefix: string,
              body: stream.Readable,
              metadata: UploadFileRequestMetadata,
            ): Promise<UploadFileResponse> {
              capturedMetadata = metadata;
              bodyAsString = await getStream(body);
              return { byteSize: 121, success: true };
            }
          })();

        let searchParam = new URLSearchParams();
        searchParam.set(
          "sd",
          stringifyMessage({ fileName: "file1" }, UPLOAD_FILE_REQUEST_METADATA),
        );

        // Execute
        this.service = await ServiceHandler.create(WEB_SERVICE)
          .createHttpServer()
          .add(uploadFileHandler)
          .start();
        let response = deserializeMessage(
          await (
            await nodeFetch(
              `${ORIGIN}:${WEB_SERVICE.port}/UploadFile?${searchParam}`,
              {
                method: "post",
                body: fs.createReadStream(
                  path.join(__dirname, "test_data", "text.txt"),
                ),
                headers: { "Content-Type": "application/octet-stream" },
              },
            )
          ).buffer(),
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
        await this.service.stop();
      }
    })(),
    new (class implements TestCase {
      public name = "UploadFileNoRequestMetadata";
      private service: ServiceHandler;
      public async execute() {
        // Prepare
        let uploadFileHandler: UploadFileHandlerInterface =
          new (class extends UploadFileHandlerInterface {
            public async handle(
              loggingPrefix: string,
              body: stream.Readable,
              metadata: UploadFileRequestMetadata,
            ): Promise<UploadFileResponse> {
              throw new Error("Should not be reachable.");
            }
          })();

        // Execute
        this.service = await ServiceHandler.create(WEB_SERVICE)
          .createHttpServer()
          .add(uploadFileHandler)
          .start();
        let response = await nodeFetch(
          `${ORIGIN}:${WEB_SERVICE.port}/UploadFile`,
          {
            method: "post",
            body: fs.createReadStream(
              path.join(__dirname, "test_data", "text.txt"),
            ),
            headers: { "Content-Type": "application/octet-stream" },
          },
        );

        // Verify
        assertThat(response.status, eq(400), "status code");
      }
      public async tearDown() {
        await this.service.stop();
      }
    })(),
    new (class implements TestCase {
      public name = "HeartBeat";
      private service: ServiceHandler;
      public async execute() {
        // Prepare
        let messageBodies = new Array<HeartBeatStreamRequestBody>();
        let heartBeatHandler: HeartBeatHandlerInterface =
          new (class extends HeartBeatHandlerInterface {
            public async handle(
              loggingPrefix: string,
              body: StreamMessageReader<HeartBeatStreamRequestBody>,
              metadata: HeartBeatRequestMetadata,
            ): Promise<HeartBeatResponse> {
              body.on("data", (messageBody) => messageBodies.push(messageBody));
              body.start();
              await new Promise<void>((resolve) => body.on("end", resolve));
              return {};
            }
          })();
        let searchParam = new URLSearchParams();
        searchParam.set(
          "sd",
          stringifyMessage({ userId: "user1" }, HEART_BEAT_REQUEST_METADATA),
        );

        // Execute
        this.service = await ServiceHandler.create(WEB_SERVICE)
          .createHttpServer()
          .add(heartBeatHandler)
          .start();
        let response = deserializeMessage(
          await (
            await nodeFetch(
              `${ORIGIN}:${WEB_SERVICE.port}/HeartBeat?${searchParam}`,
              {
                method: "post",
                body: fs.createReadStream(
                  path.join(
                    __dirname,
                    "test_data",
                    "heartbeat_stream_data.txt",
                  ),
                ),
                headers: { "Content-Type": "application/octet-stream" },
              },
            )
          ).buffer(),
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
        await this.service.stop();
      }
    })(),
  ],
});
