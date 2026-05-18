/**
 * plantillaInsumos.view.js
 * Permite preconfigurar cuántos y qué productos aparecen
 * en la sección de Consumo Agroquímico y Consumo Biológico
 * del formulario "Nueva nota de plantación".
 *
 * Los datos se persisten en localStorage bajo la clave
 * "cana_plantilla_insumos".
 */

import { getProductosCana } from '../services/cana.service.js';

const STORAGE_KEY = 'cana_plantilla_insumos';

let _productos = [];          // todos los productos disponibles
let _plantilla = null;        // { agroquimicos: [...], biologicos: [...] }
let _inicializado = false;

/* ─────────────────────────────────────────
   PERSISTENCIA
───────────────────────────────────────── */

export function leerPlantillaInsumos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { agroquimicos: [], biologicos: [] };
    return JSON.parse(raw);
  } catch {
    return { agroquimicos: [], biologicos: [] };
  }
}

function guardarPlantillaEnStorage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */

const TIPOS_BIO = ['PRODUCTO BIOLOGICO', 'BIOESTIMULANTES (REG. Y CRECIMIENTO)'];

function productosPorTipo(tipo) {
  return tipo === 'BIOLOGICO'
    ? _productos.filter(p => TIPOS_BIO.includes(p.tipo_nombre))
    : _productos.filter(p => !TIPOS_BIO.includes(p.tipo_nombre));
}

function labelProducto(prod) {
  if (!prod) return '';
  return `${prod.codigo} — ${prod.nombre}`;
}

/* ─────────────────────────────────────────
   INIT (una sola vez)
───────────────────────────────────────── */

export function initPlantillaInsumosView() {
  if (_inicializado) return;
  _inicializado = true;

  document
    .getElementById('btn-plantilla-volver')
    ?.addEventListener('click', () => window.showView('cana-registros'));
}

/* ─────────────────────────────────────────
   CARGAR (cada vez que se navega a la vista)
───────────────────────────────────────── */

export async function cargarPlantillaInsumos() {
  _productos = await getProductosCana();
  _plantilla  = leerPlantillaInsumos();

  renderPlantilla();
}

/* ─────────────────────────────────────────
   RENDER PRINCIPAL
───────────────────────────────────────── */

function renderPlantilla() {
  const cont = document.getElementById('plantilla-insumos-cont');
  if (!cont) return;

  cont.innerHTML =
    renderGrupo('AGROQUIMICO',  '🧪 Consumo Agroquímicos', _plantilla.agroquimicos) +
    renderGrupo('BIOLOGICO',    '🌿 Consumo Biológicos',   _plantilla.biologicos);

  bindGrupo('AGROQUIMICO');
  bindGrupo('BIOLOGICO');
}

/* ─────────────────────────────────────────
   RENDER DE UN GRUPO (agro / bio)
───────────────────────────────────────── */

function renderGrupo(tipo, titulo, items) {
  const key   = tipo === 'AGROQUIMICO' ? 'agroquimicos' : 'biologicos';
  const filas = items.map((item, idx) => renderFila(tipo, key, idx, item)).join('');

  return `
    <div class="card plantilla-grupo" data-tipo="${tipo}">
      <div class="plantilla-grupo-header">
        <strong>${titulo}</strong>
        <span class="plantilla-badge">${items.length} producto${items.length !== 1 ? 's' : ''}</span>
      </div>
      <p style="font-size:0.82rem;color:var(--text-muted);margin:0 0 0.75rem">
        Estos productos se pre-cargarán automáticamente al crear una nueva nota de plantación.
        Podés dejar la cantidad en blanco y completarla después.
      </p>

      <div class="plantilla-filas" id="pt-filas-${tipo}">
        ${filas || `<p class="plantilla-empty">Sin productos configurados.</p>`}
      </div>

      <button type="button" class="btn-secondary pt-add" data-tipo="${tipo}"
        style="margin-top:0.6rem;width:100%">
        ➕ Agregar producto
      </button>
    </div>`;
}

function renderFila(tipo, key, idx, item) {
  const prod     = _productos.find(p => String(p.id) === String(item.producto_id));
  const label    = prod ? labelProducto(prod) : (item.producto_nombre || '');
  const unidad   = prod?.unidad_default ?? item.unidad ?? '';

  return `
    <div class="plantilla-fila" data-tipo="${tipo}" data-idx="${idx}">

      <div class="ins-combo-wrap" style="flex:2;min-width:160px;position:relative">
        <input type="text" class="pt-search" data-tipo="${tipo}" data-idx="${idx}"
          value="${label}"
          placeholder="🔍 Buscar producto..."
          autocomplete="off"
          style="width:100%;box-sizing:border-box">
        <div class="ins-dropdown pt-drop" data-tipo="${tipo}" data-idx="${idx}"
          style="display:none;position:absolute;top:100%;left:0;right:0;z-index:300;
                 background:var(--surface,#fff);border:1px solid var(--border,#ccc);
                 border-top:none;border-radius:0 0 6px 6px;max-height:200px;overflow-y:auto;
                 box-shadow:0 4px 12px rgba(0,0,0,0.15)">
        </div>
      </div>

      <input type="number" class="pt-qty" data-tipo="${tipo}" data-idx="${idx}"
        value="${item.cantidad ?? ''}"
        placeholder="Cant." step="0.01" min="0"
        style="width:80px">

      <span class="insumo-unidad-label pt-unidad" data-tipo="${tipo}" data-idx="${idx}"
        style="min-width:28px;font-size:0.84rem;color:var(--text-muted)">
        ${unidad}
      </span>

      <button type="button" class="btn-icon-danger pt-del"
        data-tipo="${tipo}" data-idx="${idx}" title="Quitar">✕</button>
    </div>`;
}

