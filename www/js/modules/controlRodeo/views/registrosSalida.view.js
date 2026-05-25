import { getSalidas, borrarSalida } from '../../../services/cefoSalida.service.js';
import { confirmar } from '../../../utils/confirm.js';

let inicializado = false;

export function initRegistrosSalidaView() {
  if (inicializado) return;
  inicializado = true;

  document.getElementById('btn-nueva-salida')
    ?.addEventListener('click', () => {
      window.showView('control-rodeo-salida-nuevo');
    });

  const lista = document.getElementById('salida-lista');
  lista?.addEventListener('click', async (e) => {
    const card = e.target.closest('[data-salida-id]');
    if (!card) return;

    if (e.target.closest('[data-delete]')) {
      const ok = await confirmar({
        icon: '🗑️',
        titulo: '¿Eliminar despacho?',
        msg: 'Se eliminará el despacho y los árboles volverán a estar disponibles.',
      });
      if (!ok) return;
      await borrarSalida(card.dataset.salidaId);
      await cargarRegistrosSalida();
      return;
    }

    window.showView('control-rodeo-salida-detalle', card.dataset.salidaId);
  });
}

export async function cargarRegistrosSalida() {
  const lista = document.getElementById('salida-lista');

  try {
    const salidas = await getSalidas();

    if (salidas.length === 0) {
      lista.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📦</div>
          <div class="empty-state-title">Sin despachos</div>
          <div class="empty-state-sub">Creá un nuevo despacho para dar de baja árboles</div>
        </div>
      `;
      return;
    }

    lista.innerHTML = salidas.map(s => `
      <div class="card hoja-card" data-salida-id="${s.id}">
        <div class="hoja-card-header">
          <div class="hoja-card-num">${s.numero_completo}</div>
          <div class="hoja-card-estado">${s.cantidad_arboles} árboles</div>
        </div>
        <div class="hoja-card-body">
          <div class="hoja-card-meta">
            <span>📄 CFO: ${s.nro_cfo_despacho}</span>
            <span>📅 ${formatearFecha(s.fecha_despacho)}</span>
            <span>🚛 ${s.placa || '—'}</span>
            <span>👤 ${s.chofer || '—'}</span>
          </div>
        </div>
        <div class="hoja-card-actions">
          <button data-delete="${s.id}" class="btn-icon" title="Eliminar">🗑️</button>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('[SALIDA] Error al cargar registros:', err);
    lista.innerHTML = `<div class="empty-state"><div class="empty-state-sub">Error al cargar</div></div>`;
  }
}

function formatearFecha(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (isNaN(d)) return fecha;
  return d.toLocaleDateString('es-ES');
}
