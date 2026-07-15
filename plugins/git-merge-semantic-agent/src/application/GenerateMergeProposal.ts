import type { ConflictAnalysis } from "../domain/ConflictAnalysis.js";
import type { LlmProvider } from "../domain/LlmProvider.js";
import type { MergeProposal } from "../domain/MergeProposal.js";

export class GenerateMergeProposal {
  constructor(private readonly provider: LlmProvider) {}

  execute(analysis: ConflictAnalysis, instructions?: string): Promise<MergeProposal> {
    return this.provider.generateMergeProposal({ analysis, instructions });
  }
}
