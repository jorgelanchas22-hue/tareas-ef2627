/* ===== Mejoras del panel (nov 2026) =====
   1) Paneles de IA ocultos: la corrección la hace Claude cada hora. "Modo manual" los vuelve a mostrar.
   2) Botón "Aceptar todas las propuestas" del grupo (con confirmación).
   3) Aviso ⚠ de posible copia IA, guardado en alertas_ia_ef (solo lectura del profesor).
   4) Nota por criterio visible en cada propuesta. */
(function () {
  'use strict';
  const YEAR = '2026-2027', LS = 'efModoManualIA';
  let alerts = {};

  /* ---------- Estilos ---------- */
  const css = document.createElement('style');
  css.textContent = `
body.ef-auto #openAIPrep, body.ef-auto #openProposals, body.ef-auto #aiPrep, body.ef-auto #proposalImport{display:none!important}
.crit-rows{margin:8px 0 2px;display:grid;gap:4px}
.crit-row{display:flex;justify-content:space-between;gap:8px;align-items:baseline;border:1px solid #c9d8f5;background:#fff;padding:5px 8px;font-size:12px}
.crit-row b{color:#174ea6;font-size:15px;white-space:nowrap}
.ia-alert{margin:8px 0;border:2px solid #a16207;background:#fff8e6;padding:7px 9px;font-size:12px;line-height:1.4}
.ia-alert button{margin-top:5px;border:1px solid #a16207;background:#fff;padding:3px 7px;font-size:11px;cursor:pointer}
.auto-chip{display:inline-block;margin-left:6px;font-size:10px;font-weight:800;color:#137a4a;border:1px solid #137a4a;padding:1px 5px;vertical-align:middle}
#manualIA{background:none;border:none;color:#666;text-decoration:underline;cursor:pointer;font-size:12px;padding:0 4px}`;
  document.head.appendChild(css);

  /* ---------- 1) Ocultar paneles de IA (modo manual opcional) ---------- */
  const manual = () => { try { return localStorage.getItem(LS) === 'on'; } catch (e) { return false; } };
  function applyMode() {
    document.body.classList.toggle('ef-auto', !manual());
    const b = D('manualIA');
    if (b) b.textContent = manual() ? 'Ocultar modo manual' : 'Modo manual de IA';
  }
  const bar = D('openBuzon').parentNode;
  const accept = document.createElement('button');
  accept.id = 'acceptAll'; accept.className = 'btn alt'; accept.textContent = '✅ Aceptar todas las propuestas';
  bar.insertBefore(accept, D('openBuzon'));
  const mbtn = document.createElement('button');
  mbtn.id = 'manualIA'; mbtn.type = 'button';
  bar.appendChild(mbtn);
  mbtn.onclick = () => { try { localStorage.setItem(LS, manual() ? 'off' : 'on'); } catch (e) {} applyMode(); };
  applyMode();

  /* ---------- 2) Aceptar todas las propuestas del grupo ---------- */
  accept.onclick = async () => {
    const c = D('course').value, g = D('group').value, tasks = c === '2ESO' ? T2 : T4;
    const list = [];
    roster.forEach(n => tasks.forEach(t => {
      const s = grades?.[gk(g, n)]?.[t.id];
      if (s && s.notaPropuesta != null && s.notaFinal == null) list.push({ n, t, s });
    }));
    if (!list.length) { alert('No hay propuestas pendientes de aceptar en ' + g + '.'); return; }
    const byT = {};
    list.forEach(x => byT[x.t.label] = (byT[x.t.label] || 0) + 1);
    const warn = list.filter(x => alerts?.[c]?.[g]?.[gk(g, x.n)]?.[x.t.id]).length;
    const ok = list.length - warn;
    if (!ok) { alert('Las ' + list.length + ' propuestas pendientes tienen aviso de posible copia IA: revísalas a mano.'); return; }
    const txt = `Vas a aceptar ${ok} propuesta${ok > 1 ? 's' : ''} de ${g} como nota final (visible para el alumnado):\n\n` +
      Object.entries(byT).map(([k, v]) => `· ${k}: ${v}`).join('\n') + (warn ? ' (contando las que tienen aviso)' : '') +
      (warn ? `\n\n⚠ ${warn} tiene${warn > 1 ? 'n' : ''} aviso de posible copia IA y NO se aceptará${warn > 1 ? 'n' : ''}: revísala${warn > 1 ? 's' : ''} a mano.` : '') +
      '\n\n¿Continuar?';
    if (!confirm(txt)) return;
    const updates = {}, now = Date.now();
    let k = 0;
    list.forEach(({ n, t, s }) => {
      if (alerts?.[c]?.[g]?.[gk(g, n)]?.[t.id]) return;
      const base = gk(g, n) + '/' + t.id + '/';
      updates[base + 'notaFinal'] = s.notaPropuesta;
      updates[base + 'visibleAlumno'] = true;
      updates[base + 'estadoCorreccion'] = 'validada';
      updates[base + 'tarea'] = t.label;
      updates[base + 'criterios'] = t.cr.map(x => 'EFI.' + x);
      updates[base + 'updatedAt'] = now;
      k++;
    });
    if (!k) { alert('No se ha aceptado ninguna (todas tenían aviso).'); return; }
    accept.disabled = true;
    try {
      await db.ref(`calificaciones_criterios_ef/${YEAR}/${c}/${g}`).update(updates);
      await loadEval();
      checkPending();
      alert(`✓ ${k} nota${k > 1 ? 's' : ''} final${k > 1 ? 'es' : ''} guardada${k > 1 ? 's' : ''}.`);
    } catch (e) { alert('No se pudo guardar: ' + (e.message || e)); }
    finally { accept.disabled = false; }
  };

  /* ---------- 3) Avisos de posible copia IA ---------- */
  db.ref('alertas_ia_ef/' + YEAR).on('value', snap => {
    alerts = snap.val() || {};
    if (D('evalPanel').classList.contains('on') && roster.length) render();
  }, () => { alerts = {}; });

  window.efDismissAlert = async (c, g, key, tid) => {
    if (!confirm('¿Quitar el aviso de posible copia IA?')) return;
    try { await db.ref(`alertas_ia_ef/${YEAR}/${c}/${g}/${key}/${tid}`).remove(); } catch (e) { alert('No se pudo quitar el aviso.'); }
  };

  // Al registrar propuestas, si traen "alertaIA" se guarda aparte (el alumno no puede leerlo).
  const origSave = D('saveProposals').onclick;
  D('saveProposals').onclick = async function () {
    const withAlert = (pendingProposals || []).filter(p => typeof p.alertaIA === 'string' && p.alertaIA.trim()).map(p => ({ key: p.key, texto: p.alertaIA.trim() }));
    await origSave.call(this);
    if (withAlert.length && /✓/.test(D('proposalMsg').textContent)) {
      const up = {}, now = Date.now();
      withAlert.forEach(a => { up[a.key] = { texto: a.texto, at: now }; });
      try { await db.ref('alertas_ia_ef/' + YEAR).update(up); D('proposalMsg').textContent += ` · ⚠ ${withAlert.length} aviso(s) de posible copia IA.`; }
      catch (e) { D('proposalMsg').textContent += ' · No se pudieron guardar los avisos.'; }
    }
  };

  /* ---------- 4) Nota por criterio en la propuesta ---------- */
  const RX = /EFI\.(\d+\.\d+\.\d+)\s*:\s*(\d+(?:[.,]\d)?)/g;
  function parseCrit(m) {
    const out = []; let x;
    RX.lastIndex = 0;
    while ((x = RX.exec(m || ''))) out.push({ c: x[1], v: x[2].replace('.', ',') });
    return out;
  }
  function stripCrit(m) {
    return String(m || '').replace(/^\s*(?:EFI\.\d+\.\d+\.\d+\s*:\s*\d+(?:[.,]\d)?\s*[·|,;]?\s*)+\.?\s*/, '').trim() || m;
  }
  proposalHTML = function (s) {
    if (s.notaPropuesta === null || s.notaPropuesta === undefined) return `<div class="box proposal"><h4>Propuesta de calificación</h4><div class="pending">Pendiente de propuesta</div></div>`;
    const cr = parseCrit(s.motivoPropuesta);
    const rows = cr.length ? `<div class="crit-rows">${cr.map(x => `<div class="crit-row"><span>EFI.${x.c}${C[x.c] ? ' · ' + esc(C[x.c]) : ''}</span><b>${x.v}</b></div>`).join('')}</div>` : '';
    const auto = /claude|ia automática/i.test(s.origenPropuesta || '') || s.origenPropuesta === 'Corrección revisada e importada' ? '<span class="auto-chip">🤖 Claude</span>' : '';
    return `<div class="box proposal"><h4>Propuesta de calificación${auto}</h4><div class="big">${String(s.notaPropuesta).replace('.', ',')} / 10</div>${rows}<div class="label">Motivo</div><div class="text">${esc(cr.length ? stripCrit(s.motivoPropuesta) : (s.motivoPropuesta || 'Sin explicación disponible.'))}</div><div class="label">Qué debe mejorar</div><div class="text">${esc(s.mejora || 'Sin indicaciones adicionales.')}</div></div>`;
  };

  const origBox = correctionBox;
  correctionBox = function (t, g, n) {
    let h = origBox(t, g, n);
    const c = D('course').value, key = gk(g, n), a = alerts?.[c]?.[g]?.[key]?.[t.id];
    if (a) {
      const box = `<div class="ia-alert"><b>⚠ Posible copia de IA</b> · solo lo ves tú<br>${esc(a.texto || '')}<br><button onclick="efDismissAlert('${c}','${g}','${key}','${t.id}')">Quitar aviso</button></div>`;
      h = h.replace('<div class="box final">', box + '<div class="box final">');
    }
    return h;
  };

  if (roster.length) render();
})();
