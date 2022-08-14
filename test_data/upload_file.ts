import stream = require("stream");
import { MessageDescriptor, PrimitiveType } from "@selfage/message/descriptor";
import {
  ServiceDescriptor,
  ServiceHandler,
  PrimitveTypeForBody,
} from "@selfage/service_descriptor";

export interface UploadFileRequestSide {
  fileName: string;
}

export let UPLOAD_FILE_REQUEST_SIDE: MessageDescriptor<UploadFileRequestSide> =
  {
    name: "UploadFileRequestSide",
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
  side: {
    key: "sd",
    type: UPLOAD_FILE_REQUEST_SIDE,
  },
  body: {
    primitiveType: PrimitveTypeForBody.BYTES
  },
  response: {
    messageType: UPLOAD_FILE_RESPONSE,
  },
};

export interface UploadFileHandlerRequest {
  requestId: string;
  side: UploadFileRequestSide;
  body: stream.Readable;
}

export abstract class UploadFileHandlerInterface
  implements ServiceHandler<UploadFileHandlerRequest, UploadFileResponse>
{
  public descriptor = UPLOAD_FILE;
  public abstract handle(
    args: UploadFileHandlerRequest
  ): Promise<UploadFileResponse>;
}
