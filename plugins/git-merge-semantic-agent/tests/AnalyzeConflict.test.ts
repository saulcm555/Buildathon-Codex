import { describe, expect, it } from 'vitest';

import { AnalyzeConflict } from '../src/application/AnalyzeConflict.js';
import type { AstAnalyzer } from '../src/domain/ConflictAnalysis.js';
import type { ConflictRepository } from '../src/domain/MergeConflict.js';

describe('AnalyzeConflict', () => {
  it('combines repository data, AST changes and the worktree hash', async () => {
    const repository: ConflictRepository = {
      getConflict: async () => ({
        filePath: 'carrito.js',
        baseCode: 'const base = true;',
        oursCode: 'const ours = true;',
        theirsCode: 'const theirs = true;',
        commits: {
          base: { hash: 'base', author: 'A', date: '2026-01-01', message: 'base' },
          ours: { hash: 'ours', author: 'A', date: '2026-01-02', message: 'ours' },
          theirs: { hash: 'theirs', author: 'B', date: '2026-01-03', message: 'theirs' },
        },
      }),
      getFileHash: async () => 'sha256',
    };
    const analyzer: AstAnalyzer = {
      analyze: () => [{ branch: 'ours', nodeType: 'parameter', summary: 'renamed' }],
    };

    const result = await new AnalyzeConflict(repository, analyzer).execute('carrito.js');

    expect(result.fileHash).toBe('sha256');
    expect(result.astChanges).toHaveLength(1);
    expect(JSON.parse(JSON.stringify(result))).toMatchObject({ filePath: 'carrito.js' });
  });
});
