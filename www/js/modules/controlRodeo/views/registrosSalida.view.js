import { getSalidas, borrarSalida, confirmarSalidaCab, getDatosExportacionSalida } from '../../../services/cefoSalida.service.js';
import { confirmar } from '../../../utils/confirm.js';
import { exportarRegistrosArbolesAXLSX } from '../../../utils/exportRodeoExcel.js';

let inicializado = false;
let salidasCache = [];
const seleccionados = new Set();

export function initRegistrosSalidaView() {
  if (inicializado) return;
  inicializado = true;

  document.getElementById('btn-nueva-salida')
    ?.addEventListener('click', () => {
      window.showView('control-rodeo-salida-nuevo');
    });

  document.getElementById('btn-exportar-salidas-seleccionadas')
    ?.addEventListener('click', async () => {
      await _exportarSeleccionados();
    });

  const lista = document.getElementById('salida-lista');
  lista?.addEventListener('click', async (e) => {
    const card = e.target.closest('[data-salida-id]');
    if (!card) return;

    if (e.target.closest('[data-seleccionar]')) {
      const cb = e.target.closest('[data-seleccionar]');
      const id = card.dataset.salidaId;
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
      await _exportarIndividual(card.dataset.salidaId);
      return;
    }

    if (e.target.closest('[data-delete]')) {
      const ok = await confirmar({
        icon: '🗑️',
        titulo: '¿Eliminar despacho?',
        msg: 'Se eliminará el despacho de monte y los árboles volverán a estar disponibles.',
      });
      if (!ok) return;
      await borrarSalida(card.dataset.salidaId);
      seleccionados.delete(card.dataset.salidaId);
      await cargarRegistrosSalida();
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
    const seleccionado = seleccionados.has(s.id);

    return `
      <div class="card hoja-card" data-salida-id="${s.id}">
        <div class="hoja-card-header">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <input type="checkbox" data-seleccionar="${s.id}" ${seleccionado ? 'checked' : ''} style="width:1.1rem;height:1.1rem;cursor:pointer">
            <div class="hoja-card-num">${s.numero_completo}</div>
          </div>
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
          <button data-exportar="${s.id}" class="btn-icon" title="Exportar Excel">📤</button>
          ${!confirmado ? `<button data-confirmar="${s.id}" class="btn-icon" title="Confirmar despacho">✅</button>` : ''}
          ${!confirmado ? `<button data-delete="${s.id}" class="btn-icon" title="Eliminar">🗑️</button>` : '<span style="font-size:0.75rem;color:var(--text-muted)">🔒 Confirmado</span>'}
        </div>
      </div>
    `;
  }).join('');

  _actualizarBarraSeleccion();
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

function _actualizarBarraSeleccion() {
  const btn = document.getElementById('btn-exportar-salidas-seleccionadas');
  if (!btn) return;
  const cantidad = seleccionados.size;
  btn.textContent = cantidad > 0
    ? `📤 Exportar ${cantidad} seleccionado${cantidad !== 1 ? 's' : ''}`
    : '📤 Exportar seleccionados';
  btn.disabled = cantidad === 0;
}

async function _exportarIndividual(salidaId) {
  const btn = document.querySelector(`[data-salida-id="${salidaId}"] [data-exportar]`);
  const originalText = btn?.textContent;
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳';
  }
  try {
    const datos = await getDatosExportacionSalida(salidaId);
    if (!datos) throw new Error('No se encontraron datos del despacho');
    await exportarRegistrosArbolesAXLSX([datos], {
      prefijoNombre: 'despacho_monte',
      nombreHoja: 'Despacho Monte',
      campoDocumento: 'numero_completo',
      campoFecha: 'fecha_despacho',
    });
  } catch (err) {
    console.error('[MONTE] Error exportando:', err);
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
    alert('Seleccioná al menos un despacho');
    return;
  }

  const btn = document.getElementById('btn-exportar-salidas-seleccionadas');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳';

  try {
    const ids = Array.from(seleccionados);
    const registros = [];
    for (const id of ids) {
      const datos = await getDatosExportacionSalida(id);
      if (datos) registros.push(datos);
    }
    await exportarRegistrosArbolesAXLSX(registros, {
      prefijoNombre: 'despachos_monte',
      nombreHoja: 'Despachos Monte',
      campoDocumento: 'numero_completo',
      campoFecha: 'fecha_despacho',
    });
    seleccionados.clear();
    _actualizarBarraSeleccion();
    await cargarRegistrosSalida();
  } catch (err) {
    console.error('[MONTE] Error exportando seleccionados:', err);
    alert('❌ ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}
