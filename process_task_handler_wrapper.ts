import promClient = require("prom-client");
import EventEmitter from "events";
import { StatusCode } from "@selfage/http_error";
import { RemoteCallDescriptor } from "@selfage/service_descriptor";

let TOTAL_COUNTER = new promClient.Counter({
  name: "processing_tasks_total",
  help: "The total number of tasks being processed.",
  labelNames: ["path"],
});
let FAILURE_COUNTER = new promClient.Counter({
  name: "processing_tasks_failure",
  help: "The number of task failed processing.",
  labelNames: ["path", "errorCode"],
});

export interface ProcessTaskHandlerWrapper {
  on(event: "done", callbackFn: (error?: Error) => void): this;
}

export class ProcessTaskHandlerWrapper extends EventEmitter {
  public static create(
    descriptor: RemoteCallDescriptor,
    initialBackoffTimeMs: number,
    maxBackkoffTimeMs: number,
  ): ProcessTaskHandlerWrapper {
    return new ProcessTaskHandlerWrapper(
      descriptor,
      initialBackoffTimeMs,
      maxBackkoffTimeMs,
    );
  }

  public constructor(
    private descriptor: RemoteCallDescriptor,
    private initialBackoffTimeMs: number,
    private maxBackkoffTimeMs: number,
  ) {
    super();
  }

  public getBackoffTime(retryCount: number): number {
    return Math.min(
      2 ** retryCount * this.initialBackoffTimeMs,
      this.maxBackkoffTimeMs,
    );
  }

  public async wrap(
    loggingPrefix: string,
    claimTaskFn: () => Promise<void>,
    processFn: () => Promise<void>,
  ): Promise<void> {
    await claimTaskFn();
    this.processAndCatchError(loggingPrefix, processFn);
  }

  private async processAndCatchError(
    loggingPrefix: string,
    processFn: () => Promise<void>,
  ): Promise<void> {
    let path = this.descriptor.service.path + this.descriptor.path;
    TOTAL_COUNTER.inc({ path });
    try {
      await processFn();
      this.emit("done");
    } catch (e) {
      console.error(`${loggingPrefix} ${e.stack ?? e.message ?? e}`);
      FAILURE_COUNTER.inc({
        path,
        errorCode: e.statusCode ?? StatusCode.InternalServerError,
      });
      this.emit("done", e);
    }
  }
}
