import crypto = require("crypto");

function millisecondsToSeconds(milli: number): number {
  return Math.floor(milli / 1000);
}

export class SessionSigner {
  public static SECRET_KEY = "some secrets";
  private static ALGORITHM = "sha256";

  public sign(plainSessionStr: string, timestamp: number): string {
    let signature = crypto
      .createHmac(SessionSigner.ALGORITHM, SessionSigner.SECRET_KEY)
      .update(`${plainSessionStr}/${timestamp}`)
      .digest("base64");
    return signature;
  }
}

export class SessionBuilder {
  public constructor(
    private sessionSigner: SessionSigner,
    private getNow: () => number
  ) {}

  public static create(): SessionBuilder {
    return new SessionBuilder(new SessionSigner(), () => Date.now());
  }

  public build(plainSessionStr: string): string {
    let timestamp = millisecondsToSeconds(this.getNow());
    let signature = this.sessionSigner.sign(plainSessionStr, timestamp);
    return `${plainSessionStr}|${timestamp.toString(36)}|${signature}`;
  }
}

export class SessionExtractor {
  public static SESSION_LONGEVITY = 30 * 24 * 60 * 60; // seconds

  public constructor(private sessionSigner: SessionSigner) {}

  public static create(): SessionExtractor {
    return new SessionExtractor(new SessionSigner());
  }

  public extract(signedSession?: string): string {
    if (!signedSession) {
      throw Error("Missing a signed session input.");
    }

    let pieces = signedSession.split("|");
    if (pieces.length !== 3) {
      throw Error("Invalid signed session string.");
    }
    let plainSessionStr = pieces[0];
    let timestamp = Number.parseInt(pieces[1], 36);
    let signature = pieces[2];

    let signatureExpected = this.sessionSigner.sign(plainSessionStr, timestamp);
    if (signature !== signatureExpected) {
      throw Error("Invalid session signature");
    }
    if (
      millisecondsToSeconds(Date.now()) - timestamp >
      SessionExtractor.SESSION_LONGEVITY
    ) {
      throw Error("Session expired.");
    }
    return plainSessionStr;
  }
}
