import { listarRodeos, eliminarRodeo } from '../services/rodeo.service.js';
import { getEmpresaActiva } from '../../../services/empresas.service.js';
import { confirmar } from '../../../utils/confirm.js';
import { formatFecha } from '../../../utils/fecha.js';

let inicializado = false;

export function initRodeoRegistrosView() {
  if (inicializado) return;
  inicializado = true;

  const section = document.getElementById('view-rodeo-registros');
  if (!section) return;

  section.addEventListener('click', async e => {
    const btnNuevo = e.target.closest('#btn-nuevo-rodeo');
    if (btnNuevo) {
      window.showView('rodeo-nuevo');
      return;
    }

    const card = e.target.closest('.rodeo-card');
    if (!card) return;
    const id = card.dataset.id;
    if (!id) return;

    if (e.target.closest('.btn-ver-rodeo')) {
      window.showView('rodeo-detalle', id);
      return;
    }

    if (e.target.closest('.btn-eliminar-rodeo')) {
      const ok = await confirmar({ titulo: 'Eliminar rodeo', msg: '¿Eliminar este registro de rodeo?' });
      if (!ok) return;
      try {
        await eliminarRodeo(id);
        await cargarRodeoRegistros();
      } catch (err) {
        alert('❌ ' + err.message);
      }
      return;
    }
  });
}

export async function cargarRodeoRegistros() {
  const lista = document.getElementById('rodeo-lista');
  if (!lista) return;

  lista.innerHTML = `
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
  `;

  try {
    const empresa = getEmpresaActiva();
    const rodeos = await listarRodeos(empresa?.id ?? null);

    if (!rodeos.length) {
      lista.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🌲</div>
          <p>No hay registros de rodeo</p>
        </div>
      `;
      return;
    }

    lista.innerHTML = rodeos.map(r => `
      <div class="card rodeo-card" data-id="${r.id}">
        <div class="hoja-card-header">
          <div class="hoja-card-title">${r.numero_completo}</div>
          <span class="hoja-card-badge ${r.estado === 'EXPORTADO' ? 'badge-exportado' : 'badge-borrador'}">${r.estado}</span>
        </div>
        <div class="hoja-card-meta">
          <span>📅 ${formatFecha(r.fecha)}</span>
          <span>🗺️ ${r.sector_nombre || '—'}</span>
        </div>
        <div class="hoja-card-body" style="font-size:0.85rem;color:var(--text-muted)">
          <div>🌳 ${r.cantidad_arboles || 0} árboles registrados</div>
          ${r.placa ? `<div>🚛 Placa: ${r.placa}</div>` : ''}
          ${r.chofer ? `<div>👤 Chofer: ${r.chofer}</div>` : ''}
          ${r.observaciones ? `<div>📝 ${r.observaciones}</div>` : ''}
        </div>
        <div class="hoja-card-actions">
          <button type="button" class="btn-ver-rodeo" style="color:var(--primary);background:none;border:none;padding:0.3rem 0.6rem;font-size:0.85rem">
            👁️ Ver detalle
          </button>
          <button type="button" class="btn-eliminar-rodeo" style="color:var(--danger);background:none;border:none;padding:0.3rem 0.6rem;font-size:0.85rem">
            🗑️ Eliminar
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('[RODEO] Error cargando registros:', err);
    lista.innerHTML = `<p class="empty-state">❌ Error al cargar registros</p>`;
  }
}
