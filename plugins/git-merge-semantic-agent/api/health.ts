import type { IncomingMessage, ServerResponse } from "node:http";

/** Health check that does not initialize the LLM provider. */
export default function health(_: IncomingMessage, response: ServerResponse) {
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.statusCode = 200;
  response.end(JSON.stringify({ status: "ok" }));
}
