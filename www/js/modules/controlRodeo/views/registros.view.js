import { getCefos, importarCefoDesdeExcel } from '../../../services/cefo.service.js';
import { confirmar } from '../../../utils/confirm.js';

let inicializado = false;

export function initRegistrosControlRodeoView() {
  if (inicializado) return;
  inicializado = true;

  const btnImportar = document.getElementById('btn-importar-cefo');
  const inputFile = document.getElementById('cefo-file-input');

  btnImportar?.addEventListener('click', () => {
    inputFile?.click();
  });

  inputFile?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await procesarArchivoCefo(file);
    e.target.value = '';
  });

  const lista = document.getElementById('cefo-lista');
  lista?.addEventListener('click', async (e) => {
    const card = e.target.closest('[data-cefo-id]');
    if (!card) return;

    if (e.target.closest('[data-delete]')) {
      const ok = await confirmar({
        icon: '🗑️',
        titulo: '¿Eliminar CFO?',
        msg: 'Se eliminará el registro y todos sus árboles.',
      });
      if (!ok) return;
      const { borrarCefo } = await import('../../../services/cefo.service.js');
      await borrarCefo(card.dataset.cefoId);
      await cargarRegistrosCefo();
      return;
    }

    window.showView('control-rodeo-detalle', card.dataset.cefoId);
  });
}

export async function cargarRegistrosCefo() {
  const lista = document.getElementById('cefo-lista');

  try {
    const cefos = await getCefos();

    if (cefos.length === 0) {
      lista.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-title">Sin registros CFO</div>
          <div class="empty-state-sub">Importá un Excel para comenzar</div>
        </div>
      `;
      return;
    }

    lista.innerHTML = cefos.map(c => `
      <div class="card hoja-card" data-cefo-id="${c.id}">
        <div class="hoja-card-header">
          <div class="hoja-card-num">${c.nro_cfo_recib}</div>
          <div class="hoja-card-estado">${c.cantidad_arboles} árboles</div>
        </div>
        <div class="hoja-card-body">
          <div class="hoja-card-meta">
            <span>📅 ${formatearFecha(c.fecha_recep)}</span>
            <span>🚛 ${c.placa || '—'}</span>
            <span>👤 ${c.chofer || '—'}</span>
          </div>
        </div>
        <div class="hoja-card-actions">
          <button data-delete="${c.id}" class="btn-icon" title="Eliminar">🗑️</button>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('[CEFO] Error al cargar registros:', err);
    lista.innerHTML = `<div class="empty-state"><div class="empty-state-sub">Error al cargar</div></div>`;
  }
}

async function procesarArchivoCefo(file) {
  const btn = document.getElementById('btn-importar-cefo');
  btn.disabled = true;
  btn.textContent = '⏳ Importando...';

  try {
    const filas = await leerExcelCefo(file);
    const observaciones = document.getElementById('cefo-observaciones-import')?.value?.trim() || '';
    const resultado = await importarCefoDesdeExcel(filas, observaciones);

    mostrarToast(`✅ ${resultado.cefosCreados} CFO(s) · ${resultado.arbolesCreados} árbol(es) importados`);
    await cargarRegistrosCefo();

  } catch (err) {
    console.error('[CEFO] Error importando:', err);
    alert('❌ ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '📥 Importar Excel';
  }
}

function leerExcelCefo(file) {
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

        // Fila 1 = headers (nuevo formato sin título)
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
          fecha_recep: headers.indexOf('fecha_recep'),
          placa: headers.indexOf('placa'),
          chofer: headers.indexOf('chofer'),
          nro_cfo_recib: headers.indexOf('nro_cfo_recib'),
          propiedad: headers.indexOf('propiedad'),
        };

        if (idx.nro_cfo_recib === -1 || idx.especie === -1) {
          reject(new Error('El archivo no tiene las columnas requeridas: especie, nro_cfo_recib'));
          return;
        }

        const filas = rows.slice(1)
          .filter(r => r[idx.nro_cfo_recib] !== '')
          .map(r => ({
            especie: String(r[idx.especie] ?? '').trim(),
            faja: parseInt(r[idx.faja]) || null,
            nro_arbol: String(r[idx.nro_arbol] ?? '').trim(),
            seccion: String(r[idx.seccion] ?? '').trim(),
            diamayor: parseFloat(r[idx.diamayor]) || null,
            diamenor: parseFloat(r[idx.diamenor]) || null,
            largo: parseFloat(r[idx.largo]) || null,
            volumen: parseFloat(r[idx.volumen]) || null,
            fecha_recep: r[idx.fecha_recep] || null,
            placa: String(r[idx.placa] ?? '').trim(),
            chofer: String(r[idx.chofer] ?? '').trim(),
            nro_cfo_recib: String(r[idx.nro_cfo_recib] ?? '').trim(),
            propiedad: idx.propiedad >= 0 ? String(r[idx.propiedad] ?? '').trim() : '',
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

function formatearFecha(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (isNaN(d)) return fecha;
  return d.toLocaleDateString('es-ES');
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
