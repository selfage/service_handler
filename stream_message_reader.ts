import events = require("events");
import { MessageDescriptor } from "@selfage/message/descriptor";
import { parseMessage } from "@selfage/message/parser";
import { STREAM_JSON_SEPARATOR } from "@selfage/service_descriptor/stream_seperator";
import { Readable } from "stream";

export interface StreamMessageReader<T> {
  on(event: "data", listener: (message: T) => void): this;
  on(event: "end", listener: () => void): this;
}

export class StreamMessageReader<T> extends events {
  private bufferedJsonStr = new Array<string>();

  public constructor(
    private source: Readable,
    private messageDescriptor: MessageDescriptor<T>,
  ) {
    super();
  }

  public start(): void {
    this.source.setEncoding("utf8");
    this.source.on("data", (chunk: string) => this.collectChunkAndParse(chunk));
    this.source.on("end", () => {
      this.flushMessage();
      this.emit("end");
    });
  }

  private collectChunkAndParse(chunk: string): void {
    let chunks = chunk.split(STREAM_JSON_SEPARATOR);
    for (let i = 0; i < chunks.length; i++) {
      this.bufferedJsonStr.push(chunks[i]);

      if (i + 1 < chunks.length) {
        this.flushMessage();
      }
    }
  }

  private flushMessage(): void {
    let jsonStr = this.bufferedJsonStr.join("");
    // It won't filter out strings with all white spaces.
    if (!jsonStr) {
      return;
    }

    this.emit(
      "data",
      parseMessage(JSON.parse(jsonStr), this.messageDescriptor),
    );
    this.bufferedJsonStr.length = 0;
  }
}
