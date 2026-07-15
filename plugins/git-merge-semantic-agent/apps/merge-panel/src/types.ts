export type VersionName = 'base' | 'ours' | 'theirs';
export type Decision = 'accepted' | 'rejected' | 'edited';

export interface CommitInfo {
  label: VersionName;
  hash: string;
  author: string;
  date: string;
  message: string;
}

export interface AstChange {
  branch: 'ours' | 'theirs';
  kind: 'added' | 'changed' | 'renamed';
  title: string;
  detail: string;
}

export interface MergeAnalysis {
  sessionId: string;
  repository: string;
  filePath: string;
  fileHash: string;
  commits: CommitInfo[];
  versions: Record<VersionName, string>;
  astChanges: AstChange[];
  proposal: string;
  explanation: string;
  confidence: number;
  warnings: string[];
}
