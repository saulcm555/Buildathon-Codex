import type { GenerateProposalRequest } from "../../domain/LlmProvider.js";

export function buildMergePrompt({ analysis, instructions }: GenerateProposalRequest): string {
  const { conflict, astChanges } = analysis;
  return [
    "You are resolving one Git merge conflict. Preserve compatible changes from both ours and theirs.",
    "Return only a JSON object with exactly: mergedCode (string), explanation (string), confidence (number from 0 to 1), warnings (string[]).",
    "Do not use Markdown fences. Do not include conflict markers. Do not invent APIs or remove valid changes without a warning.",
    `File: ${conflict.filePath}`,
    `Language: ${conflict.language}`,
    `AST changes: ${JSON.stringify(astChanges)}`,
    "<base>", conflict.base, "</base>",
    "<ours>", conflict.ours, "</ours>",
    "<theirs>", conflict.theirs, "</theirs>",
    instructions ? `Additional user instruction: ${instructions}` : ""
  ].filter(Boolean).join("\n");
}
