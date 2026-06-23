import { agregarDetalleHoja } from '../../services/hojasDetalle.service.js';
import { getHojaCabById } from '../../repositories/hojasCab.repo.js';
import { getSectoresByHojaId } from '../../repositories/hojasSectores.repo.js';
import { getLotesByHojaId } from '../../repositories/hojasLotes.repo.js';
import { deleteDetalleLinea, getDetalleByHojaId, updateDetalleCantidadDosis } from '../../repositories/hojasDetalle.repo.js';
import { listarProductosActivos } from '../../services/productos.service.js';
import { listarUnidadesByProducto } from '../../services/unidadesMedida.service.js';
import { confirmar } from '../../utils/confirm.js';
import { formatFecha } from '../../utils/fecha.js';

let hojaActual        = null;
let todosLosProductos = [];
let lineasCache       = []; // caché local — evita re-consultar la BD en cada cambio

export function initHojaDetalleView() {

  // Limpiar listener de cierre anterior si existe
  if (document._cerrarBuscador) {
    document.removeEventListener('click', document._cerrarBuscador);
    document._cerrarBuscador = null;
  }

  const buscarInput    = document.getElementById('detalle-producto-buscar');
  const resultadosDiv  = document.getElementById('detalle-producto-resultados');
  const productoHidden = document.getElementById('detalle-producto');
  const unidadSelect   = document.getElementById('detalle-unidad');

  /* =========================
     BÚSQUEDA EN VIVO
  ========================= */
  buscarInput.oninput = () => {
    const q = buscarInput.value.toLowerCase().trim();
    productoHidden.value = '';

    if (q.length < 2) {
      resultadosDiv.style.display = 'none';
      return;
    }

    const filtrados = todosLosProductos.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      p.codigo.toLowerCase().includes(q)
    );

    if (filtrados.length === 0) {
      resultadosDiv.innerHTML =
        '<div class="resultado-item" style="color:var(--text-muted)">Sin resultados</div>';
      resultadosDiv.style.display = 'block';
      return;
    }

    resultadosDiv.innerHTML = filtrados.map(p => `
      <div class="resultado-item"
           data-id="${p.id}"
           data-codigo="${p.codigo}"
           data-nombre="${p.nombre}">
        <strong>${p.codigo}</strong> — ${p.nombre}
        <small style="color:var(--text-muted)"> · ${p.tipo_producto}</small>
      </div>
    `).join('');

    resultadosDiv.style.display = 'block';
  };

  // Seleccionar producto del dropdown
  resultadosDiv.onclick = async (e) => {
    const item = e.target.closest('.resultado-item');
    if (!item || !item.dataset.id) return;

    productoHidden.value = item.dataset.id;
    buscarInput.value    = `${item.dataset.codigo} – ${item.dataset.nombre}`;
    resultadosDiv.style.display = 'none';

    unidadSelect.innerHTML = '<option value="">Cargando...</option>';
    unidadSelect.disabled  = true;

    const unidades = await listarUnidadesByProducto(item.dataset.id);
    unidadSelect.innerHTML = '<option value="">Seleccione unidad</option>';
    unidades.forEach(u => {
      const opt       = document.createElement('option');
      opt.value       = u.unidad_medida_id;
      opt.textContent = `${u.codigo} – ${u.nombre}`;
      // Auto-seleccionar la unidad default del producto
      if (u.es_default) opt.selected = true;
      unidadSelect.appendChild(opt);
    });
    unidadSelect.disabled = false;

    // Mover foco a cantidad para agilizar el ingreso
    document.getElementById('detalle-cantidad').focus();
  };

  // Evitar que tocar el dropdown lo cierre inmediatamente en mobile
  resultadosDiv.addEventListener('touchstart', e => {
    e.stopPropagation();
  }, { passive: true });

  // Cerrar dropdown al tocar fuera
  document._cerrarBuscador = (e) => {
    if (!e.target.closest('.buscar-wrapper')) {
      resultadosDiv.style.display = 'none';
    }
  };
  document.addEventListener('click', document._cerrarBuscador);

  /* =========================
     AGREGAR LÍNEA
  ========================= */
  document.getElementById('btn-agregar-detalle').onclick = async () => {
    const productoId = productoHidden.value;
    const unidadId   = unidadSelect.value;
    const cantidad   = parseFloat(document.getElementById('detalle-cantidad').value);

    if (!productoId || !unidadId || !cantidad || cantidad <= 0) {
      alert('Complete todos los campos del producto');
      return;
    }

    try {
      await agregarDetalleHoja({
        hoja_id:          hojaActual.id,
        producto_id:      productoId,
        unidad_medida_id: unidadId,
        cantidad
      });

      // Limpiar campos
      buscarInput.value      = '';
      productoHidden.value   = '';
      unidadSelect.innerHTML = '<option value="">Seleccione unidad</option>';
      unidadSelect.disabled  = true;
      document.getElementById('detalle-cantidad').value = '';

      await refrescarTablaDetalle();

    } catch (err) {
      alert('❌ ' + err.message);
    }
  };

  /* =========================
     EDITAR / ELIMINAR LÍNEA
  ========================= */
  // Usamos onclick en el contenedor para evitar duplicados sin necesidad de clonar
  const viewDetalle = document.getElementById('view-hoja-detalle');
  viewDetalle.onclick = async (e) => {

    // ELIMINAR
    if (e.target.dataset.deleteLinea) {
      const ok = await confirmar({
        icon:    '🗑️',
        titulo:  '¿Eliminar línea?',
        msg:     'Se quitará este producto de la hoja.',
        okLabel: 'Sí, eliminar',
      });
      if (ok) {
        await deleteDetalleLinea(e.target.dataset.deleteLinea);
        await refrescarTablaDetalle();
      }
      return;
    }

    // EDITAR
    if (e.target.dataset.editLinea) {
      document.getElementById('edit-linea-id').value       = e.target.dataset.editLinea;
      document.getElementById('edit-linea-cantidad').value = e.target.dataset.cantidad;
      // FIX #6: mostrar nombre del producto para contexto
      const nombreEl = document.getElementById('edit-linea-producto-nombre');
      if (nombreEl) nombreEl.textContent = e.target.dataset.nombre ?? '';
      document.getElementById('modal-editar-linea').classList.remove('hidden');
    }
  };

  document.getElementById('btn-cancelar-editar-linea').onclick = () => {
    document.getElementById('modal-editar-linea').classList.add('hidden');
  };

  document.getElementById('form-editar-linea').onsubmit = async (e) => {
    e.preventDefault();

    const id       = document.getElementById('edit-linea-id').value;
    const cantidad = parseFloat(document.getElementById('edit-linea-cantidad').value);
    const dosis    = cantidad / hojaActual.cantidad_hectareas;

    await updateDetalleCantidadDosis(id, cantidad, dosis);

    document.getElementById('modal-editar-linea').classList.add('hidden');
    await refrescarTablaDetalle();
  };

  document.getElementById('btn-detalle-volver').onclick = () => {
    window.showView('hojas');
  };

  document.getElementById('btn-finalizar-hoja').onclick = () => {
    window.showView('hojas');
  };
}

