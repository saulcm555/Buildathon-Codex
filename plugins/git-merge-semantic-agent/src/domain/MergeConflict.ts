import type { CommitInfo } from "./CommitInfo.js";

export type SupportedLanguage = "javascript" | "typescript" | "jsx" | "tsx";

export interface MergeConflict {
  repositoryPath: string;
  filePath: string;
  language: SupportedLanguage;
  base: string;
  ours: string;
  theirs: string;
  commits: { base: CommitInfo; ours: CommitInfo; theirs: CommitInfo };
  originalHash: string;
}
