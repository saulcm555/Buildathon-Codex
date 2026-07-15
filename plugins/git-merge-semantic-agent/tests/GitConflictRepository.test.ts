import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import { GitConflictRepository } from '../src/infrastructure/git/GitConflictRepository.js';

const run = promisify(execFile);
const repositories: string[] = [];

async function git(cwd: string, args: string[]): Promise<void> {
  await run('git', args, { cwd, windowsHide: true });
}

async function createConflictedRepository(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), 'semantic-merge-'));
  repositories.push(directory);
  const filePath = path.join(directory, 'carrito.js');

  await git(directory, ['init']);
  await git(directory, ['config', 'user.name', 'Test User']);
  await git(directory, ['config', 'user.email', 'test@example.com']);
  await git(directory, ['checkout', '-b', 'main']);
  await writeFile(filePath, 'function calcularTotal(monto) {\n  return monto;\n}\n');
  await git(directory, ['add', 'carrito.js']);
  await git(directory, ['commit', '-m', 'base implementation']);

  await git(directory, ['checkout', '-b', 'feature']);
  await writeFile(filePath, 'function calcularTotal(monto) {\n  if (monto < 0) throw new Error("invalid");\n  return monto;\n}\n');
  await git(directory, ['commit', '-am', 'add validation']);

  await git(directory, ['checkout', 'main']);
  await writeFile(filePath, 'function calcularTotal(subtotal) {\n  return subtotal;\n}\n');
  await git(directory, ['commit', '-am', 'rename parameter']);

  await expect(run('git', ['merge', 'feature'], { cwd: directory, windowsHide: true })).rejects.toBeDefined();
  return directory;
}

afterEach(async () => {
  await Promise.all(repositories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('GitConflictRepository', () => {
  it('reads Git stages, local commits and a worktree hash', async () => {
    const directory = await createConflictedRepository();
    const repository = new GitConflictRepository(directory);

    const conflict = await repository.getConflict('carrito.js');
    const firstHash = await repository.getFileHash('carrito.js');
    await writeFile(path.join(directory, 'carrito.js'), 'changed by reviewer\n');
    const secondHash = await repository.getFileHash('carrito.js');

    expect(conflict.base).toContain('monto');
    expect(conflict.ours).toContain('subtotal');
    expect(conflict.theirs).toContain('monto < 0');
    expect(conflict.language).toBe('javascript');
    expect(conflict.commits.ours.message).toBe('rename parameter');
    expect(conflict.commits.theirs.message).toBe('add validation');
    expect(firstHash).not.toBe(secondHash);
    expect(conflict.originalHash).toBe(firstHash);
  });

  it('rejects a file without all three conflict stages', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'semantic-merge-clean-'));
    repositories.push(directory);
    await git(directory, ['init']);
    await writeFile(path.join(directory, 'clean.js'), 'export const value = 1;\n');
    const repository = new GitConflictRepository(directory);

    await expect(repository.getConflict('clean.js')).rejects.toThrow('not a supported three-way Git conflict');
  });
});
