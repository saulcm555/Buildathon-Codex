import { parse } from "@babel/parser";
import type { ParserPlugin } from "@babel/parser";
import { MergeProposalSchema, type MergeProposal } from "../../domain/MergeProposal.js";
import type { SupportedLanguage } from "../../domain/MergeConflict.js";

export function parseAndValidateProposal(raw: string, language: SupportedLanguage): MergeProposal {
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    throw new Error("The LLM response is not valid JSON.");
  }
  const proposal = MergeProposalSchema.parse(decoded);
  try {
    parse(proposal.mergedCode, {
      sourceType: "unambiguous",
      plugins: parserPlugins(language)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown parser error";
    throw new Error(`The proposed merge has invalid ${language} syntax: ${message}`);
  }
  return proposal;
}

export function validateMergedCode(code: string, language: SupportedLanguage): void {
  parseAndValidateProposal(JSON.stringify({ mergedCode: code, explanation: "Edited by user", confidence: 1, warnings: [] }), language);
}

function parserPlugins(language: SupportedLanguage): ParserPlugin[] {
  if (language === "typescript") return ["typescript"];
  if (language === "jsx") return ["jsx"];
  if (language === "tsx") return ["typescript", "jsx"];
  return [];
}
