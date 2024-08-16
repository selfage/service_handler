import crypto = require("crypto");
import { newBadRequestError, newUnauthorizedError } from "@selfage/http_error";
import { MessageDescriptor } from "@selfage/message/descriptor";
import {
  destringifyMessage,
  stringifyMessage,
} from "@selfage/message/stringifier";

function millisecondsToSeconds(milli: number): number {
  return Math.floor(milli / 1000);
}

export class SessionSigner {
  public static SECRET_KEY = "some secrets";
  private static ALGORITHM = "sha256";

  public sign(sessionStr: string, timestamp: number): string {
    let signature = crypto
      .createHmac(SessionSigner.ALGORITHM, SessionSigner.SECRET_KEY)
      .update(`${sessionStr}/${timestamp}`)
      .digest("base64");
    return signature;
  }
}

export class SessionBuilder {
  public constructor(
    private sessionSigner: SessionSigner,
    private getNow: () => number,
  ) {}

  public static create(): SessionBuilder {
    return new SessionBuilder(new SessionSigner(), () => Date.now());
  }

  public build<T>(session: T, sessionDescriptor: MessageDescriptor<T>): string {
    let sessionStr = stringifyMessage(session, sessionDescriptor);
    let timestamp = millisecondsToSeconds(this.getNow());
    let signature = this.sessionSigner.sign(sessionStr, timestamp);
    return `${sessionStr}|${timestamp.toString(36)}|${signature}`;
  }
}

export class SessionExtractor {
  public static SESSION_LONGEVITY = 30 * 24 * 60 * 60; // seconds

  public constructor(private sessionSigner: SessionSigner) {}

  public static create(): SessionExtractor {
    return new SessionExtractor(new SessionSigner());
  }

  public extract<T>(
    signedSession: any,
    sessionDescriptor: MessageDescriptor<T>,
    loggingPrefix: string,
  ): T {
    if (typeof signedSession !== "string") {
      throw newUnauthorizedError(
        `${loggingPrefix} signedSession is not a string, but it's ${signedSession}.`,
      );
    }

    let pieces = signedSession.split("|");
    if (pieces.length !== 3) {
      throw newUnauthorizedError("Invalid signed session string.");
    }
    let sessionStr = pieces[0];
    let timestamp = Number.parseInt(pieces[1], 36);
    let signature = pieces[2];

    let signatureExpected = this.sessionSigner.sign(sessionStr, timestamp);
    if (signature !== signatureExpected) {
      throw newUnauthorizedError("Invalid session signature");
    }
    if (
      millisecondsToSeconds(Date.now()) - timestamp >
      SessionExtractor.SESSION_LONGEVITY
    ) {
      throw newUnauthorizedError("Session expired.");
    }
    try {
      return destringifyMessage(sessionStr, sessionDescriptor);
    } catch (e) {
      throw newBadRequestError(
        `${loggingPrefix} Unable to destringify session string. Raw string: ${sessionStr}.`,
      );
    }
  }
}
