import type { CommitInfo } from './CommitInfo.js';

export interface MergeConflict {
  filePath: string;
  baseCode: string;
  oursCode: string;
  theirsCode: string;
  commits: {
    base: CommitInfo;
    ours: CommitInfo;
    theirs: CommitInfo;
  };
}

export interface ConflictRepository {
  getConflict(filePath: string): Promise<MergeConflict>;
  getFileHash(filePath: string): Promise<string>;
}
