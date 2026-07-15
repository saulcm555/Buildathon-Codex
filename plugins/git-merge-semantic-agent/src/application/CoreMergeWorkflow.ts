import type { ConflictAnalysis } from '../domain/ConflictAnalysis.js';
import type { MergeProposal } from '../domain/MergeProposal.js';
import { BabelAstAnalyzer } from '../infrastructure/ast/BabelAstAnalyzer.js';
import { FileMergeWriter } from '../infrastructure/filesystem/FileMergeWriter.js';
import { GitConflictRepository } from '../infrastructure/git/GitConflictRepository.js';
import { AnalyzeConflict } from './AnalyzeConflict.js';
import { ApplyApprovedMerge } from './ApplyApprovedMerge.js';
import type { MergeWorkflowPort } from './MergeWorkflowPort.js';

/** Composes the deterministic Git/AST core behind the MCP workflow port. */
export class CoreMergeWorkflow implements MergeWorkflowPort {
  async analyze(repositoryPath: string, filePath: string): Promise<ConflictAnalysis> {
    const repository = new GitConflictRepository(repositoryPath);
    const analyzer = new BabelAstAnalyzer();
    return new AnalyzeConflict(repository, analyzer).execute(filePath);
  }

  async apply(input: {
    analysis: ConflictAnalysis;
    proposal: MergeProposal;
    mergedCode: string;
  }): Promise<void> {
    const repository = new GitConflictRepository(input.analysis.conflict.repositoryPath);
    const writer = new FileMergeWriter();
    await new ApplyApprovedMerge(repository, writer).execute({
      analysis: input.analysis,
      mergedCode: input.mergedCode,
    });
  }
}
