import "dotenv/config";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createLlmProvider } from "../infrastructure/llm/LlmProviderFactory.js";
import { createMergeMcpServer, MergeSessionStore } from "./server.js";
import { DemoWorkflow } from "./DemoWorkflow.js";

const port = Number(process.env.PORT ?? 3000);
const allowedOrigins = new Set((process.env.ALLOWED_ORIGIN ?? "http://localhost:5173").split(",").map((origin) => origin.trim()).filter(Boolean));
const app = express();
// Render terminates TLS at one reverse proxy before forwarding requests here.
// Trust only that hop so rate limiting can use the real client IP safely.
app.set("trust proxy", 1);
const workflow = new DemoWorkflow();
const provider = createLlmProvider();
const store = new MergeSessionStore();

app.disable("x-powered-by");
app.use((req, res, next) => {
  const origin = req.header("origin");
  if (origin && !allowedOrigins.has(origin)) return res.status(403).json({ error: "Origin not allowed." });
  next();
});
app.use(cors({ origin: [...allowedOrigins], methods: ["GET", "POST", "DELETE"] }));
app.use(express.json({ limit: "256kb" }));
app.get("/health", (_, res) => res.status(200).json({ status: "ok" }));
app.post("/mcp", rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false }), async (req, res) => {
  const server = createMergeMcpServer(workflow, provider, store);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ error: error instanceof Error ? error.message : "MCP request failed." });
  } finally {
    void transport.close();
    void server.close();
  }
});
// The Streamable HTTP client optionally probes this endpoint with GET to see
// whether the server provides a standalone SSE stream. This service replies
// inline to POST requests, so acknowledge the optional probe without causing
// a browser-console 405 error.
app.get("/mcp", (_, res) => res.status(204).end());
app.all("/mcp", (_, res) => res.status(405).json({ error: "Use POST for MCP requests." }));
app.listen(port, "0.0.0.0", () => console.error(`Semantic Merge HTTP MCP listening on ${port}`));
