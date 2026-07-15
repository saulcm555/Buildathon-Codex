import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CoreMergeWorkflow } from "../application/CoreMergeWorkflow.js";
import { GenerateMergeProposal } from "../application/GenerateMergeProposal.js";
import type { MergeWorkflowPort } from "../application/MergeWorkflowPort.js";
import type { ConflictAnalysis } from "../domain/ConflictAnalysis.js";
import type { MergeProposal, StoredMergeProposal } from "../domain/MergeProposal.js";
import type { LlmProvider } from "../domain/LlmProvider.js";
import { createLlmProvider } from "../infrastructure/llm/LlmProviderFactory.js";
import { validateMergedCode } from "../infrastructure/llm/validateProposal.js";

// Always load the plugin-level .env, regardless of the directory from which
// Codex or npm starts the MCP server. Shell variables retain precedence.
const moduleDirectory = resolve(fileURLToPath(new URL(".", import.meta.url)));
dotenv.config({ path: resolve(moduleDirectory, "../../.env") });

interface SessionConflict { analysis: ConflictAnalysis; }

export class MergeSessionStore {
  private readonly conflicts = new Map<string, SessionConflict>();
  private readonly proposals = new Map<string, StoredMergeProposal>();

  saveConflict(analysis: ConflictAnalysis): string {
    const id = randomUUID();
    this.conflicts.set(id, { analysis });
    return id;
  }

  getConflict(id: string): SessionConflict {
    const conflict = this.conflicts.get(id);
    if (!conflict) throw new Error("Unknown or expired conflictId. Analyze the conflict again.");
    return conflict;
  }

  saveProposal(conflictId: string, proposal: MergeProposal): StoredMergeProposal {
    this.getConflict(conflictId);
    const stored = { ...proposal, id: randomUUID(), conflictId, createdAt: new Date().toISOString() };
    this.proposals.set(stored.id, stored);
    return stored;
  }

  getProposal(conflictId: string, proposalId: string): StoredMergeProposal {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.conflictId !== conflictId) {
      throw new Error("Unknown proposalId for this conflict. Generate a proposal again.");
    }
    return proposal;
  }
}

export function createMergeMcpServer(workflow: MergeWorkflowPort, provider: LlmProvider, store = new MergeSessionStore()): McpServer {
  const server = new McpServer({ name: "git-merge-semantic-agent", version: "0.1.0" });
  const generator = new GenerateMergeProposal(provider);

  server.registerTool("analyze_conflict", {
    title: "Analyze a Git conflict",
    description: "Returns base, ours, theirs, commit metadata, AST changes, and an in-memory conflictId.",
    inputSchema: { repositoryPath: z.string().min(1), filePath: z.string().min(1) }
  }, async ({ repositoryPath, filePath }) => {
    try {
      const analysis = await workflow.analyze(repositoryPath, filePath);
      const conflictId = store.saveConflict(analysis);
      return success({ conflictId, ...analysis });
    } catch (error) { return failure(error); }
  });

  server.registerTool("generate_merge_proposal", {
    title: "Generate a semantic merge proposal",
    description: "Requests a validated JSON merge proposal. Optional instructions request a new variant.",
    inputSchema: { conflictId: z.string().uuid(), instructions: z.string().max(4_000).optional() }
  }, async ({ conflictId, instructions }) => {
    try {
      const { analysis } = store.getConflict(conflictId);
      const proposal = await generator.execute(analysis, instructions);
      return success(store.saveProposal(conflictId, proposal));
    } catch (error) { return failure(error); }
  });

  server.registerTool("apply_approved_merge", {
    title: "Apply a human-approved merge proposal",
    description: "Validates the selected or edited code then delegates a hash-protected file write to the Git/AST core.",
    inputSchema: {
      conflictId: z.string().uuid(), proposalId: z.string().uuid(), mergedCode: z.string().min(1).optional()
    }
  }, async ({ conflictId, proposalId, mergedCode }) => {
    try {
      const { analysis } = store.getConflict(conflictId);
      const proposal = store.getProposal(conflictId, proposalId);
      const finalCode = mergedCode ?? proposal.mergedCode;
      validateMergedCode(finalCode, analysis.conflict.language);
      await workflow.apply({ analysis, proposal: { ...proposal, mergedCode: finalCode }, mergedCode: finalCode });
      return success({ applied: true, filePath: analysis.conflict.filePath });
    } catch (error) { return failure(error); }
  });
  return server;
}

function success(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }] };
}

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  return { isError: true, content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }] };
}

async function main(): Promise<void> {
  const server = createMergeMcpServer(new CoreMergeWorkflow(), createLlmProvider());
  await server.connect(new StdioServerTransport());
}

const executedDirectly = process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (executedDirectly) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Failed to start MCP server.");
    process.exitCode = 1;
  });
}
