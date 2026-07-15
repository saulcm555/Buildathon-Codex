import type { MergeConflict } from "./MergeConflict.js";

export interface AstChange {
  kind: string;
  summary: string;
  location?: string;
}

export interface ConflictAnalysis {
  conflict: MergeConflict;
  astChanges: AstChange[];
}