/* ─────────────────────────────────────────
   BIND EVENTS DE UN GRUPO
───────────────────────────────────────── */

function bindGrupo(tipo) {
  const key = tipo === 'AGROQUIMICO' ? 'agroquimicos' : 'biologicos';

  /* ── Agregar fila ── */
  document.querySelectorAll(`.pt-add[data-tipo="${tipo}"]`).forEach(btn => {
    btn.onclick = () => {
      _plantilla[key].push({ producto_id: '', producto_nombre: '', cantidad: '', unidad: '' });
      guardarPlantillaEnStorage(_plantilla);
      renderPlantilla();
      // foco en el nuevo buscador
      const searches = document.querySelectorAll(`#pt-filas-${tipo} .pt-search`);
      if (searches.length) searches[searches.length - 1].focus();
    };
  });

  /* ── Eliminar fila ── */
  document.querySelectorAll(`.pt-del[data-tipo="${tipo}"]`).forEach(btn => {
    btn.onclick = () => {
      const idx = +btn.dataset.idx;
      _plantilla[key].splice(idx, 1);
      guardarPlantillaEnStorage(_plantilla);
      renderPlantilla();
    };
  });

  /* ── Cantidad ── */
  document.querySelectorAll(`.pt-qty[data-tipo="${tipo}"]`).forEach(inp => {
    inp.oninput = () => {
      const idx = +inp.dataset.idx;
      _plantilla[key][idx].cantidad = inp.value;
      guardarPlantillaEnStorage(_plantilla);
    };
  });

  /* ── Buscador con dropdown ── */
  document.querySelectorAll(`.pt-search[data-tipo="${tipo}"]`).forEach(input => {
    const idx  = +input.dataset.idx;
    const wrap = input.closest('.ins-combo-wrap');
    const drop = wrap.querySelector('.pt-drop');

    function mostrarOpciones(texto) {
      const prods    = productosPorTipo(tipo);
      const q        = texto.toLowerCase().trim();
      const filtrados = q
        ? prods.filter(p =>
            p.nombre.toLowerCase().includes(q) ||
            p.codigo.toLowerCase().includes(q))
        : prods;

      if (!filtrados.length) {
        drop.innerHTML = `<div style="padding:0.5rem 0.8rem;color:var(--text-muted);font-size:0.85rem">Sin resultados</div>`;
      } else {
        drop.innerHTML = filtrados.map(p => `
          <div class="ins-drop-item"
            data-id="${p.id}" data-nombre="${p.nombre}"
            data-codigo="${p.codigo}" data-unidad="${p.unidad_default ?? ''}"
            style="padding:0.45rem 0.8rem;cursor:pointer;font-size:0.88rem;
                   border-bottom:1px solid var(--border-light,#eee);transition:background 0.1s"
            onmouseover="this.style.background='var(--primary-faint,#e8f5e9)'"
            onmouseout="this.style.background=''">
            <span style="font-weight:600;color:var(--primary,#2e7d32)">${p.codigo}</span>
            <span style="margin-left:0.4rem">${p.nombre}</span>
            ${p.unidad_default
              ? `<span style="margin-left:0.4rem;color:var(--text-muted);font-size:0.8rem">[${p.unidad_default}]</span>`
              : ''}
          </div>`).join('');

        drop.querySelectorAll('.ins-drop-item').forEach(item => {
          item.addEventListener('mousedown', e => {
            e.preventDefault();
            const key2 = tipo === 'AGROQUIMICO' ? 'agroquimicos' : 'biologicos';
            _plantilla[key2][idx].producto_id     = item.dataset.id;
            _plantilla[key2][idx].producto_nombre = item.dataset.nombre;
            _plantilla[key2][idx].unidad          = item.dataset.unidad;
            input.value = `${item.dataset.codigo} — ${item.dataset.nombre}`;
            drop.style.display = 'none';

            // actualizar etiqueta de unidad
            const uEl = document.querySelector(
              `.pt-unidad[data-tipo="${tipo}"][data-idx="${idx}"]`);
            if (uEl) uEl.textContent = item.dataset.unidad;

            guardarPlantillaEnStorage(_plantilla);
          });
        });
      }
      drop.style.display = 'block';
    }

    input.addEventListener('focus', () => mostrarOpciones(input.value));
    input.addEventListener('input', () => {
      // limpiar selección al escribir
      const key2 = tipo === 'AGROQUIMICO' ? 'agroquimicos' : 'biologicos';
      _plantilla[key2][idx].producto_id = '';
      mostrarOpciones(input.value);
    });
    input.addEventListener('blur', () => {
      setTimeout(() => { drop.style.display = 'none'; }, 150);
    });
  });
}
