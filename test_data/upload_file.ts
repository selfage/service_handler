import stream = require("stream");
import { MessageDescriptor, PrimitiveType } from "@selfage/message/descriptor";
import {
  PrimitveTypeForBody,
  ServiceDescriptor,
} from "@selfage/service_descriptor";
import { ServiceHandlerInterface } from "@selfage/service_descriptor/service_handler_interface";

export interface UploadFileRequestMetadata {
  fileName: string;
}

export let UPLOAD_FILE_REQUEST_METADATA: MessageDescriptor<UploadFileRequestMetadata> =
  {
    name: "UploadFileRequestMetadata",
    fields: [
      {
        name: "fileName",
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
      primitiveType: PrimitiveType.NUMBER,
    },
    {
      name: "success",
      primitiveType: PrimitiveType.BOOLEAN,
    },
  ],
};

export let UPLOAD_FILE: ServiceDescriptor = {
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
  implements ServiceHandlerInterface
{
  public descriptor = UPLOAD_FILE;
  public abstract handle(
    requestId: string,
    body: stream.Readable,
    metadata: UploadFileRequestMetadata
  ): Promise<UploadFileResponse>;
}
