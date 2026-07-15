import { getSalidas, borrarSalida, confirmarSalidaCab } from '../../../services/cefoSalida.service.js';
import { confirmar } from '../../../utils/confirm.js';

let inicializado = false;
let salidasCache = [];

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
        msg: 'Se eliminará el despacho de monte y los árboles volverán a estar disponibles.',
      });
      if (!ok) return;
      await borrarSalida(card.dataset.salidaId);
      await cargarRegistrosSalida();
      return;
    }

    if (e.target.closest('[data-confirmar]')) {
      const ok = await confirmar({
        icon: '✅',
        titulo: '¿Confirmar despacho?',
        msg: 'Una vez confirmado no podrás editar ni eliminar este despacho.',
      });
      if (!ok) return;
      await confirmarSalidaCab(card.dataset.salidaId);
      await cargarRegistrosSalida();
      return;
    }

    window.showView('control-rodeo-salida-detalle', card.dataset.salidaId);
  });

  // Buscador
  const buscador = document.getElementById('salida-buscador');
  buscador?.addEventListener('input', (e) => {
    filtrarCards(e.target.value.trim().toLowerCase());
  });
}

export async function cargarRegistrosSalida() {
  const lista = document.getElementById('salida-lista');
  const buscador = document.getElementById('salida-buscador');

  try {
    salidasCache = await getSalidas();

    if (salidasCache.length === 0) {
      lista.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🌲</div>
          <div class="empty-state-title">Sin registros de monte</div>
          <div class="empty-state-sub">Creá un nuevo despacho para dar de baja árboles del rodeo</div>
        </div>
      `;
      if (buscador) buscador.value = '';
      return;
    }

    renderCards(salidasCache);

  } catch (err) {
    console.error('[MONTE] Error al cargar registros:', err);
    lista.innerHTML = `<div class="empty-state"><div class="empty-state-sub">Error al cargar</div></div>`;
  }
}

function renderCards(listaSalidas) {
  const lista = document.getElementById('salida-lista');
  lista.innerHTML = listaSalidas.map(s => {
    const total = s.cantidad_arboles || 0;
    const confirmado = s.estado === 'CONFIRMADO';
    const badgeEstado = confirmado
      ? '<span style="display:inline-block;background:var(--success);color:#fff;padding:0.15rem 0.5rem;border-radius:1rem;font-size:0.7rem">CONFIRMADO</span>'
      : '<span style="display:inline-block;background:var(--warning);color:#fff;padding:0.15rem 0.5rem;border-radius:1rem;font-size:0.7rem">BORRADOR</span>';

    return `
      <div class="card hoja-card" data-salida-id="${s.id}">
        <div class="hoja-card-header">
          <div class="hoja-card-num">${s.numero_completo}</div>
          <div class="hoja-card-estado">${badgeEstado} · ${total} árbol${total !== 1 ? 'es' : ''}</div>
        </div>
        <div class="hoja-card-body">
          <div class="cefo-datos-grid">
            <div class="cefo-dato">
              <span class="cefo-dato-label">📄 Nro CFO Despacho</span>
              <span class="cefo-dato-valor">${s.nro_cfo_despacho || '—'}</span>
            </div>
            <div class="cefo-dato">
              <span class="cefo-dato-label">📅 Fecha Despacho</span>
              <span class="cefo-dato-valor">${formatearFecha(s.fecha_despacho)}</span>
            </div>
            <div class="cefo-dato">
              <span class="cefo-dato-label">🚛 Placa</span>
              <span class="cefo-dato-valor ${!s.placa ? 'muted' : ''}">${s.placa || '—'}</span>
            </div>
            <div class="cefo-dato">
              <span class="cefo-dato-label">👤 Chofer</span>
              <span class="cefo-dato-valor ${!s.chofer ? 'muted' : ''}">${s.chofer || '—'}</span>
            </div>
            <div class="cefo-dato">
              <span class="cefo-dato-label">🌲 Total Árboles</span>
              <span class="cefo-dato-valor">${total}</span>
            </div>
          </div>
        </div>
        <div class="hoja-card-actions">
          ${!confirmado ? `<button data-confirmar="${s.id}" class="btn-icon" title="Confirmar despacho">✅</button>` : ''}
          ${!confirmado ? `<button data-delete="${s.id}" class="btn-icon" title="Eliminar">🗑️</button>` : '<span style="font-size:0.75rem;color:var(--text-muted)">🔒 Confirmado</span>'}
        </div>
      </div>
    `;
  }).join('');
}

function filtrarCards(termino) {
  if (!termino) {
    renderCards(salidasCache);
    return;
  }
  const filtrados = salidasCache.filter(s =>
    (s.numero_completo || '').toLowerCase().includes(termino) ||
    (s.nro_cfo_despacho || '').toLowerCase().includes(termino) ||
    (s.placa || '').toLowerCase().includes(termino) ||
    (s.chofer || '').toLowerCase().includes(termino)
  );
  renderCards(filtrados);
}

function formatearFecha(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (isNaN(d)) return fecha;
  return d.toLocaleDateString('es-ES');
}
