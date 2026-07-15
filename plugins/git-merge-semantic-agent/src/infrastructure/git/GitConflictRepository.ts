import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { execFile as execFileCallback } from 'node:child_process';

import type { CommitInfo } from '../../domain/CommitInfo.js';
import type { ConflictRepository, MergeConflict } from '../../domain/MergeConflict.js';

const execFile = promisify(execFileCallback);

/** Reads unresolved Git index stages without changing the worktree. */
export class GitConflictRepository implements ConflictRepository {
  constructor(private readonly repositoryRoot: string = process.cwd()) {}

  async getConflict(filePath: string): Promise<MergeConflict> {
    const relativePath = this.toRepositoryPath(filePath);
    await this.assertConflictStages(relativePath);

    const [baseCode, oursCode, theirsCode, base, ours, theirs] = await Promise.all([
      this.readStage(1, relativePath),
      this.readStage(2, relativePath),
      this.readStage(3, relativePath),
      this.getCommitInfo('git merge-base HEAD MERGE_HEAD', true),
      this.getCommitInfo('HEAD'),
      this.getCommitInfo('MERGE_HEAD'),
    ]);

    return {
      filePath: relativePath,
      baseCode,
      oursCode,
      theirsCode,
      commits: { base, ours, theirs },
    };
  }

  async getFileHash(filePath: string): Promise<string> {
    const relativePath = this.toRepositoryPath(filePath);
    const absolutePath = path.resolve(this.repositoryRoot, relativePath);

    try {
      const content = await readFile(absolutePath);
      return createHash('sha256').update(content).digest('hex');
    } catch (error) {
      throw new Error(`Unable to hash "${relativePath}": ${this.errorMessage(error)}`);
    }
  }

  private async assertConflictStages(relativePath: string): Promise<void> {
    const output = await this.git(['ls-files', '-u', '--', relativePath]);
    const stages = new Set(
      output
        .trim()
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => Number(line.split(/\s+/)[2])),
    );

    if (![1, 2, 3].every((stage) => stages.has(stage))) {
      throw new Error(
        `"${relativePath}" is not a supported three-way Git conflict (expected stages 1, 2 and 3).`,
      );
    }
  }

  private async readStage(stage: 1 | 2 | 3, relativePath: string): Promise<string> {
    try {
      return await this.git(['show', `:${stage}:${relativePath}`]);
    } catch (error) {
      throw new Error(
        `Unable to read Git stage ${stage} for "${relativePath}": ${this.errorMessage(error)}`,
      );
    }
  }

  private async getCommitInfo(ref: string, isCommand = false): Promise<CommitInfo> {
    const target = isCommand
      ? (await this.git(['merge-base', 'HEAD', 'MERGE_HEAD'])).trim()
      : ref;
    const output = await this.git(['show', '-s', '--format=%H%x00%an%x00%aI%x00%s', target]);
    const [hash, author, date, message] = output.trimEnd().split('\0');

    if (!hash || !author || !date || message === undefined) {
      throw new Error(`Unable to read commit metadata for "${target}".`);
    }

    return { hash: hash.slice(0, 12), author, date, message };
  }

  private async git(args: string[]): Promise<string> {
    try {
      const { stdout } = await execFile('git', args, {
        cwd: this.repositoryRoot,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
      });
      return stdout;
    } catch (error) {
      throw new Error(`Git command failed: git ${args.join(' ')}. ${this.errorMessage(error)}`);
    }
  }

  private toRepositoryPath(filePath: string): string {
    const absolutePath = path.resolve(this.repositoryRoot, filePath);
    const relativePath = path.relative(this.repositoryRoot, absolutePath);

    if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new Error(`File path must point to a file inside the repository: "${filePath}".`);
    }

    return relativePath.split(path.sep).join('/');
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
