import { app } from "./app.ts";
import express from "express";
import path from "node:path";
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.resolve("dist")));
  app.get("/{*path}", (_req, res) =>
    res.sendFile(path.resolve("dist/index.html")),
  );
}

const server = app.listen(Number(process.env.PORT || 3001), "0.0.0.0", () =>
  console.log("VoltGhar API listening on port " + (process.env.PORT || 3001)),
);
process.on("SIGTERM", () => {

  server.close();
});
