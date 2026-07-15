import type { ConflictAnalysis } from "./ConflictAnalysis.js";
import type { MergeProposal } from "./MergeProposal.js";

export interface GenerateProposalRequest {
  analysis: ConflictAnalysis;
  instructions?: string;
}

export interface LlmProvider {
  generateMergeProposal(request: GenerateProposalRequest): Promise<MergeProposal>;
}
