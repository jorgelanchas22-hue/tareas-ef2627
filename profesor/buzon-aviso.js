/* ===== Aviso del Buzón de notas Qe en el panel =====
   Lee las notas pendientes de meter en Qe (doGet del Buzón, con la URL y la clave ya guardadas
   en «Enviar al Buzón Qe») y las enseña agrupadas por grupo y actividad. Solo lectura. */
(function () {
  'use strict';
  const box = document.createElement('div');
  box.id = 'buzonAviso';
  box.style.cssText = 'margin:8px 0;font-size:13px;border:2px solid #174ea6;background:#f2f6ff;padding:8px 10px';
  box.innerHTML = '<b>📬 Buzón de notas Qe</b> <span id="bzAvMsg">comprobando…</span> <button id="bzAvVer" class="save" style="display:none">Ver lista</button> <button id="bzAvRef" class="save">Actualizar</button><div id="bzAvList" style="display:none;margin-top:8px"></div>';
  D('summary').parentNode.insertBefore(box, D('summary'));
  D('bzAvVer').onclick = () => { const l = D('bzAvList'); const on = l.style.display === 'none'; l.style.display = on ? '' : 'none'; D('bzAvVer').textContent = on ? 'Ocultar' : 'Ver lista'; };
  D('bzAvRef').onclick = () => load();

  const cfg = () => { try { return JSON.parse(localStorage.getItem('efBuzonQe') || '{}') || {}; } catch (e) { return {}; } };
  const f = x => (Math.round(Number(x) * 10) / 10).toString().replace('.', ',');

  async function load() {
    const s = cfg();
    if (!s.url || !s.token) { D('bzAvMsg').innerHTML = 'sin conectar: configúralo una vez en «📤 Enviar al Buzón Qe».'; return; }
    D('bzAvMsg').textContent = 'comprobando…';
    try {
      const r = await fetch(s.url + '?token=' + encodeURIComponent(s.token));
      const j = await r.json();
      if (!j.ok) throw new Error(j.error === 'token' ? 'la clave no es correcta' : (j.error || 'respuesta no válida'));
      const p = (j.pendientes || []).filter(x => x && x.alumno);
      const rev = j.ultimaRevision ? new Date(j.ultimaRevision).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
      if (!p.length) { D('bzAvMsg').innerHTML = '<span style="color:#137a4a">✓ nada pendiente de meter en Qe</span> · última revisión ' + rev; D('bzAvVer').style.display = 'none'; D('bzAvList').style.display = 'none'; return; }
      const byG = {};
      p.forEach(x => { const k = (x.grupoQe || '¿grupo?') + ' · ' + (x.actividadQe || '¿actividad?') + (x.criterios ? ' (' + x.criterios + ')' : ''); (byG[k] = byG[k] || []).push(x); });
      D('bzAvMsg').innerHTML = `<b>${p.length}</b> nota${p.length > 1 ? 's' : ''} pendiente${p.length > 1 ? 's' : ''} de meter en Qe` + ' · última revisión ' + rev + ' · se meten con la extensión «Notas a Qe»';
      D('bzAvVer').style.display = '';
      D('bzAvList').innerHTML = Object.keys(byG).sort().map(k => `<div style="margin:6px 0"><b>${esc(k)}</b> <span style="color:#666">(${byG[k].length})</span><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">${byG[k].sort((a, b) => String(a.alumno).localeCompare(String(b.alumno), 'es')).map(x => `<span class="chip" title="${esc(x.origen || '')}">${esc(x.alumno)} · <b>${f(x.nota10)}</b></span>`).join('')}</div></div>`).join('');
    } catch (e) {
      D('bzAvMsg').textContent = 'no se pudo leer el Buzón (' + (e.message || e) + ').';
    }
  }
  window.efBuzonAviso = load;
  firebase.auth().onAuthStateChanged(u => { if (u) setTimeout(load, 2000); });
  setInterval(() => { if (!document.hidden) load(); }, 900000);
})();
