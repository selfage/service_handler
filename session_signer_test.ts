import {
  SessionBuilder,
  SessionExtractor,
  SessionSigner,
} from "./session_signer";
import { MY_SESSION, MySession } from "./test_data/my_session";
import { newUnauthorizedError } from "@selfage/http_error";
import { eqMessage } from "@selfage/message/test_matcher";
import { assertThat, assertThrow, eqError } from "@selfage/test_matcher";
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
        let inputSession: MySession = { sessionId: "s1", userId: "u2" };

        // Execute
        let signedSession = builder.build(inputSession, MY_SESSION);
        let extractedSession = extractor.extract(signedSession, MY_SESSION, "");

        // Verify
        assertThat(
          extractedSession,
          eqMessage(inputSession, MY_SESSION),
          "session",
        );
      },
    },
    {
      name: "BuildAndExtractWithExpiredTimestamp",
      execute: () => {
        // Prepare
        let builder = new SessionBuilder(
          new SessionSigner(),
          () => Date.now() - 30 * 24 * 60 * 60 * 1000 - 1000,
        );
        let extractor = SessionExtractor.create();
        let inputSession: MySession = { sessionId: "s1", userId: "u2" };

        // Execute
        let signedSession = builder.build(inputSession, MY_SESSION);
        let error = assertThrow(() =>
          extractor.extract(signedSession, MY_SESSION, ""),
        );

        // Verify
        assertThat(
          error,
          eqError(newUnauthorizedError("expired")),
          "expired error",
        );
      },
    },
    {
      name: "ExtractWithEmptySession",
      execute: () => {
        // Prepare
        let extractor = SessionExtractor.create();

        // Execute
        let error = assertThrow(() =>
          extractor.extract(undefined, MY_SESSION, ""),
        );

        // Verify
        assertThat(
          error,
          eqError(newUnauthorizedError("is not a string")),
          "missing error",
        );
      },
    },
    {
      name: "ExtractWithMalformattedSession",
      execute: () => {
        // Prepare
        let extractor = SessionExtractor.create();
        let malformattedSession = "some random string|12313";

        // Execute
        let error = assertThrow(() =>
          extractor.extract(malformattedSession, MY_SESSION, ""),
        );

        // Verify
        assertThat(
          error,
          eqError(newUnauthorizedError("Invalid signed session")),
          "malformatted error",
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
          extractor.extract(incorrectSignedSession, MY_SESSION, ""),
        );

        // Verify
        assertThat(
          error,
          eqError(newUnauthorizedError("signature")),
          "signature error",
        );
      },
    },
  ],
});
