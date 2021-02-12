import express = require("express");

export function registerCorsAllowedPreflightHandler(app: express.Express) {
  app.options("/.*", (req, res) => {
    // Allow all.
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");

    res.send("ok");
  });
}
