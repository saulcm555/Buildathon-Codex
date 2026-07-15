import { useState } from 'react';
import type { Decision, MergeAnalysis, VersionName } from './types';
import { mergeMcpClient } from './services/mcpClient';
import { recordDecision } from './services/history';

const labels: Record<VersionName, string> = { base: 'Base', ours: 'Tu rama', theirs: 'Su rama' };

export default function App() {
  const [analysis, setAnalysis] = useState<MergeAnalysis | null>(null);
  const [activeVersion, setActiveVersion] = useState<VersionName>('ours');
  const [proposal, setProposal] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function analyze() {
    setBusy(true); setNotice('');
    const result = await mergeMcpClient.analyze();
    setAnalysis(result); setProposal(result.proposal); setBusy(false);
  }
  async function regenerate() {
    if (!analysis) return;
    setBusy(true); const result = await mergeMcpClient.regenerate(analysis.sessionId);
    setAnalysis(result); setProposal(result.proposal); setBusy(false); setNotice('Nueva propuesta generada.');
  }
  async function decide(decision: Decision) {
    if (!analysis) return;
    setBusy(true);
    if (decision === 'accepted') await mergeMcpClient.apply(analysis.sessionId, proposal);
    await recordDecision(analysis, decision, proposal);
    setBusy(false);
    setNotice(decision === 'accepted' ? 'Propuesta aplicada tras tu confirmación.' : decision === 'edited' ? 'Edición guardada para el historial.' : 'Propuesta rechazada; no se modificó ningún archivo.');
  }

  return <main className="shell">
    <header className="topbar">
      <div className="brand"><span className="mark">↯</span><span>Semantic <b>Merge</b></span><small>beta</small></div>
      <div className="secure"><span>●</span> Revisión local y controlada</div>
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
        <div className="actions"><button className="ghost danger" onClick={() => decide('rejected')} disabled={busy}>Rechazar</button><button className="ghost" onClick={() => decide('edited')} disabled={busy}>Guardar edición</button><button className="primary" onClick={() => decide('accepted')} disabled={busy}>Aceptar y aplicar <span>→</span></button></div>
      </section>
      {notice && <div className="toast">✓ {notice}</div>}
    </section>}
  </main>;
}
