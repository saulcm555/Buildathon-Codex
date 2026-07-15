import type { AstChange } from './AstChange.js';
import type { MergeConflict } from './MergeConflict.js';

export interface ConflictAnalysis {
  conflict: MergeConflict;
  astChanges: AstChange[];
}

export type { AstChange } from './AstChange.js';

export interface AstAnalyzer {
  analyze(input: {
    baseCode: string;
    oursCode: string;
    theirsCode: string;
    filePath?: string;
  }): AstChange[];
}
