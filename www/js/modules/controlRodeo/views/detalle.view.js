import { getCefo, actualizarCefoCabecera, importarLineasCefo } from '../../../services/cefo.service.js';

let inicializado = false;
let cefoIdActual = null;
let arbolesCache = [];

export function initDetalleControlRodeoView() {
  if (inicializado) return;
  inicializado = true;

  const cont = document.getElementById('cefo-detalle-contenido');

  cont?.addEventListener('click', async (e) => {
    if (e.target.closest('#btn-cefo-detalle-volver')) {
      window.showView('control-rodeo-registros');
      return;
    }

    if (e.target.closest('#btn-cefo-importar-lineas')) {
      document.getElementById('cefo-lineas-file-input')?.click();
      return;
    }

    if (e.target.closest('#btn-cefo-detalle-eliminar')) {
      window.showView('control-rodeo-registros');
      return;
    }

    if (e.target.closest('#btn-cefo-editar-cabecera')) {
      mostrarFormularioEdicion();
      return;
    }

    if (e.target.closest('#btn-cefo-cancelar-edicion')) {
      if (cefoIdActual) cargarDetalleCefo(cefoIdActual);
      return;
    }

    if (e.target.closest('#btn-cefo-guardar-cabecera')) {
      await guardarEdicionCabecera();
      return;
    }
  });

  cont?.addEventListener('input', (e) => {
    if (e.target.id === 'cefo-buscar-arboles') {
      filtrarArboles(e.target.value.trim().toLowerCase());
    }
  });

  cont?.addEventListener('change', async (e) => {
    if (e.target.id === 'cefo-lineas-file-input') {
      const file = e.target.files[0];
      if (!file) return;
      const cefoId = e.target.dataset.cefoId;
      await procesarImportacionLineas(cefoId, file);
      e.target.value = '';
    }
  });
}

