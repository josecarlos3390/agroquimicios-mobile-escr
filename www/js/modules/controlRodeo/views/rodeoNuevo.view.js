import { crearRodeo, procesarExcelRodeo } from '../services/rodeo.service.js';
import { listarRodeoSectores } from '../services/rodeoSectores.service.js';
import { getEmpresaActiva } from '../../../services/empresas.service.js';

let inicializado = false;
let _previewDetalle = [];

export function initRodeoNuevoView() {
  if (inicializado) return;
  inicializado = true;

  const section = document.getElementById('view-rodeo-nuevo');
  if (!section) return;

  document.getElementById('btn-rodeo-nuevo-volver')?.addEventListener('click', () => {
    window.showView('rodeo-registros');
  });

  const fechaInput = section.querySelector('#rodeo-fecha');
  if (fechaInput) {
    fechaInput.value = new Date().toISOString().split('T')[0];
  }

  const excelInput = section.querySelector('#rodeo-excel');
  if (excelInput) {
    excelInput.addEventListener('change', async () => {
      const file = excelInput.files?.[0];
      if (!file) return;
      try {
        const data = await file.arrayBuffer();
        const workbook = window.XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = window.XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
        _previewDetalle = procesarExcelRodeo(json);
        renderPreview(_previewDetalle);
      } catch (err) {
        console.error('[RODEO] Error leyendo Excel:', err);
        alert('❌ Error al leer el archivo Excel');
        _previewDetalle = [];
        renderPreview([]);
      }
    });
  }

  const form = section.querySelector('#form-rodeo');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const textoOriginal = btn?.textContent;

      try {
        if (btn) { btn.disabled = true; btn.textContent = '⏳ Guardando...'; }

        const empresa = getEmpresaActiva();
        if (!empresa?.id) throw new Error('Debes seleccionar una propiedad activa');

        const fecha = section.querySelector('#rodeo-fecha')?.value;
        if (!fecha) throw new Error('La fecha es obligatoria');

        const sectorId = section.querySelector('#rodeo-sector')?.value;
        if (!sectorId) throw new Error('El sector es obligatorio');

        if (_previewDetalle.length === 0) throw new Error('Debes importar un archivo Excel');

        const data = {
          empresa_id: empresa.id,
          fecha,
          sector_id: parseInt(sectorId, 10),
        };

        await crearRodeo(data, _previewDetalle);
        alert('✅ Rodeo guardado');
        limpiarFormulario(section);
        window.showView('rodeo-registros');
      } catch (err) {
        alert('❌ ' + err.message);
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = textoOriginal || '💾 Guardar rodeo'; }
      }
    });
  }
}

export async function cargarRodeoNuevoSectores() {
  const select = document.getElementById('rodeo-sector');
  if (!select) return;
  try {
    const empresa = getEmpresaActiva();
    if (!empresa?.id) return;
    const sectores = await listarRodeoSectores(empresa.id);
    select.innerHTML = '<option value="">Seleccioná sector...</option>' +
      sectores.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');
  } catch (err) {
    console.error('[RODEO] Error cargando sectores:', err);
  }
}

function renderPreview(detalle) {
  const preview = document.getElementById('rodeo-preview');
  if (!preview) return;
  if (detalle.length === 0) {
    preview.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;margin:0;">Seleccioná un archivo para ver la preview...</p>';
    return;
  }
  const muestra = detalle.slice(0, 20);
  preview.innerHTML = `
    <p style="margin:0 0 0.5rem;font-size:0.85rem;color:var(--text-muted)">${detalle.length} filas importadas (mostrando primeras ${muestra.length})</p>
    <table style="width:100%;font-size:0.75rem;border-collapse:collapse;">
      <thead>
        <tr style="background:var(--gray-100);">
          <th style="padding:0.3rem;border:1px solid var(--border)">Nro Rodeo</th>
          <th style="padding:0.3rem;border:1px solid var(--border)">Especie</th>
          <th style="padding:0.3rem;border:1px solid var(--border)">Faja</th>
          <th style="padding:0.3rem;border:1px solid var(--border)">Nro Árbol</th>
          <th style="padding:0.3rem;border:1px solid var(--border)">Sección</th>
          <th style="padding:0.3rem;border:1px solid var(--border)">Vol</th>
        </tr>
      </thead>
      <tbody>
        ${muestra.map(d => `
          <tr>
            <td style="padding:0.3rem;border:1px solid var(--border)">${d.nro_rodeo}</td>
            <td style="padding:0.3rem;border:1px solid var(--border)">${d.especie}</td>
            <td style="padding:0.3rem;border:1px solid var(--border)">${d.faja}</td>
            <td style="padding:0.3rem;border:1px solid var(--border)">${d.nro_arbol}</td>
            <td style="padding:0.3rem;border:1px solid var(--border)">${d.seccion}</td>
            <td style="padding:0.3rem;border:1px solid var(--border)">${d.volumen ?? '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function limpiarFormulario(section) {
  section.querySelectorAll('input, select').forEach(el => {
    if (el.type === 'file') el.value = '';
    else if (el.type === 'date') el.value = new Date().toISOString().split('T')[0];
    else el.value = '';
  });
  _previewDetalle = [];
  renderPreview([]);
}
