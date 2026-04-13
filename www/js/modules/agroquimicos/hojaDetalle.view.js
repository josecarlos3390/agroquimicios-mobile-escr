import { agregarDetalleHoja } from '../../services/hojasDetalle.service.js';
import { getHojaCabById } from '../../repositories/hojasCab.repo.js';
import { executeQuery, executeRun } from '../../db/sqlite.js';
import { listarProductosActivos } from '../../services/productos.service.js';
import { listarUnidadesByProducto } from '../../services/unidadesMedida.service.js';
import { confirmar } from '../../utils/confirm.js';

let hojaActual        = null;
let todosLosProductos = [];
let lineasCache       = []; // caché local — evita re-consultar la BD en cada cambio

/* =========================
   HELPER: formato dd/mm/yyyy
========================= */
function formatFecha(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

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
        await executeRun(
          'DELETE FROM hojas_detalle WHERE id = ?',
          [e.target.dataset.deleteLinea]
        );
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

    await executeRun(
      'UPDATE hojas_detalle SET cantidad = ?, dosis = ? WHERE id = ?',
      [cantidad, dosis, id]
    );

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

  // Resumen cabecera
  document.getElementById('detalle-hoja-numero').textContent    = hojaActual.numero_completo;
  document.getElementById('detalle-hoja-campana').textContent   = hojaActual.campana;
  document.getElementById('detalle-hoja-fecha').textContent     =
    `${formatFecha(hojaActual.fecha_inicio)} → ${formatFecha(hojaActual.fecha_fin)}`;
  document.getElementById('detalle-hoja-hectareas').textContent =
    `${hojaActual.cantidad_hectareas} ha`;

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
  lineasCache = await executeQuery(
    `SELECT 
       hd.id, hd.linea, hd.cantidad, hd.dosis,
       hd.producto_id, hd.producto_codigo, hd.producto_nombre,
       hd.unidad_medida_id
     FROM hojas_detalle hd
     WHERE hd.hoja_id = ?
     ORDER BY hd.linea`,
    [hojaActual.id]
  );

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
          <span>📦 ${l.cantidad}</span>
          <span>💧 Dosis: ${parseFloat(l.dosis).toFixed(3)}</span>
        </div>
      </div>
    `;
    tbody.appendChild(div);
  });
}