export async function cargarDetalleCefo(id) {
  cefoIdActual = id;
  const container = document.getElementById('cefo-detalle-contenido');
  container.innerHTML = '<p style="text-align:center;color:var(--text-muted)">Cargando...</p>';

  try {
    const data = await getCefo(id);
    if (!data) {
      container.innerHTML = '<p style="text-align:center;color:var(--text-muted)">CFO no encontrado</p>';
      return;
    }

    const cab = data.cabecera;
    const det = data.detalle;
    arbolesCache = det;

    const fecha = cab.fecha_recep
      ? new Date(cab.fecha_recep).toLocaleDateString('es-ES')
      : '—';

    const tieneArboles = det.length > 0;
    const disponibles = det.filter(a => !a.despachado).length;
    const cerrado = det.length > 0 && disponibles === 0;

    let html = `
      <div class="card ${cerrado ? 'hoja-card--cerrada' : ''}" id="cefo-cabecera-card">
        <div class="vista-header">
          <button type="button" id="btn-cefo-detalle-volver" class="btn-volver">← Volver</button>
          <h3>📋 ${cab.numero_completo}</h3>
        </div>
        <div class="grid" style="margin-top:0.5rem">
          <label>Nro CFO <span class="detalle-info">${cab.nro_cfo_recib}</span></label>
          <label>Fecha recep. <span class="detalle-info">${fecha}</span></label>
          <label>Placa <span class="detalle-info">${cab.placa || '—'}</span></label>
          <label>Chofer <span class="detalle-info">${cab.chofer || '—'}</span></label>
          <label>Total árboles <span class="detalle-info">${det.length}</span></label>
          ${det.length > 0 ? `<label>Disponibles <span class="detalle-info">${disponibles}</span></label>` : ''}
        </div>
        ${cab.observaciones ? `<label style="margin-top:0.5rem">Observaciones <span class="detalle-info">${cab.observaciones}</span></label>` : ''}
        ${cerrado ? `<div style="margin-top:0.5rem"><span class="estado-cerrado">🔒 CFO CERRADO — Todos los árboles fueron despachados</span></div>` : ''}
        <div style="margin-top:0.75rem; display:flex; gap:0.5rem">
          <button type="button" id="btn-cefo-editar-cabecera" class="btn-secondary" style="flex:1; margin:0">✏️ Editar cabecera</button>
        </div>
      </div>
    `;

    if (!tieneArboles) {
      html += `
        <div class="card" style="text-align:center">
          <div style="font-size:2rem; margin-bottom:0.5rem">📥</div>
          <div style="color:var(--text-muted); margin-bottom:1rem">Este registro no tiene árboles.<br>Importá un Excel para agregarlos.</div>
          <input type="file" id="cefo-lineas-file-input" data-cefo-id="${id}" accept=".xlsx,.xls" style="display:none">
          <button id="btn-cefo-importar-lineas" class="btn-primary" style="margin:0">📥 Importar líneas desde Excel</button>
        </div>
      `;
    } else {
      html += `
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem">
            <h3 style="margin:0">🌲 Árboles</h3>
            <div style="display:flex; gap:0.5rem; align-items:center">
              <input type="text" id="cefo-buscar-arboles" placeholder="🔍 Buscar árbol..." style="margin:0; min-width:140px">
              <input type="file" id="cefo-lineas-file-input" data-cefo-id="${id}" accept=".xlsx,.xls" style="display:none">
              <button id="btn-cefo-importar-lineas" class="btn-secondary" style="margin:0; padding:0.4rem 0.8rem; font-size:0.8rem; white-space:nowrap">📥 Importar más</button>
            </div>
          </div>
          <div style="overflow-x:auto">
            <table id="cefo-tabla-arboles">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Especie</th>
                  <th>Faja</th>
                  <th>Nro Árbol</th>
                  <th>Sec</th>
                  <th>Diam Mayor</th>
                  <th>Diam Menor</th>
                  <th>Largo</th>
                  <th>Volumen</th>
                </tr>
              </thead>
              <tbody>
                ${det.map((a, i) => `
                  <tr class="${a.despachado ? 'consumido' : ''}" data-especie="${(a.especie || '').toLowerCase()}" data-nro-arbol="${(a.nro_arbol || '').toLowerCase()}">
                    <td>${i + 1}</td>
                    <td>${a.especie}</td>
                    <td>${a.faja ?? '—'}</td>
                    <td>${a.nro_arbol}</td>
                    <td>${a.seccion}</td>
                    <td>${a.diamayor?.toFixed(2) ?? '—'}</td>
                    <td>${a.diamenor?.toFixed(2) ?? '—'}</td>
                    <td>${a.largo?.toFixed(2) ?? '—'}</td>
                    <td>${a.volumen?.toFixed(3) ?? '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div style="margin-top:0.5rem; font-size:0.78rem; color:var(--text-muted)">
            ${disponibles} disponibles · ${det.length - disponibles} despachados
          </div>
        </div>
      `;
    }

    container.innerHTML = html;

  } catch (err) {
    console.error('[CEFO] Error al cargar detalle:', err);
    container.innerHTML = '<p style="text-align:center;color:var(--text-muted)">Error al cargar detalle</p>';
  }
}

function filtrarArboles(termino) {
  const tabla = document.getElementById('cefo-tabla-arboles');
  if (!tabla) return;
  const filas = tabla.querySelectorAll('tbody tr');
  filas.forEach(tr => {
    const especie = tr.dataset.especie || '';
    const nroArbol = tr.dataset.nroArbol || '';
    const coincide = especie.includes(termino) || nroArbol.includes(termino);
    tr.style.display = coincide ? '' : 'none';
  });
}

function mostrarFormularioEdicion() {
  const card = document.getElementById('cefo-cabecera-card');
  if (!card || !cefoIdActual) return;

  const nroCfo = card.querySelector('.detalle-info')?.textContent?.trim() || '';
  const labels = card.querySelectorAll('label');
  let fecha = '';
  let placa = '';
  let chofer = '';
  let observaciones = '';

  labels.forEach(lbl => {
    const txt = lbl.textContent;
    const val = lbl.querySelector('.detalle-info')?.textContent?.trim() || '';
    if (txt.includes('Fecha recep')) {
      const parts = val.split('/');
      if (parts.length === 3) fecha = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    if (txt.includes('Placa') && !txt.includes('Nro CFO')) placa = val === '—' ? '' : val;
    if (txt.includes('Chofer')) chofer = val === '—' ? '' : val;
    if (txt.includes('Observaciones')) observaciones = val;
  });

  card.innerHTML = `
    <div class="vista-header">
      <button type="button" id="btn-cefo-detalle-volver" class="btn-volver">← Volver</button>
      <h3>✏️ Editar Cabecera</h3>
    </div>
    <div class="grid" style="margin-top:0.5rem">
      <label>Nro CFO <input type="text" id="edit-cefo-nro-cfo" class="input-upper" value="${nroCfo}" required></label>
      <label>Fecha recep. <input type="date" id="edit-cefo-fecha" value="${fecha}"></label>
      <label>Placa <input type="text" id="edit-cefo-placa" class="input-upper" value="${placa}"></label>
      <label>Chofer <input type="text" id="edit-cefo-chofer" class="input-upper" value="${chofer}"></label>
    </div>
    <label style="margin-top:0.5rem">Observaciones <textarea id="edit-cefo-observaciones" rows="2">${observaciones}</textarea></label>
    <div style="margin-top:0.75rem; display:flex; gap:0.5rem">
      <button type="button" id="btn-cefo-guardar-cabecera" class="btn-primary" style="flex:1; margin:0">💾 Guardar</button>
      <button type="button" id="btn-cefo-cancelar-edicion" class="btn-secondary" style="flex:1; margin:0">❌ Cancelar</button>
    </div>
  `;
}

async function guardarEdicionCabecera() {
  const btn = document.getElementById('btn-cefo-guardar-cabecera');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Guardando...';
  }

  try {
    const nroCfo = document.getElementById('edit-cefo-nro-cfo')?.value?.trim();
    const fecha = document.getElementById('edit-cefo-fecha')?.value || null;
    const placa = document.getElementById('edit-cefo-placa')?.value?.trim();
    const chofer = document.getElementById('edit-cefo-chofer')?.value?.trim();
    const observaciones = document.getElementById('edit-cefo-observaciones')?.value?.trim();

    if (!nroCfo) {
      alert('❌ El número de CFO es obligatorio');
      return;
    }

    await actualizarCefoCabecera(cefoIdActual, {
      nroCfoRecib: nroCfo,
      fechaRecep: fecha,
      placa: placa,
      chofer: chofer,
      observaciones: observaciones,
    });

    mostrarToast('✅ Cabecera actualizada');
    await cargarDetalleCefo(cefoIdActual);
  } catch (err) {
    console.error('[CEFO] Error al actualizar cabecera:', err);
    alert('❌ ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '💾 Guardar';
    }
  }
}

async function procesarImportacionLineas(cefoId, file) {
  const btn = document.getElementById('btn-cefo-importar-lineas');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Importando...';
  }

  try {
    const filas = await leerExcelLineas(file);
    const resultado = await importarLineasCefo(cefoId, filas);

    mostrarToast(`✅ ${resultado.creados} árbol(es) importados`);
    await cargarDetalleCefo(cefoId);

  } catch (err) {
    console.error('[CEFO] Error importando líneas:', err);
    alert('❌ ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '📥 Importar líneas desde Excel';
    }
  }
}

function leerExcelLineas(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (rows.length < 2) {
          reject(new Error('El archivo no tiene suficientes filas'));
          return;
        }

        const headers = rows[0].map(c => String(c ?? '').trim().toLowerCase());
        const idx = {
          especie: headers.indexOf('especie'),
          faja: headers.indexOf('faja'),
          nro_arbol: headers.indexOf('nro_arbol'),
          seccion: headers.indexOf('seccion'),
          diamayor: headers.indexOf('diamayor'),
          diamenor: headers.indexOf('diamenor'),
          largo: headers.indexOf('largo'),
          volumen: headers.indexOf('volumen'),
        };

        if (idx.especie === -1) {
          reject(new Error('El archivo debe tener al menos la columna ESPECIE'));
          return;
        }

        const filas = [];
        const incompletas = [];

        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          const especie = String(r[idx.especie] ?? '').trim();
          if (especie === '') continue;

          const fila = {
            especie: especie,
            faja: parseInt(r[idx.faja]) || null,
            nro_arbol: String(r[idx.nro_arbol] ?? '').trim(),
            seccion: String(r[idx.seccion] ?? '').trim(),
            diamayor: parseFloat(r[idx.diamayor]) || null,
            diamenor: parseFloat(r[idx.diamenor]) || null,
            largo: parseFloat(r[idx.largo]) || null,
            volumen: parseFloat(r[idx.volumen]) || null,
          };

          const camposObligatorios = ['especie', 'faja', 'nro_arbol', 'seccion', 'diamayor', 'diamenor', 'largo', 'volumen'];
          const faltantes = camposObligatorios.filter(campo => fila[campo] === null || fila[campo] === '');

          if (faltantes.length > 0) {
            incompletas.push({ fila: i + 1, faltantes });
          } else {
            filas.push(fila);
          }
        }

        if (incompletas.length > 0) {
          const detalle = incompletas.map(inc =>
            `• Fila ${inc.fila}: falta ${inc.faltantes.join(', ')}`
          ).join('\n');
          reject(new Error(`Datos incompletos en el archivo. No se importó nada.\n\n${detalle}`));
          return;
        }

        resolve(filas);
      } catch (err) {
        reject(new Error('No se pudo leer el archivo: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
}

function mostrarToast(mensaje) {
  const toast = document.createElement('div');
  toast.textContent = mensaje;
  toast.style.cssText = `
    position:fixed; bottom:5rem; left:50%; transform:translateX(-50%);
    background:rgba(30,61,30,0.92); color:#fff; padding:0.6rem 1.2rem;
    border-radius:2rem; font-size:0.85rem; z-index:9999;
    box-shadow:0 4px 16px rgba(0,0,0,0.3);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
