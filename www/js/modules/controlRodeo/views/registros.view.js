import { getCefos, borrarCefo } from '../../../services/cefo.service.js';
import { confirmar } from '../../../utils/confirm.js';

let inicializado = false;

export function initRegistrosControlRodeoView() {
  if (inicializado) return;
  inicializado = true;

  document.getElementById('btn-nuevo-cefo')
    ?.addEventListener('click', () => {
      window.showView('control-rodeo-nuevo');
    });

  const lista = document.getElementById('cefo-lista');
  lista?.addEventListener('click', async (e) => {
    const card = e.target.closest('[data-cefo-id]');
    if (!card) return;

    if (e.target.closest('[data-delete]')) {
      const ok = await confirmar({
        icon: '🗑️',
        titulo: '¿Eliminar registro CFO?',
        msg: 'Se eliminará el registro y todos sus árboles.',
      });
      if (!ok) return;
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
          <div class="empty-state-sub">Creá un nuevo registro para comenzar</div>
        </div>
      `;
      return;
    }

    lista.innerHTML = cefos.map(c => `
      <div class="card hoja-card" data-cefo-id="${c.id}">
        <div class="hoja-card-header">
          <div class="hoja-card-num">${c.numero_completo}</div>
          <div class="hoja-card-estado">${c.cantidad_arboles} árboles</div>
        </div>
        <div class="hoja-card-body">
          <div class="hoja-card-meta">
            <span>📄 CFO: ${c.nro_cfo_recib}</span>
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

function formatearFecha(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (isNaN(d)) return fecha;
  return d.toLocaleDateString('es-ES');
}
