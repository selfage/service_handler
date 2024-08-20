import stream = require("stream");
import { MessageDescriptor, PrimitiveType } from "@selfage/message/descriptor";
import {
  PrimitveTypeForBody,
  WebRemoteCallDescriptor,
} from "@selfage/service_descriptor";
import { WebHandlerInterface } from "@selfage/service_descriptor/handler_interface";

export interface UploadFileRequestMetadata {
  fileName: string;
}

export let UPLOAD_FILE_REQUEST_METADATA: MessageDescriptor<UploadFileRequestMetadata> =
  {
    name: "UploadFileRequestMetadata",
    fields: [
      {
        name: "fileName",
        index: 1,
        primitiveType: PrimitiveType.STRING,
      },
    ],
  };

export interface UploadFileResponse {
  byteSize: number;
  success: boolean;
}

export let UPLOAD_FILE_RESPONSE: MessageDescriptor<UploadFileResponse> = {
  name: "UploadFileResponse",
  fields: [
    {
      name: "byteSize",
      index: 1,
      primitiveType: PrimitiveType.NUMBER,
    },
    {
      name: "success",
      index: 2,
      primitiveType: PrimitiveType.BOOLEAN,
    },
  ],
};

export let UPLOAD_FILE: WebRemoteCallDescriptor = {
  name: "UploadFile",
  path: "/UploadFile",
  metadata: {
    key: "sd",
    type: UPLOAD_FILE_REQUEST_METADATA,
  },
  body: {
    primitiveType: PrimitveTypeForBody.BYTES,
  },
  response: {
    messageType: UPLOAD_FILE_RESPONSE,
  },
};

export abstract class UploadFileHandlerInterface
  implements WebHandlerInterface
{
  public descriptor = UPLOAD_FILE;
  public abstract handle(
    requestId: string,
    body: stream.Readable,
    metadata: UploadFileRequestMetadata,
  ): Promise<UploadFileResponse>;
}
