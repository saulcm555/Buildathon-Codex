import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { MergeWorkflowPort } from "../src/application/MergeWorkflowPort.js";
import type { LlmProvider } from "../src/domain/LlmProvider.js";
import { createMergeMcpServer, MergeSessionStore } from "../src/mcp/server.js";
import { analysisFixture } from "./helpers.js";

type TextToolResult = { content: Array<{ text: string }> };

describe("MCP session state", () => {
  it("keeps proposals scoped to the analyzed conflict", () => {
    const store = new MergeSessionStore();
    const conflictId = store.saveConflict(analysisFixture);
    const proposal = store.saveProposal(conflictId, { mergedCode: "const value = 1;", explanation: "ok", confidence: 1, warnings: [] });
    expect(store.getProposal(conflictId, proposal.id).mergedCode).toBe("const value = 1;");
    expect(() => store.getProposal("00000000-0000-4000-8000-000000000000", proposal.id)).toThrow("Unknown proposalId");
  });
});

describe("shared workflow contract", () => {
  it("documents the required core operations", () => {
    const workflow: MergeWorkflowPort = {
      analyze: async () => analysisFixture,
      apply: async () => undefined
    };
    const provider: LlmProvider = { generateMergeProposal: async () => ({ mergedCode: "const value = 1;", explanation: "ok", confidence: 1, warnings: [] }) };
    expect(workflow).toHaveProperty("apply");
    expect(provider).toHaveProperty("generateMergeProposal");
  });
});

describe("MCP tools", () => {
  it("analyzes, generates, and applies a human-approved proposal", async () => {
    const applied: string[] = [];
    const workflow: MergeWorkflowPort = {
      analyze: async () => analysisFixture,
      apply: async ({ mergedCode }) => { applied.push(mergedCode); }
    };
    const provider: LlmProvider = {
      generateMergeProposal: async () => ({
        mergedCode: "const value: number = 1;", explanation: "Kept the validation.", confidence: 0.9, warnings: []
      })
    };
    const server = createMergeMcpServer(workflow, provider);
    const client = new Client({ name: "test-client", version: "1.0.0" });
    const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const analyzed = await client.callTool({ name: "analyze_conflict", arguments: { repositoryPath: "C:/repo", filePath: "src/example.ts" } });
    const conflictId = JSON.parse((analyzed as TextToolResult).content[0]!.text).conflictId as string;
    const generated = await client.callTool({ name: "generate_merge_proposal", arguments: { conflictId } });
    const proposalId = JSON.parse((generated as TextToolResult).content[0]!.text).id as string;
    const appliedResult = await client.callTool({ name: "apply_approved_merge", arguments: {
      conflictId, proposalId, mergedCode: "const edited: number = 2;"
    } });

    expect(JSON.parse((appliedResult as TextToolResult).content[0]!.text)).toEqual({ applied: true, filePath: "src/example.ts" });
    expect(applied).toEqual(["const edited: number = 2;"]);
    await client.close();
    await server.close();
  });
});
