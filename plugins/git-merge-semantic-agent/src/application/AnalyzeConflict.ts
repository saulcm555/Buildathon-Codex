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
    const [fileHash, astChanges] = await Promise.all([
      this.repository.getFileHash(filePath),
      Promise.resolve(
        this.analyzer.analyze({
          baseCode: conflict.baseCode,
          oursCode: conflict.oursCode,
          theirsCode: conflict.theirsCode,
          filePath,
        }),
      ),
    ]);

    return { ...conflict, astChanges, fileHash };
  }
}
