import { listarGuias, eliminarGuia } from '../services/guiaTransporteCana.service.js';
import { getEmpresaActiva } from '../../../services/empresas.service.js';
import { confirmar } from '../../../utils/confirm.js';
import { formatFecha } from '../../../utils/fecha.js';

let inicializado = false;
let estadoFiltro = 'BORRADOR';

export function initRegistrosGuiaTransporteView() {
  if (inicializado) return;
  inicializado = true;

  const section = document.getElementById('view-guia-transporte-registros');
  if (!section) return;

  const filtro = document.getElementById('filtro-estado-guia-transporte');
  if (filtro) {
    filtro.addEventListener('change', () => {
      estadoFiltro = filtro.value;
      cargarRegistrosGuiaTransporte();
    });
  }

  section.addEventListener('click', async e => {
    const btnNueva = e.target.closest('#btn-nueva-guia-transporte');
    if (btnNueva) {
      window.showView('guia-transporte-nuevo');
      return;
    }

    const card = e.target.closest('.guia-card');
    if (!card) return;
    const id = card.dataset.id;
    if (!id) return;

    if (e.target.closest('.btn-eliminar-guia')) {
      const ok = await confirmar({ titulo: 'Eliminar guía', msg: '¿Eliminar esta guía de transporte?' });
      if (!ok) return;
      try {
        await eliminarGuia(id);
        await cargarRegistrosGuiaTransporte();
      } catch (err) {
        alert('❌ ' + err.message);
      }
      return;
    }

    window.showView('guia-transporte-detalle', id);
  });
}

export async function cargarRegistrosGuiaTransporte() {
  const lista = document.getElementById('guia-transporte-lista');
  if (!lista) return;

  lista.innerHTML = `
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
  `;

  try {
    const empresa = getEmpresaActiva();
    const guias = await listarGuias(empresa?.id ?? null);

    const filtradas = estadoFiltro
      ? guias.filter(g => g.estado === estadoFiltro)
      : guias;

    if (!filtradas.length) {
      lista.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <p>No hay guías de transporte${estadoFiltro ? ' en este estado' : ''}</p>
        </div>
      `;
      return;
    }

    lista.innerHTML = filtradas.map(g => `
      <div class="card guia-card" data-id="${g.id}">
        <div class="hoja-card-header">
          <div class="hoja-card-title">${g.numero_completo}</div>
          <span class="hoja-card-badge ${g.estado === 'EXPORTADO' ? 'badge-exportado' : 'badge-borrador'}">${g.estado}</span>
        </div>
        <div class="hoja-card-meta">
          <span>📅 ${formatFecha(g.fecha)}</span>
          <span>🚛 ${g.placa || '—'}</span>
        </div>
        <div class="hoja-card-body" style="font-size:0.85rem;color:var(--text-muted)">
          <div>👤 ${g.boletario || '—'} · Turno: ${g.turno || '—'}</div>
          <div>🔓 Liberación: ${g.cod_liberacion || '—'}</div>
        </div>
        <div class="hoja-card-actions">
          <button type="button" class="btn-eliminar-guia" style="color:var(--danger);background:none;border:none;padding:0.3rem 0.6rem;font-size:0.85rem">
            🗑️ Eliminar
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('[GUIA-TRANSPORTE] Error cargando guías:', err);
    lista.innerHTML = `<p class="empty-state">❌ Error al cargar guías</p>`;
  }
}
