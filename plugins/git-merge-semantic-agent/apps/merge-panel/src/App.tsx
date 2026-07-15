import { useEffect, useState } from 'react';
import type { Decision, MergeAnalysis, VersionName } from './types';
import { mergeMcpClient } from './services/mcpClient';
import { getAuthenticatedEmail, persistAnalysis, recordDecision, sendMagicLink } from './services/history';
import { isSupabaseConfigured } from './services/supabase';

const labels: Record<VersionName, string> = { base: 'Base', ours: 'Tu rama', theirs: 'Su rama' };

export default function App() {
  const [analysis, setAnalysis] = useState<MergeAnalysis | null>(null);
  const [activeVersion, setActiveVersion] = useState<VersionName>('ours');
  const [proposal, setProposal] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [email, setEmail] = useState('');
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => { void getAuthenticatedEmail().then(setAccount); }, []);

  async function analyze() {
    setBusy(true); setNotice('');
    try {
      const result = await mergeMcpClient.analyze();
      const persisted = await persistAnalysis(result);
      setAnalysis(persisted); setProposal(persisted.proposal);
    } catch (error) { setNotice(errorMessage(error)); } finally { setBusy(false); }
  }
  async function regenerate() {
    if (!analysis) return;
    setBusy(true);
    try {
      const result = await mergeMcpClient.regenerate(analysis.sessionId);
      const persisted = await persistAnalysis({ ...result, databaseSessionId: analysis.databaseSessionId });
      setAnalysis(persisted); setProposal(persisted.proposal); setNotice('Nueva propuesta generada.');
    } catch (error) { setNotice(errorMessage(error)); } finally { setBusy(false); }
  }
  async function decide(decision: Decision) {
    if (!analysis) return;
    setBusy(true);
    try {
      if (decision === 'accepted') await mergeMcpClient.apply(analysis.sessionId, proposal);
      await recordDecision(analysis, decision, proposal);
      setNotice(decision === 'accepted' ? 'Propuesta validada. La demo pública no modifica archivos ni GitHub.' : decision === 'edited' ? 'Edición guardada para el historial.' : 'Propuesta rechazada; no se modificó ningún archivo.');
    } catch (error) { setNotice(errorMessage(error)); } finally { setBusy(false); }
  }

  async function login() {
    try { setBusy(true); await sendMagicLink(email); setNotice('Revisa tu correo para confirmar el acceso al historial.'); }
    catch (error) { setNotice(errorMessage(error)); } finally { setBusy(false); }
  }

  return <main className="shell">
    <header className="topbar">
      <div className="brand"><span className="mark">↯</span><span>Semantic <b>Merge</b></span><small>beta</small></div>
      <div className="secure">{account ? <><span>●</span> Historial: {account}</> : isSupabaseConfigured() ? <form onSubmit={(event) => { event.preventDefault(); void login(); }}><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@email.com" required /><button disabled={busy}>Guardar historial</button></form> : <><span>●</span> Revisión local y controlada</>}</div>
    </header>
    {!analysis ? <section className="hero">
      <p className="eyebrow">GIT CONFLICT INTELLIGENCE</p><h1>Un merge claro,<br /><em>sin perder contexto.</em></h1>
      <p>Compara las tres versiones, entiende los cambios y decide siempre tú.</p>
      <button className="primary large" onClick={analyze} disabled={busy}>{busy ? 'Analizando…' : 'Analizar conflicto'} <span>→</span></button>
      <div className="hero-cards"><div><b>3</b><span>versiones<br />comparadas</span></div><div><b>AST</b><span>cambios<br />semánticos</span></div><div><b>100%</b><span>decisión<br />humana</span></div></div>
    </section> : <section className="workspace">
      <div className="context"><div><p className="eyebrow">{analysis.repository}</p><h1>{analysis.filePath}</h1><p className="muted">Hash de revisión <code>{analysis.fileHash}</code> · se comprobará antes de aplicar</p></div><div className="confidence"><span>Confianza IA</span><b>{analysis.confidence}%</b><i><u style={{ width: `${analysis.confidence}%` }} /></i></div></div>
      <div className="commits">{analysis.commits.map((commit) => <article key={commit.label}><span className={`dot ${commit.label}`} /><div><strong>{labels[commit.label]}</strong><code>{commit.hash}</code><p>{commit.message}</p></div><small>{commit.author} · {commit.date}</small></article>)}</div>
      <div className="grid">
        <section className="card source"><div className="card-head"><div><p className="eyebrow">VERSIONES EN CONFLICTO</p><h2>Contexto del código</h2></div><div className="tabs">{(['base','ours','theirs'] as VersionName[]).map((version) => <button key={version} className={activeVersion === version ? 'active' : ''} onClick={() => setActiveVersion(version)}>{labels[version]}</button>)}</div></div><pre>{analysis.versions[activeVersion]}</pre></section>
        <section className="card changes"><p className="eyebrow">LECTURA SEMÁNTICA</p><h2>Cambios detectados</h2>{analysis.astChanges.map((change) => <div className="change" key={change.title}><span className={change.branch}>{change.branch === 'ours' ? 'TÚ' : 'ELLOS'}</span><div><strong>{change.title}</strong><p>{change.detail}</p></div></div>)}</section>
      </div>
      <section className="proposal card"><div className="proposal-title"><div><p className="eyebrow">PROPUESTA DE FUSIÓN</p><h2>Una solución que conserva ambos cambios</h2></div><button className="ghost" onClick={regenerate} disabled={busy}>↻ Nueva propuesta</button></div><p className="explanation">{analysis.explanation}</p><textarea value={proposal} onChange={(event) => setProposal(event.target.value)} spellCheck="false" aria-label="Código de la propuesta" />
        {analysis.warnings.map((warning) => <p className="warning" key={warning}>! {warning}</p>)}
        <div className="actions"><button className="ghost danger" onClick={() => decide('rejected')} disabled={busy}>Rechazar</button><button className="ghost" onClick={() => decide('edited')} disabled={busy}>Guardar edición</button><button className="primary" onClick={() => decide('accepted')} disabled={busy}>Validar propuesta (demo) <span>→</span></button></div>
      </section>
      {notice && <div className="toast">✓ {notice}</div>}
    </section>}
  </main>;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'No se pudo completar la operación.';
}
