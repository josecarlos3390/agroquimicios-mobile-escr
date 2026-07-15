import { getDespachos, borrarDespacho, confirmarDespachoCab } from '../services/aserraderoDespacho.service.js';
import { confirmar } from '../../../utils/confirm.js';

let inicializado = false;
let despachosCache = [];

export function initAserraderoDespachoRegistrosView() {
  if (inicializado) return;
  inicializado = true;

  document.getElementById('btn-nuevo-despacho-aserradero')
    ?.addEventListener('click', () => {
      window.showView('aserradero-despacho-nuevo');
    });

  const lista = document.getElementById('aserradero-despacho-lista');
  lista?.addEventListener('click', async (e) => {
    const card = e.target.closest('[data-despacho-id]');
    if (!card) return;

    if (e.target.closest('[data-delete]')) {
      const ok = await confirmar({
        icon: '🗑️',
        titulo: '¿Eliminar despacho?',
        msg: 'Se eliminará el despacho de aserradero y los árboles volverán a estar disponibles.',
      });
      if (!ok) return;
      await borrarDespacho(card.dataset.despachoId);
      await cargarAserraderoDespachoRegistros();
      return;
    }

    if (e.target.closest('[data-confirmar]')) {
      const ok = await confirmar({
        icon: '✅',
        titulo: '¿Confirmar despacho?',
        msg: 'Una vez confirmado no podrás editar ni eliminar este despacho.',
        okLabel: 'Aceptar',
      });
      if (!ok) return;
      await confirmarDespachoCab(card.dataset.despachoId);
      await cargarAserraderoDespachoRegistros();
      return;
    }

    window.showView('aserradero-despacho-detalle', card.dataset.despachoId);
  });

  const buscador = document.getElementById('aserradero-despacho-buscador');
  buscador?.addEventListener('input', (e) => {
    filtrarCards(e.target.value.trim().toLowerCase());
  });
}

export async function cargarAserraderoDespachoRegistros() {
  const lista = document.getElementById('aserradero-despacho-lista');
  const buscador = document.getElementById('aserradero-despacho-buscador');

  try {
    despachosCache = await getDespachos();

    if (despachosCache.length === 0) {
      lista.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🪵</div>
          <div class="empty-state-title">Sin despachos</div>
          <div class="empty-state-sub">Creá un nuevo despacho para dar de baja árboles del rodeo</div>
        </div>
      `;
      if (buscador) buscador.value = '';
      return;
    }

    renderCards(despachosCache);
  } catch (err) {
    console.error('[ASERRADERO] Error al cargar despachos:', err);
    lista.innerHTML = `<div class="empty-state"><div class="empty-state-sub">Error al cargar</div></div>`;
  }
}

function renderCards(listaDespachos) {
  const lista = document.getElementById('aserradero-despacho-lista');
  lista.innerHTML = listaDespachos.map(d => {
    const total = d.cantidad_arboles || 0;
    const confirmado = d.estado === 'CONFIRMADO';
    const badgeEstado = confirmado
      ? '<span style="display:inline-block;background:var(--success);color:#fff;padding:0.15rem 0.5rem;border-radius:1rem;font-size:0.7rem">CONFIRMADO</span>'
      : '<span style="display:inline-block;background:var(--warning);color:#fff;padding:0.15rem 0.5rem;border-radius:1rem;font-size:0.7rem">BORRADOR</span>';

    return `
      <div class="card hoja-card" data-despacho-id="${d.id}">
        <div class="hoja-card-header">
          <div class="hoja-card-num">${d.numero_completo}</div>
          <div class="hoja-card-estado">${badgeEstado} · ${total} árbol${total !== 1 ? 'es' : ''}</div>
        </div>
        <div class="hoja-card-body">
          <div class="cefo-datos-grid">
            <div class="cefo-dato">
              <span class="cefo-dato-label">📄 Nro Despacho</span>
              <span class="cefo-dato-valor">${d.nro_despacho || '—'}</span>
            </div>
            <div class="cefo-dato">
              <span class="cefo-dato-label">📅 Fecha Despacho</span>
              <span class="cefo-dato-valor">${formatearFecha(d.fecha_despacho)}</span>
            </div>
            <div class="cefo-dato">
              <span class="cefo-dato-label">🚛 Placa</span>
              <span class="cefo-dato-valor ${!d.placa ? 'muted' : ''}">${d.placa || '—'}</span>
            </div>
            <div class="cefo-dato">
              <span class="cefo-dato-label">👤 Chofer</span>
              <span class="cefo-dato-valor ${!d.chofer ? 'muted' : ''}">${d.chofer || '—'}</span>
            </div>
            <div class="cefo-dato">
              <span class="cefo-dato-label">🌲 Total Árboles</span>
              <span class="cefo-dato-valor">${total}</span>
            </div>
          </div>
        </div>
        <div class="hoja-card-actions">
          ${!confirmado ? `<button data-confirmar="${d.id}" class="btn-icon" title="Confirmar despacho">✅</button>` : ''}
          ${!confirmado ? `<button data-delete="${d.id}" class="btn-icon" title="Eliminar">🗑️</button>` : '<span style="font-size:0.75rem;color:var(--text-muted)">🔒 Confirmado</span>'}
        </div>
      </div>
    `;
  }).join('');
}

function filtrarCards(termino) {
  if (!termino) {
    renderCards(despachosCache);
    return;
  }
  const filtrados = despachosCache.filter(d =>
    (d.numero_completo || '').toLowerCase().includes(termino) ||
    (d.nro_despacho || '').toLowerCase().includes(termino) ||
    (d.placa || '').toLowerCase().includes(termino) ||
    (d.chofer || '').toLowerCase().includes(termino)
  );
  renderCards(filtrados);
}

function formatearFecha(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (isNaN(d)) return fecha;
  return d.toLocaleDateString('es-ES');
}
