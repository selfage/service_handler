import { StreamMessageReader } from "../stream_message_reader";
import { WEB_SERVICE } from "./web_service";
import { MessageDescriptor, PrimitiveType } from "@selfage/message/descriptor";
import { RemoteCallDescriptor } from "@selfage/service_descriptor";
import { RemoteCallHandlerInterface } from "@selfage/service_descriptor/remote_call_handler_interface";

export interface HeartBeatStreamRequestBody {
  rnd: number;
}

export let HEART_BEAT_STREAM_REQUEST_BODY: MessageDescriptor<HeartBeatStreamRequestBody> =
  {
    name: "HeartBeatStreamRequestBody",
    fields: [
      {
        name: "rnd",
        index: 1,
        primitiveType: PrimitiveType.NUMBER,
      },
    ],
  };

export interface HeartBeatRequestMetadata {
  userId: string;
}

export let HEART_BEAT_REQUEST_METADATA: MessageDescriptor<HeartBeatRequestMetadata> =
  {
    name: "HeartBeatRequestMetadata",
    fields: [
      {
        name: "userId",
        index: 1,
        primitiveType: PrimitiveType.STRING,
      },
    ],
  };

export interface HeartBeatResponse {}

export let HEART_BEAT_RESPONSE: MessageDescriptor<HeartBeatResponse> = {
  name: "HeartBeatResponse",
  fields: [],
};

export let HEART_BEAT: RemoteCallDescriptor = {
  name: "HeartBeat",
  service: WEB_SERVICE,
  path: "/HeartBeat",
  metadata: {
    key: "sd",
    type: HEART_BEAT_REQUEST_METADATA,
  },
  body: {
    streamMessageType: HEART_BEAT_STREAM_REQUEST_BODY,
  },
  response: {
    messageType: HEART_BEAT_RESPONSE,
  },
};

export abstract class HeartBeatHandlerInterface
  implements RemoteCallHandlerInterface
{
  public descriptor = HEART_BEAT;
  public abstract handle(
    loggingPrefix: string,
    body: StreamMessageReader<HeartBeatStreamRequestBody>,
    metadata: HeartBeatRequestMetadata,
  ): Promise<HeartBeatResponse>;
}
