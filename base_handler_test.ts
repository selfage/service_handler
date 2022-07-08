import express = require("express");
import fs = require("fs");
import getStream = require("get-stream");
import http = require("http");
import path = require("path");
import stream = require("stream");
import nodeFetch from "node-fetch";
import { HandlerRegister } from "./register";
import { SessionBuilder } from "./session_signer";
import {
  DOWNLOAD_FILE_REQUEST_BODY,
  DownloadFileHandlerInterface,
  DownloadFileHandlerRequest,
  DownloadFileRequestBody,
} from "./test_data/download_file";
import {
  GET_COMMENTS_REQUEST_BODY,
  GET_COMMENTS_RESPONSE,
  GetCommentsHandlerInterface,
  GetCommentsHandlerRequest,
  GetCommentsRequestBody,
  GetCommentsResponse,
} from "./test_data/get_comments";
import {
  GET_HISTORY_REQUEST_BODY,
  GET_HISTORY_RESPONSE,
  GetHistoryHandlerInterface,
  GetHistoryHandlerRequest,
  GetHistoryRequestBody,
  GetHistoryResponse,
  MY_SESSION,
  MySession,
} from "./test_data/get_history";
import {
  UPLOAD_FILE_REQUEST_SIDE,
  UPLOAD_FILE_RESPONSE,
  UploadFileHandlerInterface,
  UploadFileHandlerRequest,
  UploadFileRequestSide,
  UploadFileResponse,
} from "./test_data/upload_file";
import { eqMessage } from "@selfage/message/test_matcher";
import { assertThat, eq } from "@selfage/test_matcher";
import { NODE_TEST_RUNNER, TestCase } from "@selfage/test_runner";

let HOST_NAME = "localhost";
let PORT = 8000;
let ORIGIN = `http://${HOST_NAME}:${PORT}`;

async function createServer(): Promise<[http.Server, HandlerRegister]> {
  let app = express();
  let register = new HandlerRegister(app);
  let server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen({ host: HOST_NAME, port: PORT }, () => resolve());
  });
  return [server, register];
}

