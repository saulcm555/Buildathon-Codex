import type { ConflictAnalysis } from '../domain/ConflictAnalysis.js';
import type { ConflictRepository } from '../domain/MergeConflict.js';
import { FileMergeWriter } from '../infrastructure/filesystem/FileMergeWriter.js';

export interface ApplyApprovedMergeInput {
  analysis: ConflictAnalysis;
  mergedCode: string;
}

/** Applies code only when the reviewed worktree version still matches the analysis. */
export class ApplyApprovedMerge {
  constructor(
    private readonly repository: ConflictRepository,
    private readonly writer: FileMergeWriter,
  ) {}

  async execute({ analysis, mergedCode }: ApplyApprovedMergeInput): Promise<void> {
    const { conflict } = analysis;
    const currentHash = await this.repository.getFileHash(conflict.filePath);

    if (currentHash !== conflict.originalHash) {
      throw new Error(
        `"${conflict.filePath}" changed after analysis. Analyze the conflict again before applying a merge.`,
      );
    }

    await this.writer.write(conflict.repositoryPath, conflict.filePath, mergedCode);
  }
}
