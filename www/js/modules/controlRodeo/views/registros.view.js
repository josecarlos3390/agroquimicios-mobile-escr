import { getCefos, borrarCefo } from '../../../services/cefo.service.js';
import { confirmar } from '../../../utils/confirm.js';

let inicializado = false;
let cefosCache = [];

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

  // Buscador
  const buscador = document.getElementById('cefo-buscador');
  buscador?.addEventListener('input', (e) => {
    filtrarCards(e.target.value.trim().toLowerCase());
  });
}

export async function cargarRegistrosCefo() {
  const lista = document.getElementById('cefo-lista');
  const buscador = document.getElementById('cefo-buscador');

  try {
    cefosCache = await getCefos();

    if (cefosCache.length === 0) {
      lista.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-title">Sin registros CFO</div>
          <div class="empty-state-sub">Creá un nuevo registro para comenzar</div>
        </div>
      `;
      if (buscador) buscador.value = '';
      return;
    }

    renderCards(cefosCache);

  } catch (err) {
    console.error('[CEFO] Error al cargar registros:', err);
    lista.innerHTML = `<div class="empty-state"><div class="empty-state-sub">Error al cargar</div></div>`;
  }
}

function renderCards(listaCefos) {
  const lista = document.getElementById('cefo-lista');
  lista.innerHTML = listaCefos.map(c => {
    const total = c.cantidad_arboles || 0;
    const disp = c.arboles_disponibles || 0;
    const consumidos = total - disp;
    const porcentaje = total > 0 ? Math.round((consumidos / total) * 100) : 0;
    const cerrado = total > 0 && disp === 0;

    return `
      <div class="card hoja-card ${cerrado ? 'hoja-card--cerrada' : ''}" data-cefo-id="${c.id}">
        <div class="hoja-card-header">
          <div class="hoja-card-num">${c.numero_completo}</div>
          <div class="hoja-card-estado">
            ${cerrado
              ? '<span class="estado-cerrado">🔒 CERRADO</span>'
              : `${consumidos}/${total} desp.`}
          </div>
        </div>
        ${total > 0 && !cerrado ? `
          <div class="cefo-progreso-barra">
            <div class="cefo-progreso-lleno" style="width:${porcentaje}%"></div>
          </div>
        ` : ''}
        <div class="hoja-card-body">
          <div class="cefo-datos-grid">
            <div class="cefo-dato">
              <span class="cefo-dato-label">📄 Nro CFO Recib.</span>
              <span class="cefo-dato-valor">${c.nro_cfo_recib || '—'}</span>
            </div>
            <div class="cefo-dato">
              <span class="cefo-dato-label">📅 Fecha Recep.</span>
              <span class="cefo-dato-valor">${formatearFecha(c.fecha_recep)}</span>
            </div>
            <div class="cefo-dato">
              <span class="cefo-dato-label">🚛 Placa</span>
              <span class="cefo-dato-valor ${!c.placa ? 'muted' : ''}">${c.placa || '—'}</span>
            </div>
            <div class="cefo-dato">
              <span class="cefo-dato-label">👤 Chofer</span>
              <span class="cefo-dato-valor ${!c.chofer ? 'muted' : ''}">${c.chofer || '—'}</span>
            </div>
            <div class="cefo-dato">
              <span class="cefo-dato-label">🌲 Total Árboles</span>
              <span class="cefo-dato-valor">${total}</span>
            </div>
            <div class="cefo-dato">
              <span class="cefo-dato-label">📦 Disponibles</span>
              <span class="cefo-dato-valor ${disp === 0 && total > 0 ? 'muted' : ''}">${disp}</span>
            </div>
          </div>
        </div>
        <div class="hoja-card-actions">
          <button data-delete="${c.id}" class="btn-icon" title="Eliminar">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

function filtrarCards(termino) {
  if (!termino) {
    renderCards(cefosCache);
    return;
  }
  const filtrados = cefosCache.filter(c =>
    (c.numero_completo || '').toLowerCase().includes(termino) ||
    (c.nro_cfo_recib || '').toLowerCase().includes(termino) ||
    (c.placa || '').toLowerCase().includes(termino) ||
    (c.chofer || '').toLowerCase().includes(termino)
  );
  renderCards(filtrados);
}

function formatearFecha(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (isNaN(d)) return fecha;
  return d.toLocaleDateString('es-ES');
}
