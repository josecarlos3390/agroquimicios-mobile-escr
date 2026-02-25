import {
  listarProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  asignarUnidadesAProducto
} from '../services/productos.service.js';

import { executeQuery } from '../db/sqlite.js';
import { getUnidadesByProducto, replaceUnidadesProducto } from '../repositories/productosUnidades.repo.js';

let inicializado = false;
let todasLasUnidades = []; // cache de unidades disponibles

export function initProductosView() {
  if (inicializado) return;
  inicializado = true;

  const form  = document.getElementById('producto-form');
  const modal = document.getElementById('producto-modal');

  // Nuevo
  document.getElementById('btn-nuevo-producto').onclick = async () => {
    form.reset();
    document.getElementById('producto-id').value = '';
    document.getElementById('producto-modal-titulo').textContent = '🧪 Nuevo producto';
    await cargarTiposProducto();
    await cargarUnidadesDisponibles();
    resetUnidades();
    modal.classList.remove('hidden');
  };

  // Cancelar
  document.getElementById('btn-cancelar-producto').onclick = () => {
    modal.classList.add('hidden');
  };

  // Agregar unidad extra
  document.getElementById('btn-agregar-unidad-extra').onclick = () => {
    agregarFilaUnidadExtra();
  };

  // Submit
  form.addEventListener('submit', async e => {
    e.preventDefault();

    const id     = document.getElementById('producto-id').value;
    const codigo = document.getElementById('producto-codigo').value.trim().toUpperCase();
    const nombre = document.getElementById('producto-nombre').value.trim().toUpperCase();
    const tipo   = document.getElementById('producto-tipo').value;

    const unidadDefault = document.getElementById('producto-unidad-default').value;
    if (!unidadDefault) {
      alert('Debe seleccionar una unidad por defecto');
      return;
    }

    // Armar array de unidades: default + extras
    const unidades = [{ unidad_medida_id: unidadDefault, es_default: 1 }];

    document.querySelectorAll('.unidad-extra-select').forEach(sel => {
      if (sel.value && sel.value !== unidadDefault) {
        unidades.push({ unidad_medida_id: sel.value, es_default: 0 });
      }
    });

    try {
      if (id) {
        await actualizarProducto(id, { codigo, nombre, tipo_producto_id: tipo });
        await replaceUnidadesProducto(id, unidades);
      } else {
        const nuevoId = await crearProducto({ codigo, nombre, tipo_producto_id: tipo });
        await asignarUnidadesAProducto(nuevoId, unidades);
      }

      modal.classList.add('hidden');
      cargarProductos();

    } catch (err) {
      alert('❌ ' + err.message);
    }
  });

  // Editar / Eliminar via delegación
  document.getElementById('view-productos').addEventListener('click', async e => {

    if (e.target.dataset.edit) {
      const id = e.target.dataset.edit;
      const productos = await listarProductos();
      const p = productos.find(x => String(x.id) === String(id));
      if (!p) return;

      document.getElementById('producto-id').value     = p.id;
      document.getElementById('producto-codigo').value = p.codigo;
      document.getElementById('producto-nombre').value = p.nombre;
      document.getElementById('producto-modal-titulo').textContent = '✏️ Editar producto';

      await cargarTiposProducto();
      document.getElementById('producto-tipo').value = p.tipo_producto_id;

      await cargarUnidadesDisponibles();
      resetUnidades();

      // Pre-cargar unidades ya asignadas
      const unidades = await getUnidadesByProducto(p.id);
      const defecto  = unidades.find(u => u.es_default === 1);
      const extras   = unidades.filter(u => u.es_default === 0);

      if (defecto) {
        document.getElementById('producto-unidad-default').value = defecto.unidad_medida_id;
      }

      extras.forEach(u => agregarFilaUnidadExtra(u.unidad_medida_id));

      document.getElementById('producto-modal').classList.remove('hidden');
    }

    if (e.target.dataset.delete) {
      if (confirm('¿Desactivar producto?')) {
        await eliminarProducto(e.target.dataset.delete);
        cargarProductos();
      }
    }
  });
}

/* =========================
   UNIDADES - HELPERS
========================= */
async function cargarUnidadesDisponibles() {
  todasLasUnidades = await executeQuery(
    'SELECT id, codigo, nombre FROM unidades_medida ORDER BY codigo'
  );

  const select = document.getElementById('producto-unidad-default');
  select.innerHTML = '<option value="">Seleccione unidad</option>';
  todasLasUnidades.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = `${u.codigo} – ${u.nombre}`;
    select.appendChild(opt);
  });
}

function resetUnidades() {
  document.getElementById('producto-unidad-default').value = '';
  document.getElementById('producto-unidades-extra').innerHTML = '';
}

function agregarFilaUnidadExtra(valorSeleccionado = null) {
  const container = document.getElementById('producto-unidades-extra');

  const fila = document.createElement('div');
  fila.style.cssText = 'display:flex; gap:0.5rem; align-items:center';

  const select = document.createElement('select');
  select.className = 'unidad-extra-select';
  select.style.flex = '1';
  select.innerHTML = '<option value="">Seleccione unidad</option>';

  todasLasUnidades.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = `${u.codigo} – ${u.nombre}`;
    if (String(u.id) === String(valorSeleccionado)) opt.selected = true;
    select.appendChild(opt);
  });

  const btnQuitar = document.createElement('button');
  btnQuitar.type = 'button';
  btnQuitar.textContent = '✖';
  btnQuitar.style.cssText = 'width:34px; height:34px; padding:0; background:var(--danger-light); color:var(--danger); border:1px solid var(--danger); border-radius:var(--radius-sm); box-shadow:none; flex-shrink:0';
  btnQuitar.onclick = () => fila.remove();

  fila.appendChild(select);
  fila.appendChild(btnQuitar);
  container.appendChild(fila);
}

/* =========================
   RENDER PRODUCTOS
========================= */
export async function cargarProductos() {
  const tbody     = document.getElementById('productos-body');
  const productos = await listarProductos();

  tbody.innerHTML = '';

  if (productos.length === 0) {
    tbody.innerHTML = `
      <div style="text-align:center; padding:1.5rem; color:var(--text-muted)">
        Sin productos
      </div>
    `;
    return;
  }

  productos.forEach(p => {
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="producto-card">
        <div class="producto-card-header">
          ${p.codigo ? `<span class="producto-codigo">${p.codigo}</span>` : ''}
          <span class="producto-nombre">${p.nombre}</span>
          <div class="producto-acciones">
            <button data-edit="${p.id}">✏️</button>
            <button data-delete="${p.id}">🗑️</button>
          </div>
        </div>
        <div class="producto-card-body">
          <span>🏷️ ${p.tipo_producto ?? '—'}</span>
          <span>${p.activo ? '✅ Activo' : '❌ Inactivo'}</span>
        </div>
      </div>
    `;
    tbody.appendChild(div);
  });
}

/* =========================
   TIPOS PRODUCTO
========================= */
async function cargarTiposProducto() {
  const select = document.getElementById('producto-tipo');
  const tipos  = await executeQuery('SELECT id, nombre FROM tipos_producto ORDER BY nombre');

  select.innerHTML = '<option value="">Seleccione tipo</option>';
  tipos.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.nombre;
    select.appendChild(opt);
  });
}