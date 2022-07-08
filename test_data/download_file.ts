import stream = require("stream");
import { MessageDescriptor, PrimitiveType } from "@selfage/message/descriptor";
import {
  BytesEncoding,
  ServiceDescriptor,
  ServiceHandler,
} from "@selfage/service_descriptor";

export interface DownloadFileRequestBody {
  fileName: string;
}

export let DOWNLOAD_FILE_REQUEST_BODY: MessageDescriptor<DownloadFileRequestBody> =
  {
    name: "DownloadFileRequestBody",
    fields: [
      {
        name: "fileName",
        primitiveType: PrimitiveType.STRING,
      },
    ],
  };

export let DOWNLOAD_FILE: ServiceDescriptor = {
  name: "DownloadFile",
  path: "/DownloadFile",
  body: {
    messageType: DOWNLOAD_FILE_REQUEST_BODY,
  },
  response: {
    bytesType: BytesEncoding.BYTES,
  },
};

export interface DownloadFileHandlerRequest {
  requestId: string;
  body?: DownloadFileRequestBody;
}

export abstract class DownloadFileHandlerInterface
  implements ServiceHandler<DownloadFileHandlerRequest, stream.Readable>
{
  public descriptor = DOWNLOAD_FILE;
  public abstract handle(
    args: DownloadFileHandlerRequest
  ): Promise<stream.Readable>;
}
