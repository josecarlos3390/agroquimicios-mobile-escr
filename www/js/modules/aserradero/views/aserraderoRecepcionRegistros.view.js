import { getRecepciones, borrarRecepcion, confirmarRecepcionCab, getDatosExportacionRecepcion } from '../services/aserraderoRecepcion.service.js';
import { confirmar } from '../../../utils/confirm.js';
import { exportarRegistrosArbolesAXLSX } from '../../../utils/exportRodeoExcel.js';

let inicializado = false;
let recepcionesCache = [];
const seleccionados = new Set();

export function initAserraderoRecepcionRegistrosView() {
  if (inicializado) return;
  inicializado = true;

  document.getElementById('btn-nueva-recepcion')
    ?.addEventListener('click', () => {
      window.showView('aserradero-recepcion-nuevo');
    });

  document.getElementById('btn-exportar-recepciones-seleccionadas')
    ?.addEventListener('click', async () => {
      await _exportarSeleccionados();
    });

  const lista = document.getElementById('aserradero-recepcion-lista');
  lista?.addEventListener('click', async (e) => {
    const card = e.target.closest('[data-recepcion-id]');
    if (!card) return;

    if (e.target.closest('[data-seleccionar]')) {
      const cb = e.target.closest('[data-seleccionar]');
      const id = card.dataset.recepcionId;
      if (cb.checked) {
        seleccionados.add(id);
      } else {
        seleccionados.delete(id);
      }
      _actualizarBarraSeleccion();
      return;
    }

    if (e.target.closest('[data-exportar]')) {
      e.stopPropagation();
      await _exportarIndividual(card.dataset.recepcionId);
      return;
    }

    if (e.target.closest('[data-delete]')) {
      const ok = await confirmar({
        icon: '🗑️',
        titulo: '¿Eliminar recepción?',
        msg: 'Se eliminará la recepción y los árboles volverán a estar disponibles.',
      });
      if (!ok) return;
      await borrarRecepcion(card.dataset.recepcionId);
      seleccionados.delete(card.dataset.recepcionId);
      await cargarAserraderoRecepcionRegistros();
      return;
    }

    if (e.target.closest('[data-confirmar]')) {
      const ok = await confirmar({
        icon: '✅',
        titulo: '¿Confirmar recepción?',
        msg: 'Una vez confirmada no podrás editar ni eliminar esta recepción.',
        okLabel: 'Aceptar',
      });
      if (!ok) return;
      await confirmarRecepcionCab(card.dataset.recepcionId);
      await cargarAserraderoRecepcionRegistros();
      return;
    }

    window.showView('aserradero-recepcion-detalle', card.dataset.recepcionId);
  });

  const buscador = document.getElementById('aserradero-recepcion-buscador');
  buscador?.addEventListener('input', (e) => {
    filtrarCards(e.target.value.trim().toLowerCase());
  });
}

