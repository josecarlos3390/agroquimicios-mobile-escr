import {
  listarProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  asignarUnidadesAProducto
} from '../services/productos.service.js';
import { confirmar } from '../utils/confirm.js';
import { getEmpresaActiva } from '../services/empresas.service.js';
import { listarUnidadesMedida } from '../services/unidadesMedida.service.js';
import { listarTiposProducto } from '../services/tiposProducto.service.js';

import { getUnidadesByProducto, replaceUnidadesProducto } from '../repositories/productosUnidades.repo.js';

let inicializado = false;
let todasLasUnidades = []; // cache de unidades disponibles
let _todosLosProductos = []; // cache para búsqueda

export function initProductosView() {
  if (inicializado) return;
  inicializado = true;

  const form  = document.getElementById('producto-form');
  const modal = document.getElementById('producto-modal');

  // Buscador en tiempo real
  const searchInput = document.getElementById('productos-search');
  const searchClear = document.getElementById('productos-search-clear');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim();
      searchClear.style.display = q ? 'block' : 'none';
      renderProductosFiltrados(q);
    });
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchClear.style.display = 'none';
      renderProductosFiltrados('');
    });
  }

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
        const empresa = getEmpresaActiva();
        const nuevoId = await crearProducto({ codigo, nombre, tipo_producto_id: tipo, empresa_id: empresa?.id });
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
      const empresa = getEmpresaActiva();
      const productos = await listarProductos(empresa?.id);
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
      const ok = await confirmar({ icon: '⚠️', titulo: '¿Desactivar producto?', msg: 'El producto quedará inactivo y no aparecerá en nuevas hojas.', okLabel: 'Sí, desactivar', okClass: 'modal-confirm-btn-danger' });
      if (ok) {
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
  todasLasUnidades = await listarUnidadesMedida();

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
  const empresa   = getEmpresaActiva();
  _todosLosProductos = await listarProductos(empresa?.id);

  // Limpiar buscador al recargar
  const searchInput = document.getElementById('productos-search');
  const searchClear = document.getElementById('productos-search-clear');
  if (searchInput) { searchInput.value = ''; }
  if (searchClear) { searchClear.style.display = 'none'; }

  renderProductosFiltrados('');
}

function renderProductosFiltrados(query) {
  const tbody   = document.getElementById('productos-body');
  const countEl = document.getElementById('productos-count');

  const q = query.toLowerCase().trim();
  const productos = q
    ? _todosLosProductos.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        (p.codigo && p.codigo.toLowerCase().includes(q)) ||
        (p.tipo_producto && p.tipo_producto.toLowerCase().includes(q))
      )
    : _todosLosProductos;

  tbody.innerHTML = '';

  if (countEl) {
    countEl.textContent = q
      ? `${productos.length} de ${_todosLosProductos.length} producto${_todosLosProductos.length !== 1 ? 's' : ''}`
      : `${_todosLosProductos.length} producto${_todosLosProductos.length !== 1 ? 's' : ''}`;
  }

  if (productos.length === 0) {
    tbody.innerHTML = `
      <div style="text-align:center; padding:1.5rem; color:var(--text-muted)">
        ${q ? 'Sin resultados para "<strong>' + query + '</strong>"' : 'Sin productos'}
      </div>
    `;
    return;
  }

  productos.forEach(p => {
    const div = document.createElement('div');
    const nombre = q ? resaltarTexto(p.nombre, q) : p.nombre;
    const codigo = p.codigo ? (q ? resaltarTexto(p.codigo, q) : p.codigo) : null;
    div.innerHTML = `
      <div class="producto-card">
        <div class="producto-card-header">
          ${p.codigo ? '<span class="producto-codigo">' + (codigo||p.codigo) + '</span>' : ''}
          <span class="producto-nombre">${nombre}</span>
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

function resaltarTexto(texto, query) {
  const re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  return texto.replace(re, '<mark style="background:var(--primary-faint,#e8f5e9);color:var(--primary,#2e7d32);border-radius:2px;padding:0 1px">$1</mark>');
}

/* =========================
   TIPOS PRODUCTO
========================= */
async function cargarTiposProducto() {
  const select = document.getElementById('producto-tipo');
  const tipos  = await listarTiposProducto();

  select.innerHTML = '<option value="">Seleccione tipo</option>';
  tipos.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.nombre;
    select.appendChild(opt);
  });
}