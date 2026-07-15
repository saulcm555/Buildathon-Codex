import { createClient } from '@supabase/supabase-js';
import type { Decision, MergeAnalysis } from '../types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const supabase = url && key ? createClient(url, key) : null;

export async function recordDecision(analysis: MergeAnalysis, decision: Decision, code: string) {
  if (!supabase || analysis.sessionId === 'demo-session') return;
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return;
  await supabase.from('merge_decisions').insert({
    session_id: analysis.sessionId,
    user_id: user.user.id,
    decision,
    final_code_hash: await sha256(code)
  });
  await supabase.from('merge_sessions').update({ status: decision }).eq('id', analysis.sessionId);
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
