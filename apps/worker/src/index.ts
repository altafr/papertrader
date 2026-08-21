import { createServer } from "node:http";

import { getServerPort } from "@momentum/config";

import { getWorkerHealth } from "./app.js";

const server = createServer((request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(getWorkerHealth()));
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "not_found" }));
});

server.listen(getServerPort(), "0.0.0.0");
