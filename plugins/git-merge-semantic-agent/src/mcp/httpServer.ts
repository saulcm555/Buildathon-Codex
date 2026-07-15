import "dotenv/config";
import cors from "cors";
import express, { type Request } from "express";
import rateLimit from "express-rate-limit";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { LlmProvider } from "../domain/LlmProvider.js";
import { createLlmProvider } from "../infrastructure/llm/LlmProviderFactory.js";
import { createMergeMcpServer, MergeSessionStore } from "./server.js";
import { DemoWorkflow } from "./DemoWorkflow.js";

const port = Number(process.env.PORT ?? 3000);
const workflow = new DemoWorkflow();
const store = new MergeSessionStore();
let provider: LlmProvider | undefined;

function getProvider() {
  provider ??= createLlmProvider();
  return provider;
}

function configuredOrigins() {
  return new Set((process.env.ALLOWED_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean));
}

function isSameOriginRequest(req: Request, origin: string) {
  const protocol = req.header("x-forwarded-proto") ?? req.protocol;
  return origin === `${protocol}://${req.header("host")}`;
}

/**
 * Reusable MCP handler for a persistent local server and a Vercel Function.
 * The public workflow is read-only and never writes a visitor's files.
 */
export function createMcpHttpApp() {
  const app = express();
  const allowedOrigins = configuredOrigins();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use((req, res, next) => {
    const origin = req.header("origin");
    if (origin && !allowedOrigins.has(origin) && !isSameOriginRequest(req, origin)) {
      return res.status(403).json({ error: "Origin not allowed." });
    }
    next();
  });
  app.use(cors({
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
    methods: ["GET", "POST", "DELETE"]
  }));
  app.use(express.json({ limit: "256kb" }));
  app.post(/.*/, rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false }), async (req, res) => {
    const server = createMergeMcpServer(workflow, getProvider(), store);
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
  app.all(/.*/, (_, res) => res.status(405).json({ error: "Use POST for MCP requests." }));
  return app;
}

export function createHttpServerApp() {
  const app = express();
  app.disable("x-powered-by");
  app.get("/health", (_, res) => res.status(200).json({ status: "ok" }));
  app.use("/mcp", createMcpHttpApp());
  return app;
}

const executedDirectly = process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (executedDirectly) {
  createHttpServerApp().listen(port, "0.0.0.0", () => console.error(`Semantic Merge HTTP MCP listening on ${port}`));
}