export async function cargarAserraderoRecepcionRegistros() {
  const lista = document.getElementById('aserradero-recepcion-lista');
  const buscador = document.getElementById('aserradero-recepcion-buscador');

  try {
    recepcionesCache = await getRecepciones();

    if (recepcionesCache.length === 0) {
      lista.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🪵</div>
          <div class="empty-state-title">Sin recepciones</div>
          <div class="empty-state-sub">Creá una nueva recepción para dar de baja árboles del rodeo</div>
        </div>
      `;
      if (buscador) buscador.value = '';
      return;
    }

    renderCards(recepcionesCache);
  } catch (err) {
    console.error('[ASERRADERO] Error al cargar recepciones:', err);
    lista.innerHTML = `<div class="empty-state"><div class="empty-state-sub">Error al cargar</div></div>`;
  }
}

function renderCards(listaRecepciones) {
  const lista = document.getElementById('aserradero-recepcion-lista');
  lista.innerHTML = listaRecepciones.map(r => {
    const total = r.cantidad_arboles || 0;
    const confirmado = r.estado === 'CONFIRMADO';
    const badgeEstado = confirmado
      ? '<span style="display:inline-block;background:var(--success);color:#fff;padding:0.15rem 0.5rem;border-radius:1rem;font-size:0.7rem">CONFIRMADO</span>'
      : '<span style="display:inline-block;background:var(--warning);color:#fff;padding:0.15rem 0.5rem;border-radius:1rem;font-size:0.7rem">BORRADOR</span>';
    const seleccionado = seleccionados.has(r.id);

    return `
      <div class="card hoja-card" data-recepcion-id="${r.id}">
        <div class="hoja-card-header">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <input type="checkbox" data-seleccionar="${r.id}" ${seleccionado ? 'checked' : ''} style="width:1.1rem;height:1.1rem;cursor:pointer">
            <div class="hoja-card-num">${r.numero_completo}</div>
          </div>
          <div class="hoja-card-estado">${badgeEstado} · ${total} árbol${total !== 1 ? 'es' : ''}</div>
        </div>
        <div class="hoja-card-body">
          <div class="cefo-datos-grid">
            <div class="cefo-dato">
              <span class="cefo-dato-label">📄 Nro Recepción</span>
              <span class="cefo-dato-valor">${r.nro_recepcion || '—'}</span>
            </div>
            <div class="cefo-dato">
              <span class="cefo-dato-label">📅 Fecha Recepción</span>
              <span class="cefo-dato-valor">${formatearFecha(r.fecha_recepcion)}</span>
            </div>
            <div class="cefo-dato">
              <span class="cefo-dato-label">🚛 Placa</span>
              <span class="cefo-dato-valor ${!r.placa ? 'muted' : ''}">${r.placa || '—'}</span>
            </div>
            <div class="cefo-dato">
              <span class="cefo-dato-label">👤 Chofer</span>
              <span class="cefo-dato-valor ${!r.chofer ? 'muted' : ''}">${r.chofer || '—'}</span>
            </div>
            <div class="cefo-dato">
              <span class="cefo-dato-label">🌲 Total Árboles</span>
              <span class="cefo-dato-valor">${total}</span>
            </div>
          </div>
        </div>
        <div class="hoja-card-actions">
          <button data-exportar="${r.id}" class="btn-icon" title="Exportar Excel">📤</button>
          ${!confirmado ? `<button data-confirmar="${r.id}" class="btn-icon" title="Confirmar recepción">✅</button>` : ''}
          ${!confirmado ? `<button data-delete="${r.id}" class="btn-icon" title="Eliminar">🗑️</button>` : '<span style="font-size:0.75rem;color:var(--text-muted)">🔒 Confirmada</span>'}
        </div>
      </div>
    `;
  }).join('');

  _actualizarBarraSeleccion();
}

function filtrarCards(termino) {
  if (!termino) {
    renderCards(recepcionesCache);
    return;
  }
  const filtrados = recepcionesCache.filter(r =>
    (r.numero_completo || '').toLowerCase().includes(termino) ||
    (r.nro_recepcion || '').toLowerCase().includes(termino) ||
    (r.placa || '').toLowerCase().includes(termino) ||
    (r.chofer || '').toLowerCase().includes(termino)
  );
  renderCards(filtrados);
}

function formatearFecha(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (isNaN(d)) return fecha;
  return d.toLocaleDateString('es-ES');
}

function _actualizarBarraSeleccion() {
  const btn = document.getElementById('btn-exportar-recepciones-seleccionadas');
  if (!btn) return;
  const cantidad = seleccionados.size;
  btn.textContent = cantidad > 0
    ? `📤 Exportar ${cantidad} seleccionado${cantidad !== 1 ? 's' : ''}`
    : '📤 Exportar seleccionados';
  btn.disabled = cantidad === 0;
}

async function _exportarIndividual(recepcionId) {
  const btn = document.querySelector(`[data-recepcion-id="${recepcionId}"] [data-exportar]`);
  const originalText = btn?.textContent;
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳';
  }
  try {
    const datos = await getDatosExportacionRecepcion(recepcionId);
    if (!datos) throw new Error('No se encontraron datos de la recepción');
    await exportarRegistrosArbolesAXLSX([datos], {
      prefijoNombre: 'recepcion_aserradero',
      nombreHoja: 'Recepcion Aserradero',
      campoDocumento: 'numero_completo',
      campoFecha: 'fecha_recepcion',
    });
  } catch (err) {
    console.error('[ASERRADERO] Error exportando recepción:', err);
    alert('❌ ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
}

async function _exportarSeleccionados() {
  if (seleccionados.size === 0) {
    alert('Seleccioná al menos una recepción');
    return;
  }

  const btn = document.getElementById('btn-exportar-recepciones-seleccionadas');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳';

  try {
    const ids = Array.from(seleccionados);
    const registros = [];
    for (const id of ids) {
      const datos = await getDatosExportacionRecepcion(id);
      if (datos) registros.push(datos);
    }
    await exportarRegistrosArbolesAXLSX(registros, {
      prefijoNombre: 'recepciones_aserradero',
      nombreHoja: 'Recepciones Aserradero',
      campoDocumento: 'numero_completo',
      campoFecha: 'fecha_recepcion',
    });
    seleccionados.clear();
    _actualizarBarraSeleccion();
    await cargarAserraderoRecepcionRegistros();
  } catch (err) {
    console.error('[ASERRADERO] Error exportando seleccionados:', err);
    alert('❌ ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}
