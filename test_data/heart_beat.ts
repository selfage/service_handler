import { StreamMessageReader } from "../stream_message_reader";
import { MessageDescriptor, PrimitiveType } from "@selfage/message/descriptor";
import { ServiceDescriptor } from "@selfage/service_descriptor";
import { ServiceHandlerInterface } from "@selfage/service_descriptor/service_handler_interface";

export interface HeartBeatStreamRequestBody {
  rnd: number;
}

export let HEART_BEAT_STREAM_REQUEST_BODY: MessageDescriptor<HeartBeatStreamRequestBody> =
  {
    name: "HeartBeatStreamRequestBody",
    fields: [
      {
        name: "rnd",
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
        primitiveType: PrimitiveType.STRING,
      },
    ],
  };

export interface HeartBeatResponse {}

export let HEART_BEAT_RESPONSE: MessageDescriptor<HeartBeatResponse> = {
  name: "HeartBeatResponse",
  fields: [],
};

export let HEART_BEAT: ServiceDescriptor = {
  name: "HeartBeat",
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
  implements ServiceHandlerInterface
{
  public descriptor = HEART_BEAT;
  public abstract handle(
    requestId: string,
    body: StreamMessageReader<HeartBeatStreamRequestBody>,
    metadata: HeartBeatRequestMetadata,
  ): Promise<HeartBeatResponse>;
}
