import { describe, expect, it } from "vitest";
import { createLlmProvider } from "../src/infrastructure/llm/LlmProviderFactory.js";
import { OpenAiProvider } from "../src/infrastructure/llm/OpenAiProvider.js";
import { DeepSeekProvider } from "../src/infrastructure/llm/DeepSeekProvider.js";

describe("LLM provider factory", () => {
  it("selects providers without exposing their keys", () => {
    expect(createLlmProvider({ LLM_PROVIDER: "openai", OPENAI_API_KEY: "test-key" })).toBeInstanceOf(OpenAiProvider);
    expect(createLlmProvider({ LLM_PROVIDER: "deepseek", DEEPSEEK_API_KEY: "test-key" })).toBeInstanceOf(DeepSeekProvider);
  });
  it("rejects unknown providers and missing keys", () => {
    expect(() => createLlmProvider({ LLM_PROVIDER: "other" })).toThrow("LLM_PROVIDER");
    expect(() => createLlmProvider({ LLM_PROVIDER: "openai" })).toThrow("OPENAI_API_KEY");
  });
});
