import { getCefo, importarLineasCefo } from '../../../services/cefo.service.js';

let inicializado = false;

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
      // Eliminación se maneja desde registros
      window.showView('control-rodeo-registros');
      return;
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

    const fecha = cab.fecha_recep
      ? new Date(cab.fecha_recep).toLocaleDateString('es-ES')
      : '—';

    const tieneArboles = det.length > 0;

    let html = `
      <div class="card">
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
        </div>
        ${cab.observaciones ? `<label style="margin-top:0.5rem">Observaciones <span class="detalle-info">${cab.observaciones}</span></label>` : ''}
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
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem">
            <h3 style="margin:0">🌲 Árboles</h3>
            <input type="file" id="cefo-lineas-file-input" data-cefo-id="${id}" accept=".xlsx,.xls" style="display:none">
            <button id="btn-cefo-importar-lineas" class="btn-secondary" style="margin:0; padding:0.4rem 0.8rem; font-size:0.8rem">📥 Importar más</button>
          </div>
          <div style="overflow-x:auto">
            <table>
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
                  <tr>
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
        </div>
      `;
    }

    container.innerHTML = html;

  } catch (err) {
    console.error('[CEFO] Error al cargar detalle:', err);
    container.innerHTML = '<p style="text-align:center;color:var(--text-muted)">Error al cargar detalle</p>';
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

        const filas = rows.slice(1)
          .filter(r => r[idx.especie] !== '')
          .map(r => ({
            especie: String(r[idx.especie] ?? '').trim(),
            faja: parseInt(r[idx.faja]) || null,
            nro_arbol: String(r[idx.nro_arbol] ?? '').trim(),
            seccion: String(r[idx.seccion] ?? '').trim(),
            diamayor: parseFloat(r[idx.diamayor]) || null,
            diamenor: parseFloat(r[idx.diamenor]) || null,
            largo: parseFloat(r[idx.largo]) || null,
            volumen: parseFloat(r[idx.volumen]) || null,
          }));

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
