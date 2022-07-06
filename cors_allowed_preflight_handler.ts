import express = require("express");

export class CorsAllowedPreflightHandler {
  public handle(res: express.Response): void {
    // Allow all.
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");

    res.send("ok");
  }
}
