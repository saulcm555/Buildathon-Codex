import { describe, expect, it, vi } from 'vitest';

import { ApplyApprovedMerge } from '../src/application/ApplyApprovedMerge.js';
import type { ConflictAnalysis } from '../src/domain/ConflictAnalysis.js';
import type { ConflictRepository } from '../src/domain/MergeConflict.js';
import { FileMergeWriter } from '../src/infrastructure/filesystem/FileMergeWriter.js';

const analysis: ConflictAnalysis = {
  conflict: {
    repositoryPath: 'C:/repository',
    filePath: 'src/example.ts',
    language: 'typescript',
    base: 'const value = 1;',
    ours: 'const ours = 1;',
    theirs: 'const theirs = 1;',
    commits: {
      base: { hash: 'base', author: 'A', date: '2026-01-01', message: 'base' },
      ours: { hash: 'ours', author: 'B', date: '2026-01-02', message: 'ours' },
      theirs: { hash: 'theirs', author: 'C', date: '2026-01-03', message: 'theirs' },
    },
    originalHash: 'expected-hash',
  },
  astChanges: [],
};

function repositoryWithHash(hash: string): ConflictRepository {
  return {
    getConflict: async () => analysis.conflict,
    getFileHash: async () => hash,
  };
}

describe('ApplyApprovedMerge', () => {
  it('writes approved code when the worktree hash is unchanged', async () => {
    const writer = { write: vi.fn().mockResolvedValue(undefined) } as unknown as FileMergeWriter;
    const useCase = new ApplyApprovedMerge(repositoryWithHash('expected-hash'), writer);

    await useCase.execute({ analysis, mergedCode: 'const merged: number = 1;' });

    expect(writer.write).toHaveBeenCalledWith(
      'C:/repository',
      'src/example.ts',
      'const merged: number = 1;',
    );
  });

  it('blocks an approval when the file changed after analysis', async () => {
    const writer = { write: vi.fn() } as unknown as FileMergeWriter;
    const useCase = new ApplyApprovedMerge(repositoryWithHash('different-hash'), writer);

    await expect(useCase.execute({ analysis, mergedCode: 'const merged = 1;' }))
      .rejects.toThrow('changed after analysis');
    expect(writer.write).not.toHaveBeenCalled();
  });
});