async function closeServer(server?: http.Server): Promise<void> {
  if (server) {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
}

NODE_TEST_RUNNER.run({
  name: "BaseHandlerTest",
  cases: [
    new (class implements TestCase {
      public name = "GetComments";
      private server: http.Server;
      public async execute() {
        // Prepare
        let body: GetCommentsRequestBody;
        let getCommentHandler: GetCommentsHandlerInterface =
          new (class extends GetCommentsHandlerInterface {
            public async handle(
              args: GetCommentsHandlerRequest
            ): Promise<GetCommentsResponse> {
              body = args.body;
              return { texts: ["aaaa", "bbb", "cc"] };
            }
          })();
        let register: HandlerRegister;
        [this.server, register] = await createServer();

        // Execute
        register.register(getCommentHandler);
        let response = await (
          await nodeFetch(`${ORIGIN}/GetComments`, {
            method: "post",
            body: JSON.stringify({ videoId: "idx" }),
            headers: { "Content-Type": "application/json" },
          })
        ).json();

        // Verify
        assertThat(
          body,
          eqMessage({ videoId: "idx" }, GET_COMMENTS_REQUEST_BODY),
          "request body"
        );
        assertThat(
          response,
          eqMessage({ texts: ["aaaa", "bbb", "cc"] }, GET_COMMENTS_RESPONSE),
          "response"
        );
      }
      public async tearDown() {
        closeServer(this.server);
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
              args: GetCommentsHandlerRequest
            ): Promise<GetCommentsResponse> {
              throw new Error("Should not be reachable.");
            }
          })();
        let register: HandlerRegister;
        [this.server, register] = await createServer();

        // Execute
        register.register(getCommentHandler);
        let response = await nodeFetch(`${ORIGIN}/GetComments`, {
          method: "post",
          body: "",
          headers: { "Content-Type": "application/json" },
        });
        // Verify
        assertThat(response.status, eq(400), "status code");
      }
      public async tearDown() {
        closeServer(this.server);
      }
    })(),
    new (class implements TestCase {
      public name = "GetHistory";
      private server: http.Server;
      public async execute() {
        // Prepare
        let session: MySession;
        let body: GetHistoryRequestBody;
        let getHistoryHandler: GetHistoryHandlerInterface =
          new (class extends GetHistoryHandlerInterface {
            public async handle(
              args: GetHistoryHandlerRequest
            ): Promise<GetHistoryResponse> {
              session = args.userSession;
              body = args.body;
              return { videos: ["id1", "id2", "id3"] };
            }
          })();
        let register: HandlerRegister;
        [this.server, register] = await createServer();

        let searchParam = new URLSearchParams();
        searchParam.set(
          "u",
          SessionBuilder.create().build(
            JSON.stringify({ sessionId: "ses1", userId: "u1" })
          )
        );

        // Execute
        register.register(getHistoryHandler);
        let response = await (
          await nodeFetch(`${ORIGIN}/GetHistory?${searchParam}`, {
            method: "post",
            body: JSON.stringify({ page: 10 }),
            headers: { "Content-Type": "application/json" },
          })
        ).json();

        // Verify
        assertThat(
          session,
          eqMessage({ sessionId: "ses1", userId: "u1" }, MY_SESSION),
          "user session"
        );
        assertThat(
          body,
          eqMessage({ page: 10 }, GET_HISTORY_REQUEST_BODY),
          "request body"
        );
        assertThat(
          response,
          eqMessage({ videos: ["id1", "id2", "id3"] }, GET_HISTORY_RESPONSE),
          "response"
        );
      }
      public async tearDown() {
        closeServer(this.server);
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
              args: GetHistoryHandlerRequest
            ): Promise<GetHistoryResponse> {
              throw new Error("Should not be reachable.");
            }
          })();
        let register: HandlerRegister;
        [this.server, register] = await createServer();

        // Execute
        register.register(getHistoryHandler);
        let response = await nodeFetch(`${ORIGIN}/GetHistory`, {
          method: "post",
          body: JSON.stringify({ page: 10 }),
          headers: { "Content-Type": "application/json" },
        });

        // Verify
        assertThat(response.status, eq(401), "status code");
      }
      public async tearDown() {
        closeServer(this.server);
      }
    })(),
    new (class implements TestCase {
      public name = "UploadFile";
      private server: http.Server;
      public async execute() {
        // Prepare
        let bodyAsString: string;
        let side: UploadFileRequestSide;
        let uploadFileHandler: UploadFileHandlerInterface =
          new (class extends UploadFileHandlerInterface {
            public async handle(
              args: UploadFileHandlerRequest
            ): Promise<UploadFileResponse> {
              side = args.side;
              bodyAsString = await getStream(args.body);
              return { byteSize: 121, success: true };
            }
          })();
        let register: HandlerRegister;
        [this.server, register] = await createServer();

        let searchParam = new URLSearchParams();
        searchParam.set("sd", JSON.stringify({ fileName: "file1" }));

        // Execute
        register.register(uploadFileHandler);
        let response = await (
          await nodeFetch(`${ORIGIN}/UploadFile?${searchParam}`, {
            method: "post",
            body: fs.createReadStream(
              path.join(__dirname, "test_data", "text.txt")
            ),
            headers: { "Content-Type": "application/octet-stream" },
          })
        ).json();

        // Verify
        assertThat(
          side,
          eqMessage({ fileName: "file1" }, UPLOAD_FILE_REQUEST_SIDE),
          "request side"
        );
        assertThat(bodyAsString, eq("some random bytes"), "request body");
        assertThat(
          response,
          eqMessage({ byteSize: 121, success: true }, UPLOAD_FILE_RESPONSE),
          "response"
        );
      }
      public async tearDown() {
        closeServer(this.server);
      }
    })(),
    new (class implements TestCase {
      public name = "UploadFileNoRequestSide";
      private server: http.Server;
      public async execute() {
        // Prepare
        let uploadFileHandler: UploadFileHandlerInterface =
          new (class extends UploadFileHandlerInterface {
            public async handle(
              args: UploadFileHandlerRequest
            ): Promise<UploadFileResponse> {
              throw new Error("Should not be reachable.");
            }
          })();
        let register: HandlerRegister;
        [this.server, register] = await createServer();

        // Execute
        register.register(uploadFileHandler);
        let response = await nodeFetch(`${ORIGIN}/UploadFile`, {
          method: "post",
          body: fs.createReadStream(
            path.join(__dirname, "test_data", "text.txt")
          ),
          headers: { "Content-Type": "application/octet-stream" },
        });

        // Verify
        assertThat(response.status, eq(400), "status code");
      }
      public async tearDown() {
        closeServer(this.server);
      }
    })(),
    new (class implements TestCase {
      public name = "DownloadFile";
      private server: http.Server;
      public async execute() {
        // Prepare
        let body: DownloadFileRequestBody;
        let downloadFileHandler: DownloadFileHandlerInterface =
          new (class extends DownloadFileHandlerInterface {
            public async handle(
              args: DownloadFileHandlerRequest
            ): Promise<stream.Readable> {
              body = args.body;
              return fs.createReadStream(
                path.join(__dirname, "test_data", "text.txt")
              );
            }
          })();
        let register: HandlerRegister;
        [this.server, register] = await createServer();

        // Execute
        register.register(downloadFileHandler);
        let response = await (
          await nodeFetch(`${ORIGIN}/DownloadFile`, {
            method: "post",
            body: JSON.stringify({ fileName: "file2" }),
            headers: { "Content-Type": "application/json" },
          })
        ).text();

        // Verify
        assertThat(
          body,
          eqMessage({ fileName: "file2" }, DOWNLOAD_FILE_REQUEST_BODY),
          "request body"
        );
        assertThat(response, eq("some random bytes"), "response");
      }
      public async tearDown() {
        closeServer(this.server);
      }
    })(),
  ],
});
