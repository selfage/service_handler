import {
  SessionBuilder,
  SessionExtractor,
  SessionSigner,
} from "./session_signer";
import { assertThat, assertThrow, eq, eqError } from "@selfage/test_matcher";
import { NODE_TEST_RUNNER } from "@selfage/test_runner";

NODE_TEST_RUNNER.run({
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
          () => Date.now() - 30 * 24 * 60 * 60 * 1000 - 1000
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
      name: "ExtractWithEmptySession",
      execute: () => {
        // Prepare
        let extractor = SessionExtractor.create();

        // Execute
        let error = assertThrow(() => extractor.extract(undefined));

        // Verify
        assertThat(error, eqError(new Error("Missing")), "missing error");
      },
    },
    {
      name: "ExtractWithMalformattedSession",
      execute: () => {
        // Prepare
        let extractor = SessionExtractor.create();
        let malformattedSession = "some random string|12313";

        // Execute
        let error = assertThrow(() => extractor.extract(malformattedSession));

        // Verify
        assertThat(
          error,
          eqError(new Error("Invalid signed session")),
          "malformatted error"
        );
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
