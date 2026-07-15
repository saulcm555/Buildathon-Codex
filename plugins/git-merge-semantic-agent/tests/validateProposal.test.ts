import { describe, expect, it } from "vitest";
import { parseAndValidateProposal, validateMergedCode } from "../src/infrastructure/llm/validateProposal.js";

describe("proposal validation", () => {
  it("accepts a structured TypeScript proposal", () => {
    expect(parseAndValidateProposal(JSON.stringify({
      mergedCode: "const value: number = 1;",
      explanation: "Kept both changes.", confidence: 0.8, warnings: []
    }), "typescript").mergedCode).toContain("number");
  });

  it("rejects invalid JSON, invalid schema, and invalid syntax", () => {
    expect(() => parseAndValidateProposal("```json {}```", "typescript")).toThrow("valid JSON");
    expect(() => parseAndValidateProposal(JSON.stringify({ mergedCode: "x", explanation: "ok", confidence: 2, warnings: [] }), "typescript")).toThrow();
    expect(() => validateMergedCode("const = ;", "typescript")).toThrow("invalid typescript syntax");
  });
});
