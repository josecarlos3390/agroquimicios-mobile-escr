import { listarGuias, eliminarGuia, prepararExcelGuiaTransporte, actualizarEstadoGuia } from '../services/guiaTransporteCana.service.js';
import { getEmpresaActiva } from '../../../services/empresas.service.js';
import { confirmar } from '../../../utils/confirm.js';
import { formatFecha } from '../../../utils/fecha.js';

let inicializado = false;
let estadoFiltro = 'BORRADOR';
let _idsSeleccionados = new Set();

export function initRegistrosGuiaTransporteView() {
  if (inicializado) return;
  inicializado = true;

  const section = document.getElementById('view-guia-transporte-registros');
  if (!section) return;

  const filtro = document.getElementById('filtro-estado-guia-transporte');
  if (filtro) {
    filtro.addEventListener('change', () => {
      estadoFiltro = filtro.value;
      _idsSeleccionados.clear();
      actualizarToolbar();
      cargarRegistrosGuiaTransporte();
    });
  }

  const chkTodos = document.getElementById('gt-seleccionar-todos');
  if (chkTodos) {
    chkTodos.addEventListener('change', () => {
      const cards = section.querySelectorAll('.guia-card');
      cards.forEach(card => {
        const id = card.dataset.id;
        const chk = card.querySelector('.gt-chk');
        if (!id || !chk) return;
        chk.checked = chkTodos.checked;
        if (chkTodos.checked) _idsSeleccionados.add(id);
        else _idsSeleccionados.delete(id);
      });
      actualizarToolbar();
    });
  }

  document.getElementById('btn-exportar-seleccionadas')?.addEventListener('click', async () => {
    const ids = Array.from(_idsSeleccionados);
    if (ids.length === 0) { alert('Seleccioná al menos una guía'); return; }
    const btn = document.getElementById('btn-exportar-seleccionadas');
    const textoOriginal = btn.textContent;
    btn.disabled = true; btn.textContent = '⏳';
    try {
      await exportarGuias(ids);
    } catch (err) {
      alert('❌ ' + err.message);
    } finally {
      btn.disabled = false; btn.textContent = textoOriginal;
    }
  });

  section.addEventListener('click', async e => {
    const btnNueva = e.target.closest('#btn-nueva-guia-transporte');
    if (btnNueva) {
      window.showView('guia-transporte-nuevo');
      return;
    }

    const chk = e.target.closest('.gt-chk');
    if (chk) {
      const card = chk.closest('.guia-card');
      const id = card?.dataset?.id;
      if (id) {
        if (chk.checked) _idsSeleccionados.add(id);
        else _idsSeleccionados.delete(id);
      }
      actualizarToolbar();
      return;
    }

    const card = e.target.closest('.guia-card');
    if (!card) return;
    const id = card.dataset.id;
    if (!id) return;

    if (e.target.closest('.btn-editar-guia')) {
      window.showView('guia-transporte-editar', id);
      return;
    }

    if (e.target.closest('.btn-enviar-guia')) {
      const btn = e.target.closest('.btn-enviar-guia');
      const textoOriginal = btn.textContent;
      btn.disabled = true; btn.textContent = '⏳';
      try {
        await exportarGuias([id]);
      } catch (err) {
        alert('❌ ' + err.message);
      } finally {
        btn.disabled = false; btn.textContent = textoOriginal;
      }
      return;
    }

    if (e.target.closest('.btn-eliminar-guia')) {
      const ok = await confirmar({ titulo: 'Eliminar guía', msg: '¿Eliminar esta guía de transporte?' });
      if (!ok) return;
      try {
        await eliminarGuia(id);
        _idsSeleccionados.delete(id);
        actualizarToolbar();
        await cargarRegistrosGuiaTransporte();
      } catch (err) {
        alert('❌ ' + err.message);
      }
      return;
    }

    window.showView('guia-transporte-detalle', id);
  });
}

async function exportarGuias(ids) {
  const { base64, nombre } = await prepararExcelGuiaTransporte(ids);
  const { Filesystem, Share } = window.Capacitor.Plugins;
  const base64Limpio = base64.includes(',') ? base64.split(',')[1] : base64;
  const dataUri = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64Limpio}`;
  const resultado = await Filesystem.writeFile({ path: nombre, data: dataUri, directory: 'CACHE', recursive: true });
  await Share.share({
    title: 'Guía de Transporte de Caña - AgroApp',
    text: `Exportación: ${nombre}`,
    files: [resultado.uri],
    dialogTitle: '¿Dónde querés enviar el Excel?'
  });
  for (const id of ids) {
    await actualizarEstadoGuia(id, 'EXPORTADO');
  }
  _idsSeleccionados.clear();
  actualizarToolbar();
  await cargarRegistrosGuiaTransporte();
}

function actualizarToolbar() {
  const toolbar = document.getElementById('guia-transporte-toolbar');
  const chkTodos = document.getElementById('gt-seleccionar-todos');
  if (toolbar) {
    toolbar.style.display = _idsSeleccionados.size > 0 ? 'flex' : 'none';
  }
  const btn = document.getElementById('btn-exportar-seleccionadas');
  if (btn) {
    btn.textContent = `📤 Exportar ${_idsSeleccionados.size}`;
  }
  if (chkTodos) {
    const totalCards = document.querySelectorAll('.guia-card').length;
    chkTodos.checked = totalCards > 0 && _idsSeleccionados.size === totalCards;
  }
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
      actualizarToolbar();
      return;
    }

    lista.innerHTML = filtradas.map(g => `
      <div class="card guia-card" data-id="${g.id}">
        <div class="hoja-card-header">
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <input type="checkbox" class="gt-chk" ${_idsSeleccionados.has(g.id) ? 'checked' : ''} style="width:1.1rem;height:1.1rem;cursor:pointer;">
            <div class="hoja-card-title">${g.numero_completo}</div>
          </div>
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
          <button type="button" class="btn-editar-guia">
            ✏️ Editar
          </button>
          <button type="button" class="btn-enviar-guia">
            📤 Exportar
          </button>
          <button type="button" class="btn-eliminar-guia">
            🗑️ Eliminar
          </button>
        </div>
      </div>
    `).join('');

    actualizarToolbar();
  } catch (err) {
    console.error('[GUIA-TRANSPORTE] Error cargando guías:', err);
    lista.innerHTML = `<p class="empty-state">❌ Error al cargar guías</p>`;
  }
}
