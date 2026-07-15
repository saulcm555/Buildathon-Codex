import { describe, expect, it } from 'vitest';

import { AnalyzeConflict } from '../src/application/AnalyzeConflict.js';
import type { AstAnalyzer } from '../src/domain/ConflictAnalysis.js';
import type { ConflictRepository } from '../src/domain/MergeConflict.js';

describe('AnalyzeConflict', () => {
  it('combines repository data, AST changes and the worktree hash', async () => {
    const repository: ConflictRepository = {
      getConflict: async () => ({
        repositoryPath: 'C:/repo',
        filePath: 'carrito.js',
        language: 'javascript',
        base: 'const base = true;',
        ours: 'const ours = true;',
        theirs: 'const theirs = true;',
        commits: {
          base: { hash: 'base', author: 'A', date: '2026-01-01', message: 'base' },
          ours: { hash: 'ours', author: 'A', date: '2026-01-02', message: 'ours' },
          theirs: { hash: 'theirs', author: 'B', date: '2026-01-03', message: 'theirs' },
        },
        originalHash: 'sha256',
      }),
      getFileHash: async () => 'sha256',
    };
    const analyzer: AstAnalyzer = {
      analyze: () => [{ branch: 'ours', kind: 'parameter', summary: 'renamed' }],
    };

    const result = await new AnalyzeConflict(repository, analyzer).execute('carrito.js');

    expect(result.conflict.originalHash).toBe('sha256');
    expect(result.astChanges).toHaveLength(1);
    expect(JSON.parse(JSON.stringify(result))).toMatchObject({ conflict: { filePath: 'carrito.js' } });
  });
});