/* =========================
   CARGA INICIAL
========================= */
export async function cargarHojaDetalle(hojaId) {
  hojaActual = await getHojaCabById(hojaId);

  if (!hojaActual) {
    alert('Hoja no encontrada');
    return;
  }

  // Resumen cabecera (datos completos como en edición)
  const [sectores, lotes] = await Promise.all([
    getSectoresByHojaId(hojaId),
    getLotesByHojaId(hojaId)
  ]);
  renderCabeceraHojaDetalle(hojaActual, sectores, lotes);

  // Cargar productos en memoria para búsqueda (solo de esta empresa)
  todosLosProductos = await listarProductosActivos(hojaActual.empresa_id);

  // Limpiar campos del buscador
  document.getElementById('detalle-producto-buscar').value        = '';
  document.getElementById('detalle-producto').value               = '';
  document.getElementById('detalle-producto-resultados').style.display = 'none';
  document.getElementById('detalle-unidad').innerHTML             =
    '<option value="">Seleccione unidad</option>';
  document.getElementById('detalle-unidad').disabled              = true;
  document.getElementById('detalle-cantidad').value               = '';

  await refrescarTablaDetalle();
}

/* =========================
   TABLA DETALLE
========================= */
async function refrescarTablaDetalle() {
  const tbody = document.getElementById('detalle-body');

  // Actualizar caché desde BD con campos explícitos (evita SELECT *)
  lineasCache = await getDetalleByHojaId(hojaActual.id);

  renderTablaDetalle(lineasCache);
}

