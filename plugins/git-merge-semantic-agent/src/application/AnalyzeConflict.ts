import type { AstAnalyzer, ConflictAnalysis } from '../domain/ConflictAnalysis.js';
import type { ConflictRepository } from '../domain/MergeConflict.js';

/** Builds the deterministic context consumed later by the LLM and UI layers. */
export class AnalyzeConflict {
  constructor(
    private readonly repository: ConflictRepository,
    private readonly analyzer: AstAnalyzer,
  ) {}

  async execute(filePath: string): Promise<ConflictAnalysis> {
    const conflict = await this.repository.getConflict(filePath);
    const astChanges = this.analyzer.analyze({
      baseCode: conflict.base,
      oursCode: conflict.ours,
      theirsCode: conflict.theirs,
      filePath,
    });

    return { conflict, astChanges };
  }
}
