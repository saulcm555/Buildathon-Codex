import type { LlmProvider } from "../../domain/LlmProvider.js";
import { DeepSeekProvider } from "./DeepSeekProvider.js";
import { OpenAiProvider } from "./OpenAiProvider.js";

export function createLlmProvider(env: NodeJS.ProcessEnv = process.env): LlmProvider {
  switch (env.LLM_PROVIDER ?? "openai") {
    case "openai":
      return new OpenAiProvider(required(env.OPENAI_API_KEY, "OPENAI_API_KEY"), env.OPENAI_MODEL ?? "gpt-5-mini");
    case "deepseek":
      return new DeepSeekProvider(required(env.DEEPSEEK_API_KEY, "DEEPSEEK_API_KEY"), env.DEEPSEEK_MODEL ?? "deepseek-chat");
    default:
      throw new Error("LLM_PROVIDER must be either 'openai' or 'deepseek'.");
  }
}

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is required for the selected LLM_PROVIDER.`);
  return value;
}
