import {
  SessionBuilder,
  SessionExtractor,
  SessionSigner,
} from "./session_signer";
import { assertThat, assertThrow, eq, eqError } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "SessionSignerTest",
  cases: [
    {
      name: "BuildAndExtract",
      execute: () => {
        // Prepare
        let builder = SessionBuilder.create();
        let extractor = SessionExtractor.create();
        let plainSessionStr = "some random string";

        // Execute
        let signedSession = builder.build(plainSessionStr);
        let extractedSessionStr = extractor.extract(signedSession);

        // Verify
        assertThat(extractedSessionStr, eq(plainSessionStr), "session string");
      },
    },
    {
      name: "BuildAndExtractWithExpiredTimestamp",
      execute: () => {
        // Prepare
        let builder = new SessionBuilder(
          new SessionSigner(),
          new (class extends Date {
            public getTime(): number {
              return Date.now() - 30 * 24 * 60 * 60 * 1000 - 1;
            }
          })()
        );
        let extractor = SessionExtractor.create();
        let plainSessionStr = "some random string";

        // Execute
        let signedSession = builder.build(plainSessionStr);
        let error = assertThrow(() => extractor.extract(signedSession));

        // Verify
        assertThat(error, eqError(new Error("expired")), "expired error");
      },
    },
    {
      name: "ExtractWithInvalidSignature",
      execute: () => {
        // Prepare
        let extractor = SessionExtractor.create();
        let incorrectSignedSession = "some random string|12313|some signature";

        // Execute
        let error = assertThrow(() =>
          extractor.extract(incorrectSignedSession)
        );

        // Verify
        assertThat(error, eqError(new Error("signature")), "signature error");
      },
    },
  ],
});