function renderTablaDetalle(lineas) {
  const tbody = document.getElementById('detalle-body');
  tbody.innerHTML = '';

  if (lineas.length === 0) {
    tbody.innerHTML = `
      <div style="text-align:center; padding:1.5rem; color:var(--text-muted)">
        Sin productos agregados
      </div>
    `;
    return;
  }

  lineas.forEach(l => {
    const unidad = l.unidad_medida_codigo || l.unidad_medida_nombre || '—';
    const div     = document.createElement('div');
    div.innerHTML = `
      <div class="detalle-card">
        <div class="detalle-card-header">
          <span class="detalle-linea">#${l.linea}</span>
          <span class="detalle-card-codigo">${l.producto_codigo}</span>
          <div class="detalle-card-acciones">
            <button data-edit-linea="${l.id}" data-cantidad="${l.cantidad}" data-nombre="${l.producto_nombre}">✏️</button>
            <button data-delete-linea="${l.id}">🗑️</button>
          </div>
        </div>
        <div class="detalle-card-nombre">${l.producto_nombre}</div>
        <div class="detalle-card-body">
          <span>📦 ${l.cantidad} ${unidad}</span>
          <span>💧 Dosis: ${parseFloat(l.dosis).toFixed(3)} ${unidad}/ha</span>
        </div>
      </div>
    `;
    tbody.appendChild(div);
  });
}

/* =========================
   CABECERA COMPLETA
========================= */
function renderCabeceraHojaDetalle(hoja, sectores, lotes) {
  document.getElementById('detalle-hoja-numero').textContent          = hoja.numero_completo || '—';
  document.getElementById('detalle-hoja-empresa').textContent         = hoja.empresa_nombre || '—';
  document.getElementById('detalle-hoja-tecnico').textContent         = hoja.tecnico_nombre || '—';
  document.getElementById('detalle-hoja-tipo-aplicacion').textContent = hoja.tipo_aplicacion_nombre || '—';
  document.getElementById('detalle-hoja-caudal').textContent          = hoja.caudal_descripcion || '—';
  document.getElementById('detalle-hoja-campana').textContent         = hoja.campana || '—';
  document.getElementById('detalle-hoja-fecha').textContent           =
    `${formatFecha(hoja.fecha_inicio)} → ${formatFecha(hoja.fecha_fin)}`;
  document.getElementById('detalle-hoja-cultivo').textContent         = hoja.cultivo_nombre || '—';
  document.getElementById('detalle-hoja-variedad').textContent        = hoja.variedad_nombre || 'Sin variedad';
  document.getElementById('detalle-hoja-hectareas').textContent       =
    `${hoja.cantidad_hectareas ?? 0} ha`;
  document.getElementById('detalle-hoja-mes').textContent             = hoja.mes || '—';
  document.getElementById('detalle-hoja-estado').textContent          = hoja.estado || '—';

  const obsEl = document.getElementById('detalle-hoja-observaciones');
  if (obsEl) obsEl.textContent = hoja.observaciones || 'Sin observaciones';

  renderSectoresDetalle(sectores);
  renderLotesDetalle(lotes);
}

