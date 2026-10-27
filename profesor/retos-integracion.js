/* =====================================================================
   RETOS EF · Integración en la Zona Profesor de Tareas EF (2026-2027)
   ---------------------------------------------------------------------
   - Solo LECTURA del proyecto Firebase de Retos EF (no escribe nada).
   - La configuración de Firebase, el listado de retos y el cálculo de
     la nota se leen en directo de la propia app de Retos EF
     (/retos-ef/), así que si cambias retos o rúbrica allí, aquí se
     actualiza solo.
   - Añade: pestaña "Retos EF", columna en Evaluación (+ CSV) y
     columna en Actividad de alumnos.
   ===================================================================== */
(function(){
  'use strict';
  const RETOS_URL = '../../retos-ef/';
  const APP_LINK  = 'https://jorgelanchas22-hue.github.io/retos-ef/';
  const $ = id => document.getElementById(id);

  const R = {
    ready:false, error:'', data:{}, rubrica:{umbral10:10, umbral6:5, umbralEvid10:5},
    trimestreActivo:1, RETOS:[], calc:null, index:new Map()
  };

  /* ---------- utilidades ---------- */
  const escH = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const norm = s => String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
                    .replace(/[^a-z0-9ñ ]+/g,' ').replace(/\s+/g,' ').trim();
  const tokens = s => norm(s).split(' ').filter(Boolean).sort().join(' ');
  const splitGroup = g => ({curso: g.startsWith('2') ? '2ESO' : '4ESO', clase: g.slice(1).toUpperCase()});

  function hace(iso){
    if(!iso) return '';
    const d = (Date.now() - new Date(iso).getTime())/86400000;
    if(isNaN(d)) return '';
    if(d < 1) return 'hoy';
    if(d < 2) return 'ayer';
    return 'hace ' + Math.floor(d) + ' d';
  }

  /* Extrae una función por su nombre contando llaves */
  function extractFn(src, name){
    const i = src.search(new RegExp('function\\s+' + name + '\\s*\\('));
    if(i < 0) throw new Error('No encuentro ' + name);
    let j = src.indexOf('{', i), depth = 0;
    for(; j < src.length; j++){
      const ch = src[j];
      if(ch === '{') depth++;
      else if(ch === '}'){ depth--; if(depth === 0) return src.slice(i, j+1); }
    }
    throw new Error('Función incompleta: ' + name);
  }
  function extractObj(src, marker){
    const i = src.indexOf(marker);
    if(i < 0) throw new Error('No encuentro ' + marker);
    let j = src.indexOf('{', i), depth = 0;
    for(; j < src.length; j++){
      if(src[j] === '{') depth++;
      else if(src[j] === '}'){ depth--; if(depth === 0) return src.slice(src.indexOf('{', i), j+1); }
    }
    throw new Error('Objeto incompleto: ' + marker);
  }

  /* ---------- carga del código de Retos EF ---------- */
  async function loadRetosCode(){
    const html = await fetch(RETOS_URL, {cache:'no-store'}).then(r => { if(!r.ok) throw new Error('HTTP ' + r.status); return r.text(); });
    const a = html.search(/const\s+RETOS_ANTERIORES\s*=/);
    const b = html.search(/const\s+CATEGORIAS\s*=/);
    if(a < 0 || b < 0) throw new Error('No encuentro el listado de retos');
    const retosCode = html.slice(a, b);
    const cfgCode = extractObj(html, 'FIREBASE_CONFIG');
    const code = retosCode + '\n' + extractFn(html, 'redondearNotaDiscreta') + '\n' + extractFn(html, 'calcularNotaAlumno') +
      '\nreturn {RETOS, calcularNotaAlumno, cfg:' + cfgCode + '};';
    return (new Function(code))();
  }

  /* ---------- índice alumno -> datos ---------- */
  function rebuildIndex(){
    R.index = new Map();
    Object.values(R.data || {}).forEach(a => {
      if(!a || !a.info || !a.info.nombre) return;
      const k = (a.info.curso||'') + '|' + String(a.info.clase||'').toUpperCase();
      R.index.set(k + '|' + norm(a.info.nombre), a);
      R.index.set(k + '|t|' + tokens(a.info.nombre), a);
    });
  }
  function findAlumno(group, nombre){
    const {curso, clase} = splitGroup(group);
    const k = curso + '|' + clase;
    return R.index.get(k + '|' + norm(nombre)) || R.index.get(k + '|t|' + tokens(nombre)) || null;
  }

  /* ---------- resumen por alumno y trimestre ---------- */
  function resumen(a, t){
    const out = {elegidos:0, completados:0, validados:0, conEvidencia:0, puntos:0, c1:0, c2:0, nota:null, ultima:'', propiosPend:0};
    if(!a) return out;
    const retos = a.retos || {};
    Object.keys(retos).forEach(id => {
      const def = R.RETOS.find(x => x.id == id);
      if(!def || def.trimestre !== t) return;
      const d = retos[id] || {};
      out.elegidos++;
      if(d.validadoProfe) out.validados++;
      else if(d.estado === 'completado') out.completados++;
      if(d.fecha && d.fecha > out.ultima) out.ultima = d.fecha;
    });
    Object.values(a.propios || {}).forEach(p => {
      if(!p || p.trimestre !== t) return;
      if(p.estadoAprobacion === 'aprobado'){
        out.elegidos++;
        if(p.validadoProfe) out.validados++;
        else if(p.estado === 'completado') out.completados++;
      } else if(p.estadoAprobacion !== 'rechazado') out.propiosPend++;
      if(p.fecha && p.fecha > out.ultima) out.ultima = p.fecha;
    });
    const r = R.rubrica;
    const n = R.calc({retos:a.retos||{}, propios:a.propios||{}}, t, r.umbral10, r.umbral6, r.umbralEvid10);
    out.puntos = n.puntosAcum; out.conEvidencia = n.conEvidencia; out.c1 = n.c1; out.c2 = n.c2;
    out.nota = out.elegidos || n.nValidados ? n.notaFinal : null;
    return out;
  }
  function ultimaActividad(a){
    let u = '';
    if(!a) return u;
    [...Object.values(a.retos||{}), ...Object.values(a.propios||{})].forEach(d => { if(d && d.fecha && d.fecha > u) u = d.fecha; });
    return u;
  }
  const notaBadge = n => n === null
    ? '<span style="color:#999">—</span>'
    : `<b style="color:${n >= 5 ? 'var(--green,#137a4a)' : 'var(--r,#dc0614)'}">${n}</b>`;

  const LOGIN_BTN  = '<button class="btn" onclick="conectarRetosEF()">🔐 Conectar con Retos EF</button>';
  const LOGIN_LINK = '<a href="#" onclick="conectarRetosEF();return false" style="font-weight:700;color:#dc0614">Conectar Retos</a>';

  /* ---------- estilos ---------- */
  const st = document.createElement('style');
  st.textContent = `
    .rx-cell{white-space:nowrap}
    .rx-tri{display:inline-block;border:1px solid var(--line,#ddd);padding:2px 6px;margin:1px 2px 1px 0;background:#fafafa}
    .rx-tri small{color:#666;margin-right:3px}
    .rx-head{background:#dc0614!important;color:#fff!important}
    #retosPanel table{min-width:1000px}
    #retosPanel .rx-pend{color:var(--amber,#a16207);font-weight:700}
    .rx-msg{margin:8px 0;color:#666}`;
  document.head.appendChild(st);

  /* ---------- pestaña Retos EF ---------- */
  function buildPanel(){
    const tabLists = $('tabLists');
    if(!tabLists || $('tabRetos')) return;
    const btn = document.createElement('button');
    btn.id = 'tabRetos'; btn.textContent = '🏃 Retos EF';
    tabLists.insertAdjacentElement('afterend', btn);

    const sec = document.createElement('section');
    sec.id = 'retosPanel'; sec.className = 'panel';
    sec.innerHTML = `
      <h2>Retos EF</h2>
      <div class="notice">Datos de la app <a href="${APP_LINK}" target="_blank" rel="noopener"><b>Retos EF</b></a> en solo lectura.
        Para validar retos o cambiar la rúbrica, hazlo en la propia app. Cada trimestre de retos corresponde a su evaluación.</div>
      <div class="toolbar">
        <div><label>Curso</label><select id="rxCourse"><option value="2ESO">2.º ESO</option><option value="4ESO">4.º ESO</option></select></div>
        <div><label>Grupo</label><select id="rxGroup"></select></div>
        <div><label>Trimestre</label><select id="rxTri"><option value="1">1.er trimestre</option><option value="2">2.º trimestre</option><option value="3">3.er trimestre</option></select></div>
        <button class="btn alt" id="rxCsv">Exportar retos (CSV)</button>
        <a class="btn alt" href="${APP_LINK}" target="_blank" rel="noopener" style="text-decoration:none">Abrir Retos EF ↗</a>
      </div>
      <div id="rxSummary" class="summary"></div>
      <p id="rxMsg" class="rx-msg"></p>
      <div class="tableWrap"><table><thead><tr>
        <th>Alumno</th><th>Retos elegidos</th><th>Completados sin validar</th><th>Validados</th>
        <th>Con evidencia</th><th>Puntos</th><th>Criterio 1</th><th>Criterio 2</th><th>Nota retos</th><th>Última actividad</th>
      </tr></thead><tbody id="rxBody"></tbody></table></div>`;
    const lists = $('listsPanel');
    lists.parentNode.insertBefore(sec, lists.nextSibling);

    const fillGroups = () => {
      const c = $('rxCourse').value, prev = $('rxGroup').value;
      $('rxGroup').innerHTML = (c === '2ESO' ? ['2A','2B','2C'] : ['4A','4B','4C']).map(g => `<option>${g}</option>`).join('');
      if([...$('rxGroup').options].some(o => o.value === prev)) $('rxGroup').value = prev;
    };
    btn.addEventListener('click', () => {
      if(typeof showPanel === 'function') showPanel('retos');
      $('rxCourse').value = $('course').value; fillGroups(); $('rxGroup').value = $('group').value;
      $('rxTri').value = String(R.trimestreActivo || 1);
      sec.classList.add('on'); btn.classList.add('on');
      renderPanel();
    });
    ['tabEval','tabActivity','tabLists'].forEach(id => $(id) && $(id).addEventListener('click', () => {
      sec.classList.remove('on'); btn.classList.remove('on');
    }));
    $('rxCourse').onchange = () => { fillGroups(); renderPanel(); };
    $('rxGroup').onchange = renderPanel;
    $('rxTri').onchange = renderPanel;
    $('rxCsv').onclick = exportPanelCSV;
  }

  function panelRows(){
    const g = $('rxGroup').value, t = +$('rxTri').value;
    const {curso, clase} = splitGroup(g);
    const names = (typeof roster !== 'undefined' && $('group').value === g) ? roster.slice() : [];
    // Añade alumnado que esté en Retos pero no en la lista de Tareas
    Object.values(R.data).forEach(a => {
      if(a && a.info && a.info.curso === curso && String(a.info.clase).toUpperCase() === clase &&
         !names.some(n => norm(n) === norm(a.info.nombre) || tokens(n) === tokens(a.info.nombre))) names.push(a.info.nombre);
    });
    names.sort((x,y) => x.localeCompare(y,'es'));
    return names.map(n => ({n, a:findAlumno(g, n), r:resumen(findAlumno(g, n), t)}));
  }

  function renderPanel(){
    if(!$('retosPanel') || !$('retosPanel').classList.contains('on')) return;
    if(!R.ready){
      if(R.error === 'NEED_LOGIN') $('rxMsg').innerHTML = 'Para ver los retos, conecta una vez tu cuenta del colegio con Retos EF (se queda recordado): ' + LOGIN_BTN;
      else $('rxMsg').textContent = R.error || 'Cargando datos de Retos EF…';
      $('rxBody').innerHTML = ''; $('rxSummary').innerHTML = ''; return;
    }
    const g = $('rxGroup').value;
    if($('group').value !== g){
      // Sincroniza con la lista de clase del panel de tareas
      $('course').value = $('rxCourse').value;
      if(typeof groups === 'function') $('group').innerHTML = groups($('course').value).map(x => `<option>${x}</option>`).join('');
      $('group').value = g;
      if(typeof loadEval === 'function'){ $('rxMsg').textContent = 'Cargando lista de ' + g + '…'; loadEval().then(renderPanel).catch(renderPanel); return; }
    }
    const rows = panelRows();
    const conRetos = rows.filter(x => x.r.elegidos > 0);
    const notas = rows.map(x => x.r.nota).filter(n => n !== null);
    const aprob = notas.filter(n => n >= 5).length;
    const pend = rows.reduce((s,x) => s + x.r.completados, 0);
    const media = notas.length ? (notas.reduce((s,n) => s+n, 0) / notas.length).toFixed(1) : '—';
    $('rxSummary').innerHTML = [
      `<span class="chip"><b>${conRetos.length}</b> de ${rows.length} con retos</span>`,
      `<span class="chip">Nota media: <b>${media}</b></span>`,
      `<span class="chip">Aprobados con retos: <b>${aprob}</b></span>`,
      `<span class="chip ${pend ? 'rx-pend' : ''}">Pendientes de validar: <b>${pend}</b></span>`
    ].join('');
    $('rxMsg').textContent = 'Datos en directo · Trimestre activo en la app: ' + R.trimestreActivo + '.º';
    $('rxBody').innerHTML = rows.map(({n, a, r}) => `<tr>
      <td class="student">${escH(n)}${a ? '' : ' <small style="color:#999">(no ha entrado en Retos)</small>'}</td>
      <td>${r.elegidos || '—'}${r.propiosPend ? ` <small class="rx-pend">+${r.propiosPend} propuesta(s)</small>` : ''}</td>
      <td class="${r.completados ? 'rx-pend' : ''}">${r.completados || '—'}</td>
      <td>${r.validados || '—'}</td><td>${r.conEvidencia || '—'}</td><td>${r.puntos || '—'}</td>
      <td>${r.nota === null ? '—' : r.c1}</td><td>${r.nota === null ? '—' : r.c2}</td>
      <td>${notaBadge(r.nota)}</td><td>${r.ultima ? hace(r.ultima) : '—'}</td></tr>`).join('');
  }

  function downloadCSV(rows, file){
    const txt = rows.map(r => r.map(x => '"' + String(x ?? '').replace(/"/g,'""') + '"').join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + txt], {type:'text/csv'}));
    a.download = file; a.click();
  }
  function exportPanelCSV(){
    if(!R.ready) return;
    const g = $('rxGroup').value, t = $('rxTri').value;
    const rows = [['Alumno','Elegidos','Completados sin validar','Validados','Con evidencia','Puntos','Criterio 1','Criterio 2','Nota retos']];
    panelRows().forEach(({n, r}) => rows.push([n, r.elegidos, r.completados, r.validados, r.conEvidencia, r.puntos,
      r.nota === null ? '' : r.c1, r.nota === null ? '' : r.c2, r.nota === null ? '' : r.nota]));
    downloadCSV(rows, `retos-EF-${g}-T${t}.csv`);
  }

  /* ---------- columna en Evaluación ---------- */
  function augmentEval(){
    const thead = $('thead'), tbody = $('tbody');
    if(!thead || !tbody) return;
    const hr = thead.querySelector('tr');
    if(hr && !hr.querySelector('.rx-head')){
      const th = document.createElement('th'); th.className = 'rx-head'; th.textContent = 'Retos EF · nota por trimestre';
      hr.appendChild(th);
    }
    const g = $('group').value;
    tbody.querySelectorAll(':scope > tr').forEach(tr => {
      const first = tr.querySelector('td.student'); if(!first) return;
      let td = tr.querySelector('td.rx-cell');
      if(!td){ td = document.createElement('td'); td.className = 'rx-cell'; tr.appendChild(td); }
      if(!R.ready){ td.innerHTML = R.error === 'NEED_LOGIN' ? LOGIN_LINK : '<span style="color:#999">…</span>'; return; }
      const a = findAlumno(g, first.textContent.trim());
      td.innerHTML = [1,2,3].map(t => {
        const r = resumen(a, t);
        return `<span class="rx-tri" title="${r.validados} validados · ${r.puntos} puntos"><small>${t}T</small>${notaBadge(r.nota)}</span>`;
      }).join('');
    });
  }

  /* ---------- columna en Actividad ---------- */
  function augmentActivity(){
    const body = $('activityBody');
    if(!body) return;
    const table = body.closest('table');
    const hr = table && table.querySelector('thead tr');
    if(hr && !hr.querySelector('.rx-head')){
      const th = document.createElement('th'); th.className = 'rx-head'; th.textContent = 'Retos EF';
      hr.appendChild(th);
    }
    const g = $('group').value;
    body.querySelectorAll(':scope > tr').forEach(tr => {
      if(tr.children.length < 2) return;
      let td = tr.querySelector('td.rx-cell');
      if(!td){ td = document.createElement('td'); td.className = 'rx-cell'; tr.appendChild(td); }
      if(!R.ready){ td.innerHTML = R.error === 'NEED_LOGIN' ? LOGIN_LINK : '<span style="color:#999">…</span>'; return; }
      const a = findAlumno(g, tr.children[0].textContent.trim());
      if(!a){ td.innerHTML = '<span style="color:#777">No ha entrado</span>'; return; }
      const t = R.trimestreActivo, r = resumen(a, t), u = ultimaActividad(a);
      td.innerHTML = r.elegidos
        ? `${r.elegidos} elegido(s) · <b>${r.validados}</b> validado(s)` +
          (r.completados ? ` · <span style="color:var(--amber,#a16207);font-weight:700">${r.completados} por validar</span>` : '') +
          `<br><small style="color:#666">${t}.er trim. · ${u ? 'última: ' + hace(u) : ''}</small>`
        : `<span style="color:#777">Sin retos en el ${t}.º trim.</span>`;
    });
  }

  /* ---------- CSV de Evaluación con columnas de retos ---------- */
  function patchCSV(){
    const b = $('csv'); if(!b) return;
    b.onclick = () => {
      const c = $('course').value, g = $('group').value, tasks = c === '2ESO' ? T2 : T4;
      const rows = [['Alumno', ...tasks.map(t => t.label), 'Retos 1T', 'Retos 2T', 'Retos 3T']];
      for(const n of roster){
        const a = R.ready ? findAlumno(g, n) : null;
        const rn = [1,2,3].map(t => { if(!R.ready) return ''; const r = resumen(a, t); return r.nota === null ? '' : r.nota; });
        rows.push([n, ...tasks.map(t => grades?.[gk(g,n)]?.[t.id]?.notaFinal ?? ''), ...rn]);
      }
      downloadCSV(rows, `notas-EF-${c}-${g}.csv`);
    };
  }

  /* ---------- observadores ---------- */
  function refreshAll(){ augmentEval(); augmentActivity(); renderPanel(); }
  function observe(){
    const opts = {childList:true};
    ['tbody','thead','activityBody'].forEach(id => {
      const el = $(id); if(!el) return;
      new MutationObserver(() => { id === 'activityBody' ? augmentActivity() : augmentEval(); }).observe(el, opts);
    });
  }

  /* ---------- arranque ---------- */
  async function init(){
    buildPanel(); patchCSV(); observe(); refreshAll();
    try{
      const mod = await loadRetosCode();
      R.RETOS = mod.RETOS; R.calc = mod.calcularNotaAlumno;
      const app = firebase.apps.find(x => x.name === 'retos') || firebase.initializeApp(mod.cfg, 'retos');
      R.app = app;
      const user = await new Promise(res => { const off = app.auth().onAuthStateChanged(u => { off(); res(u); }); });
      if(!user || user.isAnonymous){
        if(user) await app.auth().signOut();
        R.error = 'NEED_LOGIN'; refreshAll();
        return;
      }
      await subscribe(app);
    }catch(e){
      console.error('[Retos EF]', e);
      R.error = 'No se pudo conectar con Retos EF: ' + (e && e.message || e);
      refreshAll();
    }
  }

  /* Inicio de sesión con Google en el proyecto de Retos EF (solo la 1.ª vez; luego se recuerda) */
  async function connectRetos(){
    if(!R.app) return;
    try{
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({prompt:'select_account', login_hint:'jorge.lanchas@triana.salesianos.edu'});
      await R.app.auth().signInWithPopup(provider);
      R.error = ''; refreshAll();
      await subscribe(R.app);
    }catch(e){
      R.error = 'No se pudo iniciar sesión en Retos EF: ' + (e && e.message || e); refreshAll();
    }
  }
  window.conectarRetosEF = connectRetos;

  async function subscribe(app){
    try{
      const db2 = app.database();
      const [rub, tri] = await Promise.all([
        db2.ref('retosEF/config/rubrica').once('value').then(s => s.val()).catch(() => null),
        db2.ref('retosEF/config/trimestreActivo').once('value').then(s => s.val()).catch(() => null)
      ]);
      if(rub && typeof rub === 'object') ['umbral10','umbral6','umbralEvid10'].forEach(k => { const v = parseFloat(rub[k]); if(v > 0) R.rubrica[k] = v; });
      if([1,2,3].includes(+tri)) R.trimestreActivo = +tri;
      db2.ref('retosEF/alumnos').on('value', snap => {
        R.data = snap.val() || {}; rebuildIndex(); R.ready = true; R.error = ''; refreshAll();
      }, err => { R.error = 'No se pudieron leer los datos de Retos EF (' + (err && err.code || err) + ').'; refreshAll(); });
    }catch(e){
      console.error('[Retos EF]', e);
      R.error = 'No se pudo conectar con Retos EF: ' + (e && e.message || e);
      refreshAll();
    }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
