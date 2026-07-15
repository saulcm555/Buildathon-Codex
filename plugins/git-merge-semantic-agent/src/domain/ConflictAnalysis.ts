import type { AstChange } from './AstChange.js';
import type { MergeConflict } from './MergeConflict.js';

export interface ConflictAnalysis extends MergeConflict {
  astChanges: AstChange[];
  fileHash: string;
}

export interface AstAnalyzer {
  analyze(input: {
    baseCode: string;
    oursCode: string;
    theirsCode: string;
    filePath?: string;
  }): AstChange[];
}
