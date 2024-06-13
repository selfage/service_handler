import { ReadableStreamFake } from "./readable_stream_fake";
import { StreamMessageReader } from "./stream_message_reader";
import {
  HEART_BEAT_STREAM_REQUEST_BODY,
  HeartBeatStreamRequestBody,
} from "./test_data/heart_beat";
import { eqMessage } from "@selfage/message/test_matcher";
import { assertThat, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

async function readStreamMessage(
  chunks: Array<string>,
  expected: Array<HeartBeatStreamRequestBody>,
) {
  // Prepare
  let readableFake = new ReadableStreamFake(chunks);

  // Execute
  let bodies = new Array<HeartBeatStreamRequestBody>();
  let reader = new StreamMessageReader(
    readableFake,
    HEART_BEAT_STREAM_REQUEST_BODY,
  ).on("data", (body) => {
    bodies.push(body);
  });
  reader.start();
  await new Promise<void>((resolve) => reader.once("end", resolve));

  // Verify
  assertThat(
    bodies,
    isArray(
      expected.map((body) => eqMessage(body, HEART_BEAT_STREAM_REQUEST_BODY)),
    ),
    "bodies",
  );
}

TEST_RUNNER.run({
  name: "StreamMessageReaderTest",
  cases: [
    {
      name: "SingleMessageBody",
      execute: async () => {
        await readStreamMessage(
          [`{"rnd":1}`],
          [
            {
              rnd: 1,
            },
          ],
        );
      },
    },
    {
      name: "SingleChunkWithMultipleBodies",
      execute: async () => {
        await readStreamMessage(
          [`{"rnd":1};{"rnd":2};`],
          [
            {
              rnd: 1,
            },
            {
              rnd: 2,
            },
          ],
        );
      },
    },
    {
      name: "MultipleChunksWithMultipleBodies",
      execute: async () => {
        await readStreamMessage(
          [`{"rn`, `d":`, `1};{"rnd":2};{"`, `rnd":3};`],
          [
            {
              rnd: 1,
            },
            {
              rnd: 2,
            },
            {
              rnd: 3,
            },
          ],
        );
      },
    },
  ],
});
