import { afterEach, describe, expect, it, vi } from "vitest";
import OpenAI from "openai";
import { analysisFixture } from "./helpers.js";
import { DeepSeekProvider } from "../src/infrastructure/llm/DeepSeekProvider.js";
import { OpenAiProvider } from "../src/infrastructure/llm/OpenAiProvider.js";

const proposalJson = JSON.stringify({
  mergedCode: "const result: number = 1;", explanation: "Kept both changes.", confidence: 0.8, warnings: []
});

afterEach(() => vi.unstubAllGlobals());

describe("LLM providers", () => {
  it("validates the JSON returned by OpenAI without network access", async () => {
    const create = vi.fn().mockResolvedValue({ choices: [{ message: { content: proposalJson } }] });
    const client = { chat: { completions: { create } } } as unknown as OpenAI;
    const provider = new OpenAiProvider("test-key", "test-model", client);
    await expect(provider.generateMergeProposal({ analysis: analysisFixture })).resolves.toMatchObject({ confidence: 0.8 });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ response_format: { type: "json_object" } }));
  });

  it("validates the JSON returned by DeepSeek without network access", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: proposalJson } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const provider = new DeepSeekProvider("test-key", "test-model");
    await expect(provider.generateMergeProposal({ analysis: analysisFixture })).resolves.toMatchObject({ explanation: "Kept both changes." });
    expect(fetchMock).toHaveBeenCalledWith("https://api.deepseek.com/chat/completions", expect.objectContaining({ method: "POST" }));
  });
});
