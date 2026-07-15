import type { ConflictAnalysis } from "../domain/ConflictAnalysis.js";
import type { MergeProposal } from "../domain/MergeProposal.js";

/** Port implemented by the Git/AST and safe-file-write work from integrante 1. */
export interface MergeWorkflowPort {
  analyze(repositoryPath: string, filePath: string): Promise<ConflictAnalysis>;
  apply(input: {
    analysis: ConflictAnalysis;
    proposal: MergeProposal;
    mergedCode: string;
  }): Promise<void>;
}
