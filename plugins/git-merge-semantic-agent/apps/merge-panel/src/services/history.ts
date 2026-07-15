import type { Decision, MergeAnalysis } from '../types';
import { getSupabaseClient } from './supabase';

export async function persistAnalysis(analysis: MergeAnalysis): Promise<MergeAnalysis> {
  const supabase = getSupabaseClient();
  if (!supabase || analysis.sessionId === 'demo-session') return analysis;

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return analysis;

  let databaseSessionId = analysis.databaseSessionId;
  if (!databaseSessionId) {
    const base = analysis.commits.find((commit) => commit.label === 'base')?.hash ?? null;
    const ours = analysis.commits.find((commit) => commit.label === 'ours')?.hash ?? null;
    const theirs = analysis.commits.find((commit) => commit.label === 'theirs')?.hash ?? null;
    const { data, error } = await supabase.from('merge_sessions').insert({
      user_id: user.id,
      repository_hash: await sha256(analysis.repository),
      file_path: analysis.filePath,
      base_sha: base,
      ours_sha: ours,
      theirs_sha: theirs,
      status: 'proposed'
    }).select('id').single();
    if (error) throw error;
    databaseSessionId = data.id;
  }

  const { error: proposalError } = await supabase.from('merge_proposals').insert({
    session_id: databaseSessionId,
    provider: 'mcp',
    confidence: analysis.confidence,
    warnings: analysis.warnings,
    proposal_hash: await sha256(analysis.proposal),
    validation_status: 'valid'
  });
  if (proposalError) throw proposalError;

  return { ...analysis, databaseSessionId };
}

export async function recordDecision(analysis: MergeAnalysis, decision: Decision, code: string) {
  const supabase = getSupabaseClient();
  if (!supabase || !analysis.databaseSessionId) return;

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return;

  const { error: decisionError } = await supabase.from('merge_decisions').insert({
    session_id: analysis.databaseSessionId,
    user_id: user.id,
    decision,
    final_code_hash: await sha256(code)
  });
  if (decisionError) throw decisionError;

  const status = decision === 'accepted' ? 'accepted' : decision === 'rejected' ? 'rejected' : 'proposed';
  const { error: sessionError } = await supabase
    .from('merge_sessions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', analysis.databaseSessionId);
  if (sessionError) throw sessionError;
}

export async function sendMagicLink(email: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Configura Supabase antes de iniciar sesión.');
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin }
  });
  if (error) throw error;
}

export async function getAuthenticatedEmail() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email ?? null;
}

export async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
