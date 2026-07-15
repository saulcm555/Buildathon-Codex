import { demoAnalysis } from './demoData';
import type { MergeAnalysis } from '../types';

/** Adapter boundary: replace these calls with the MCP app bridge supplied by Integrante 2. */
export interface MergeMcpClient {
  analyze(): Promise<MergeAnalysis>;
  regenerate(sessionId: string): Promise<MergeAnalysis>;
  apply(sessionId: string, code: string): Promise<void>;
}

export const mergeMcpClient: MergeMcpClient = {
  async analyze() { return demoAnalysis; },
  async regenerate() {
    return { ...demoAnalysis, confidence: 91, sessionId: `${demoAnalysis.sessionId}-regenerated` };
  },
  async apply() {
    // Wired to the semantic_merge.apply_approved_merge MCP tool when the server is available.
  }
};
