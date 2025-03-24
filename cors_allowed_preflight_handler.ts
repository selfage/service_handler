import express = require("express");

export class CorsAllowedPreflightHandler {
  public static create(allowOrigin: string): CorsAllowedPreflightHandler {
    return new CorsAllowedPreflightHandler(allowOrigin);
  }

  public constructor(private allowOrigin: string) {}

  public handle(res: express.Response): void {
    // Allow all.
    res.setHeader("Access-Control-Allow-Origin", this.allowOrigin);
    res.setHeader("Access-Control-Allow-Methods", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");

    res.send("ok");
  }
}