/* =========================
   SECTORES (solo lectura)
========================= */
function renderSectoresDetalle(sectores) {
  const container = document.getElementById('detalle-sectores-container');
  if (!container) return;

  if (sectores.length === 0) {
    container.innerHTML = `
      <strong>🗺️ Sectores</strong>
      <p style="color:var(--text-muted); margin:0.25rem 0 0;">No hay sectores asignados</p>
    `;
    return;
  }

  container.innerHTML = `
    <strong>🗺️ Sectores</strong>
    <div class="chip-row" style="margin-top:0.4rem;">
      ${sectores.map(s => `
        <span class="sector-chip activo" style="cursor:default;">
          <svg class="chip-leaf" viewBox="0 0 14 14" fill="none">
            <path class="chip-leaf-bg" d="M7 1C4 1 2 4 2 7s2 6 5 6 5-3 5-6-2-6-5-6z"/>
            <path class="chip-leaf-vein" d="M7 3v8M4 6c1-1 2-1 3 0s2 1 3 0" stroke-width="0.8" stroke-linecap="round"/>
          </svg>
          <span class="chip-nombre">${s.nombre}</span>
          ${s.hectareas ? `<span class="chip-ha">${s.hectareas} ha</span>` : ''}
        </span>
      `).join('')}
    </div>
  `;
}

/* =========================
   LOTES (solo lectura)
========================= */
function renderLotesDetalle(lotes) {
  const container = document.getElementById('detalle-lotes-container');
  if (!container) return;

  if (lotes.length === 0) {
    container.innerHTML = `
      <strong>🌿 Lotes</strong>
      <p style="color:var(--text-muted); margin:0.25rem 0 0;">No hay lotes asignados</p>
    `;
    return;
  }

  // Agrupar por sector
  const porSector = new Map();
  lotes.forEach(l => {
    if (!porSector.has(l.sector_id)) {
      porSector.set(l.sector_id, { nombre: l.sector_nombre, lotes: [], haTotal: 0 });
    }
    const g = porSector.get(l.sector_id);
    g.lotes.push(l);
    g.haTotal += parseFloat(l.hectareas_aplicadas ?? 0);
  });

  const acordeonesHTML = [...porSector.entries()].map(([sId, grupo]) => `
    <div class="sector-acordeon abierto" data-sector-id="${sId}">
      <div class="sector-acordeon-header" style="cursor:default;">
        <div class="sector-acordeon-titulo">
          <span>🗺️ ${grupo.nombre}</span>
          <span class="sector-acordeon-meta">
            ${grupo.lotes.length} lote${grupo.lotes.length !== 1 ? 's' : ''}
            ${grupo.haTotal > 0 ? ` · ${grupo.haTotal.toFixed(2)} ha aplicadas` : ''}
          </span>
        </div>
      </div>
      <div class="sector-acordeon-body" style="display:block;">
        ${grupo.lotes.map(l => `
          <div class="lote-label" style="padding:0.35rem 0; border-bottom:1px solid var(--border);">
            <span class="lote-label-info" style="flex:1; min-width:0;">
              <span class="lote-nombre">${l.nombre}</span>
              <span class="lote-meta">
                ${l.hectareas_aplicadas ?? '-'} ha aplicadas
                ${l.cultivo_nombre ? ` · ${l.cultivo_nombre}` : ''}
                ${l.variedad_nombre ? ` / ${l.variedad_nombre}` : ''}
              </span>
            </span>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <strong>🌿 Lotes</strong>
    <div style="margin-top:0.4rem; display:flex; flex-direction:column; gap:0.5rem;">
      ${acordeonesHTML}
    </div>
  `;
}