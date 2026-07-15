import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { demoAnalysis } from './demoData';
import type { MergeAnalysis } from '../types';

/** Adapter boundary: replace these calls with the MCP app bridge supplied by Integrante 2. */
export interface MergeMcpClient {
  analyze(): Promise<MergeAnalysis>;
  regenerate(sessionId: string): Promise<MergeAnalysis>;
  apply(sessionId: string, code: string): Promise<void>;
}

type BackendAnalysis = {
  conflictId: string;
  conflict: {
    repositoryPath: string; filePath: string; originalHash: string;
    base: string; ours: string; theirs: string;
    commits: Record<'base' | 'ours' | 'theirs', { hash: string; author: string; date: string; message: string }>;
  };
  astChanges: Array<{ branch: 'ours' | 'theirs'; kind: string; summary: string }>;
};
type BackendProposal = { id: string; mergedCode: string; explanation: string; confidence: number; warnings: string[] };

const endpoint = import.meta.env.VITE_MCP_URL as string | undefined;
let clientPromise: Promise<Client> | undefined;
const analyses = new Map<string, BackendAnalysis>();
const proposals = new Map<string, string>();

async function client() {
  if (!endpoint) throw new Error('VITE_MCP_URL is not configured.');
  clientPromise ??= (async () => {
    const value = new Client({ name: 'semantic-merge-panel', version: '0.1.0' });
    await value.connect(new StreamableHTTPClientTransport(new URL(endpoint)));
    return value;
  })();
  return clientPromise;
}

async function tool<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const result = await (await client()).callTool({ name, arguments: args });
  if (!('content' in result)) throw new Error('The merge service returned an unsupported tool response.');
  const content = result.content as Array<{ type: string; text?: string }>;
  if (result.isError) throw new Error(text(content) ?? 'The merge service rejected the request.');
  const value = text(content);
  if (!value) throw new Error('The merge service returned an empty response.');
  return JSON.parse(value) as T;
}

function text(content: Array<{ type: string; text?: string }>) {
  return content.find((item) => item.type === 'text')?.text;
}

function toPanel(analysis: BackendAnalysis, proposal: BackendProposal): MergeAnalysis {
  proposals.set(analysis.conflictId, proposal.id);
  return {
    sessionId: analysis.conflictId,
    proposalId: proposal.id,
    repository: analysis.conflict.repositoryPath,
    filePath: analysis.conflict.filePath,
    fileHash: analysis.conflict.originalHash,
    commits: (['base', 'ours', 'theirs'] as const).map((label) => ({ label, ...analysis.conflict.commits[label] })),
    versions: { base: analysis.conflict.base, ours: analysis.conflict.ours, theirs: analysis.conflict.theirs },
    astChanges: analysis.astChanges.map((change) => ({ branch: change.branch, kind: change.kind === 'rename' ? 'renamed' : 'added', title: change.kind, detail: change.summary })),
    proposal: proposal.mergedCode,
    explanation: proposal.explanation,
    confidence: Math.round(proposal.confidence * 100),
    warnings: proposal.warnings
  };
}

export const mergeMcpClient: MergeMcpClient = {
  async analyze() {
    if (!endpoint) return demoAnalysis;
    const analysis = await tool<BackendAnalysis>('analyze_conflict', { repositoryPath: 'demo://semantic-merge', filePath: 'src/services/payment.ts' });
    const proposal = await tool<BackendProposal>('generate_merge_proposal', { conflictId: analysis.conflictId });
    analyses.set(analysis.conflictId, analysis);
    return toPanel(analysis, proposal);
  },
  async regenerate(sessionId) {
    if (!endpoint) return { ...demoAnalysis, confidence: 91, sessionId: `${demoAnalysis.sessionId}-regenerated` };
    const analysis = analyses.get(sessionId);
    if (!analysis) throw new Error('The review session expired. Analyze the conflict again.');
    const proposal = await tool<BackendProposal>('generate_merge_proposal', { conflictId: sessionId });
    return toPanel(analysis, proposal);
  },
  async apply(sessionId, code) {
    if (!endpoint) return;
    if (!analyses.has(sessionId)) throw new Error('The review session expired. Analyze the conflict again.');
    const proposalId = proposals.get(sessionId);
    if (!proposalId) throw new Error('No proposal is available for this review session.');
    await tool('apply_approved_merge', { conflictId: sessionId, proposalId, mergedCode: code });
  }
};
