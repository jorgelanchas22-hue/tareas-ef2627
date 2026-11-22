/* ===== Guardado seguro de tareas EF (2026-2027) =====
   Se carga en ver-tarea.html y protege TODAS las tareas que se abren dentro del iframe:
   1) Copia de seguridad en este dispositivo de cada respuesta mientras se escribe.
   2) Si al volver un campo está vacío pero había copia, la recupera.
   3) Guardado automático en el servidor (pulsa por el alumno los botones "Guardar" de la tarea).
   4) Aviso al salir con cambios sin guardar.
   5) Aviso visible en rojo si el servidor rechaza o no recibe el guardado. */
(function () {
  'use strict';
  const VER = 'v1', AUTOSAVE_MS = 15000, IDLE_MS = 3000;
  const IGNORE_ID = /^(group|name|manual|studentGroup|studentNameSelect|studentNameManual|nameManual|role|course|curso)$/;
  const frames = new Set();
  let ctx = null, bar = null;

  function ensureBar() {
    if (bar) return bar;
    bar = document.createElement('div');
    bar.id = 'efSaveBar';
    bar.style.cssText = 'position:sticky;top:0;z-index:50;padding:7px 16px;font:700 13px Arial,sans-serif;background:#eef6f0;color:#137a4a;border-bottom:1px solid #cfe3d6';
    bar.textContent = '💾 Guardado automático activado';
    const ref = document.getElementById('criteria') || document.body.firstChild;
    ref.parentNode.insertBefore(bar, ref);
    return bar;
  }
  function show(kind, text) {
    const b = ensureBar();
    const css = { ok: ['#eef6f0', '#137a4a'], warn: ['#fff7e6', '#a16207'], err: ['#fde8e8', '#a11'] }[kind] || ['#eef6f0', '#137a4a'];
    b.style.background = css[0]; b.style.color = css[1]; b.innerHTML = text;
  }
  const hhmm = () => new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  function fieldKey(el, d) {
    if (el.id) return '#' + el.id;
    if (el.name) {
      const same = [...d.querySelectorAll('[name="' + CSS.escape(el.name) + '"]')];
      return '@' + el.name + ':' + same.indexOf(el);
    }
    const all = [...d.querySelectorAll('textarea,input,select')];
    return '%' + el.tagName + ':' + all.indexOf(el);
  }
  function fields(d) {
    return [...d.querySelectorAll('textarea,input,select')].filter(el => {
      if (IGNORE_ID.test(el.id || '')) return false;
      const t = (el.type || '').toLowerCase();
      return !['file', 'password', 'hidden', 'button', 'submit', 'reset', 'image'].includes(t);
    });
  }
  function readVal(el) {
    const t = (el.type || '').toLowerCase();
    if (t === 'checkbox' || t === 'radio') return el.checked;
    if (el.multiple) return [...el.selectedOptions].map(o => o.value);
    return el.value;
  }
  function isEmpty(el) {
    const t = (el.type || '').toLowerCase();
    if (t === 'checkbox') return !el.checked;
    if (t === 'radio') { const d = el.ownerDocument; return !el.name || !d.querySelector('input[type=radio][name="' + CSS.escape(el.name) + '"]:checked'); }
    if (el.tagName === 'SELECT') return el.value === '' || el.selectedIndex <= 0 && !el.value;
    if (t === 'range') return false; // un deslizador nunca está "vacío": no se sobreescribe
    return String(el.value || '').trim() === '';
  }
  function hasContent(v) { return v === true || (Array.isArray(v) ? v.length : String(v ?? '').trim() !== '' && v !== false); }

  function draftKey(win) {
    let path = '';
    try { path = decodeURIComponent(win.location.pathname).replace(/^.*tareas-ef2627\//, '') + win.location.search.replace(/[?&](curso|grupo|alumno)=[^&]*/g, ''); } catch (e) {}
    return ['efdraft', VER, ctx.task, ctx.group, ctx.name, path].join('|');
  }

  function attach(frameEl) {
    let win, d;
    try { win = frameEl.contentWindow; d = frameEl.contentDocument; } catch (e) { return; }
    if (!d || !d.body || d.__efGuard) return;
    const st = d.__efGuard = { win, d, key: draftKey(win), dirty: false, ready: false, inFlight: 0, pendingWrites: 0, lastInput: 0, lastOk: 0, saving: false, error: null };
    frames.add(st);

    // --- vigilar lecturas y escrituras de Firebase dentro de la tarea ---
    try {
      const R = win.firebase && win.firebase.database && win.firebase.database.Reference && win.firebase.database.Reference.prototype;
      if (R && !R.__efHooked) {
        R.__efHooked = true;
        ['once', 'get'].forEach(m => { const o = R[m]; if (!o) return; R[m] = function () { st.inFlight++; const p = o.apply(this, arguments); Promise.resolve(p).finally(() => st.inFlight--); return p; }; });
        ['set', 'update'].forEach(m => {
          const o = R[m]; if (!o) return;
          R[m] = function () {
            st.pendingWrites++;
            const started = Date.now();
            const p = o.apply(this, arguments);
            Promise.resolve(p).then(() => {
              st.lastOk = Date.now(); st.error = null;
              if (st.lastInput <= started) st.dirty = false;
              refresh();
            }, e => {
              st.error = (e && (e.code || e.message)) || 'error';
              show('err', '⚠ <b>No se ha podido guardar en el servidor</b> (' + String(st.error).replace(/[<>&]/g, '') + '). Tus respuestas siguen copiadas en este dispositivo: no cierres la página, revisa la conexión y vuelve a pulsar Guardar. Si se repite, avisa al profesor.');
            }).finally(() => { st.pendingWrites--; });
            return p;
          };
        });
      }
    } catch (e) {}
    win.addEventListener('unhandledrejection', ev => {
      const r = ev.reason, code = r && (r.code || r.message) || '';
      if (/permission|PERMISSION|network|disconnect|offline/i.test(code)) show('err', '⚠ <b>No se ha podido guardar</b> (' + String(code).replace(/[<>&]/g, '') + '). No cierres la página; tus respuestas están copiadas en este dispositivo. Avisa al profesor si se repite.');
    });

    // --- copia local mientras se escribe ---
    let t = null;
    const snapshot = () => {
      try {
        const data = {};
        fields(d).forEach(el => { const v = readVal(el); if (hasContent(v)) data[fieldKey(el, d)] = v; });
        const prev = JSON.parse(localStorage.getItem(st.key) || 'null');
        // No borrar de la copia lo que el alumno tenía escrito antes de que cargue la página
        localStorage.setItem(st.key, JSON.stringify({ at: Date.now(), data: Object.assign({}, st.ready ? {} : (prev && prev.data) || {}, data) }));
      } catch (e) {}
    };
    const onInput = e => {
      if (!e.isTrusted || !e.target || !e.target.matches || !e.target.matches('textarea,input,select')) return;
      if (IGNORE_ID.test(e.target.id || '')) return;
      st.dirty = true; st.lastInput = Date.now();
      clearTimeout(t); t = setTimeout(snapshot, 600);
      refresh();
    };
    d.addEventListener('input', onInput, true);
    d.addEventListener('change', onInput, true);
    win.addEventListener('pagehide', () => { if (st.dirty) snapshot(); frames.delete(st); });

    // --- recuperar copia cuando la tarea ha terminado de cargar lo del servidor ---
    const tryRestore = (tries = 0) => {
      if ((st.inFlight > 0 || Date.now() - st.lastInput < 1500) && tries < 20) { setTimeout(() => tryRestore(tries + 1), 500); return; }
      let n = 0;
      try {
        const draft = JSON.parse(localStorage.getItem(st.key) || 'null');
        if (draft && draft.data) {
          const els = fields(d);
          els.forEach(el => {
            const k = fieldKey(el, d), v = draft.data[k];
            if (!hasContent(v) || !isEmpty(el)) return;
            const ty = (el.type || '').toLowerCase();
            if (ty === 'checkbox' || ty === 'radio') el.checked = true;
            else if (el.multiple && Array.isArray(v)) [...el.options].forEach(o => o.selected = v.includes(o.value));
            else { if (el.tagName === 'SELECT' && ![...el.options].some(o => o.value === v)) return; el.value = v; }
            el.dispatchEvent(new win.Event('input', { bubbles: true }));
            el.dispatchEvent(new win.Event('change', { bubbles: true }));
            n++;
          });
        }
      } catch (e) {}
      st.ready = true;
      if (n) {
        st.dirty = true; st.lastInput = Date.now();
        show('warn', '↺ Se han recuperado <b>' + n + '</b> respuesta(s) que no llegaron a guardarse. Se guardarán solas en unos segundos.');
      } else refresh();
      snapshot();
    };
    setTimeout(tryRestore, 2500);

    // tareas dentro de tareas (4.º ESO: briefing / investigación / fase avanzada)
    d.querySelectorAll('iframe').forEach(ch => { ch.addEventListener('load', () => attach(ch)); attach(ch); });
  }

  // Botones de guardado parcial seguros de pulsar automáticamente (nunca "Entregar")
  function saveButtons(d) {
    return [...d.querySelectorAll('button')].filter(b => {
      const txt = (b.textContent || '').trim(), oc = b.getAttribute('onclick') || '';
      if (/entreg|enviar|final|imprimir|pdf|lista|nota|valoraci/i.test(txt)) return false;
      if (b.type === 'submit' && !b.id) return false;
      return /^save[A-Z]/.test(b.id || '') || b.id === 'save' || /savePart\(/.test(oc);
    });
  }
  function autosave(st, force) {
    if (!st.ready || !st.dirty || st.saving || st.pendingWrites > 0) return;
    if (!force && Date.now() - st.lastInput < IDLE_MS) return;
    const btns = saveButtons(st.d);
    if (!btns.length) return; // tarea sin guardado parcial: queda la copia local
    st.saving = true;
    const oldAlert = st.win.alert;
    try { st.win.alert = function () {}; btns.forEach(b => { if (!b.disabled) b.click(); }); }
    catch (e) {}
    finally { st.win.alert = oldAlert; setTimeout(() => { st.saving = false; refresh(); }, 1500); }
  }
  setInterval(() => frames.forEach(st => autosave(st, false)), AUTOSAVE_MS);

  function refresh() {
    let dirty = false, err = false, last = 0, hasServer = false;
    frames.forEach(st => { dirty = dirty || st.dirty; err = err || !!st.error; last = Math.max(last, st.lastOk); hasServer = hasServer || saveButtons(st.d).length > 0; });
    if (err) return;
    if (dirty) show('warn', hasServer ? '✎ Cambios pendientes · se guardan solos cada pocos segundos (copia ya hecha en este dispositivo)' : '✎ Respuestas copiadas en este dispositivo · recuerda <b>enviar</b> la tarea cuando termines');
    else if (last) show('ok', '✓ Todo guardado en el servidor · ' + hhmm());
    else show('ok', '💾 Guardado automático activado');
  }

  window.addEventListener('beforeunload', e => {
    let dirty = false;
    frames.forEach(st => { if (st.dirty) { dirty = true; autosave(st, true); } });
    if (dirty) { e.preventDefault(); e.returnValue = ''; }
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') frames.forEach(st => autosave(st, true)); });

  window.efGuardTask = function (frameEl, info) {
    ctx = { task: info.task || '', group: info.group || '', name: info.name || '' };
    ensureBar();
    attach(frameEl);
  };
})();
