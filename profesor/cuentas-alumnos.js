/* ===== Cuentas del alumnado (seguridad de notas) =====
   Vincula cada cuenta Google del alumno con su nombre de la lista, a partir de los accesos
   que ya registran las tareas (actividad_ef). Con esa vinculación, las reglas de Firebase
   solo dejan a cada alumno leer SUS notas (cuentas_alumnos solo lo escribe el profesor). */
(function () {
  'use strict';
  const YEAR = '2026-2027', GROUPS = { '2ESO': ['2A', '2B', '2C'], '4ESO': ['4A', '4B', '4C'] };
  const ek = e => String(e || '').toLowerCase().replace(/\./g, ',');
  let busy = false, last = null;
  // El nombre de la cuenta Google debe parecerse al de la lista (evita que alguien se vincule con un nombre ajeno)
  const toks = x => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z]+/).filter(w => w.length >= 3);
  function seParece(lista, cuenta) {
    const a = toks(lista), b = new Set(toks(cuenta));
    const comunes = a.filter(w => b.has(w)).length;
    return comunes >= 2 || (comunes >= 1 && b.size <= 2 && a.length <= 2);
  }

  const box = document.createElement('div');
  box.id = 'cuentasBox';
  box.style.cssText = 'margin:8px 0;font-size:13px;border:1px solid #ddd;background:#fafafa;padding:8px 10px';
  box.innerHTML = '<b>🔐 Cuentas del alumnado</b> <span id="cuentasMsg">comprobando…</span> <button id="cuentasVer" class="save" style="display:none">Ver detalle</button><div id="cuentasDet" style="display:none;margin-top:8px"></div>';
  D('summary').parentNode.insertBefore(box, D('summary'));
  D('cuentasVer').onclick = () => { const d = D('cuentasDet'); d.style.display = d.style.display === 'none' ? '' : 'none'; };

  async function sync() {
    if (busy || firebase.auth().currentUser?.email?.toLowerCase() !== AUTHORIZED_EMAIL.toLowerCase()) return;
    busy = true;
    try {
      const rd = async p => (await db.ref(p).once('value')).val() || {};
      const cuentas = await rd('cuentas_alumnos');
      const nuevas = {}, conflictos = [], sinCuenta = [];
      let total = 0, vinculados = 0;
      for (const c of Object.keys(GROUPS)) for (const g of GROUPS[c]) {
        const [lv, acc] = await Promise.all([rd('listas_grupos/' + g), rd('actividad_ef/' + YEAR + '/' + g)]);
        const lista = (Array.isArray(lv) ? lv : Object.values(lv)).filter(n => typeof n === 'string');
        const porNombre = {}, nombreCuenta = {};
        Object.values(acc).forEach(a => {
          if (!a || !a.nombre || !a.cuentaEmail) return;
          const k = a.nombre.trim().toLocaleLowerCase('es');
          (porNombre[k] = porNombre[k] || new Set()).add(String(a.cuentaEmail).toLowerCase());
          (nombreCuenta[String(a.cuentaEmail).toLowerCase()] = a.nombreCuenta || '');
        });
        lista.forEach(n => {
          total++;
          const clave = gk(g, n), ya = Object.entries(cuentas).find(([, v]) => v && v.clave === clave && v.grupo === g);
          if (ya) { vinculados++; return; }
          const emails = [...(porNombre[n.trim().toLocaleLowerCase('es')] || [])];
          if (!emails.length) { sinCuenta.push(g + ' · ' + n); return; }
          if (emails.length > 1) { conflictos.push(g + ' · ' + n + ': ha entrado con varias cuentas (' + emails.join(', ') + ')'); return; }
          if (!seParece(n, nombreCuenta[emails[0]])) { conflictos.push(g + ' · ' + n + ': la cuenta ' + emails[0] + ' se llama «' + (nombreCuenta[emails[0]] || 'sin nombre') + '», no coincide con la lista'); return; }
          const k = ek(emails[0]), prev = cuentas[k] || nuevas[k];
          if (prev && prev.clave !== clave) { conflictos.push(g + ' · ' + n + ': la cuenta ' + emails[0] + ' ya está vinculada a ' + (prev.nombre || prev.clave)); return; }
          nuevas[k] = { clave, grupo: g, curso: c, nombre: n, vinculadoAt: Date.now() };
          vinculados++;
        });
      }
      if (Object.keys(nuevas).length) await db.ref('cuentas_alumnos').update(nuevas);
      last = { total, vinculados, nuevas: Object.keys(nuevas).length, conflictos, sinCuenta };
      D('cuentasMsg').innerHTML = `${vinculados}/${total} vinculadas` +
        (last.nuevas ? ` · <span style="color:#137a4a">${last.nuevas} nueva(s)</span>` : '') +
        (conflictos.length ? ` · <b style="color:#a16207">⚠ ${conflictos.length} a revisar</b>` : '') +
        (sinCuenta.length ? ` · ${sinCuenta.length} aún no han entrado con Google` : '');
      D('cuentasVer').style.display = (conflictos.length || sinCuenta.length) ? '' : 'none';
      D('cuentasDet').innerHTML =
        (conflictos.length ? '<b>A revisar</b> (no se vinculan solos; dímelo y lo arreglamos):<ul>' + conflictos.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') +
        (sinCuenta.length ? '<b>Sin cuenta todavía</b> (se vinculan solos cuando entren en una tarea):<div style="color:#666">' + sinCuenta.map(esc).join(' · ') + '</div>' : '');
    } catch (e) {
      D('cuentasMsg').textContent = 'No se pudieron comprobar: ' + (e.code || e.message || e);
    } finally { busy = false; }
  }
  window.efSyncCuentas = sync;
  firebase.auth().onAuthStateChanged(u => { if (u) setTimeout(sync, 1500); });
  setInterval(() => { if (!document.hidden) sync(); }, 600000);
})();
