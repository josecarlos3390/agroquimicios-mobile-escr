import { getEmpresaActiva } from '../../../services/empresas.service.js';
import { listarTecnicos }    from '../../../services/tecnicos.service.js';
import { listarSectores }    from '../../../services/sectores.service.js';
import { listarLotesPorSectores } from '../../../services/lotes.service.js';
import { listarVariedades }  from '../../../services/variedades.service.js';
import { crearNotaCana, obtenerNotaCana, actualizarNotaCanaCompleta } from '../services/cana.service.js';

let inicializado = false;
let plantaciones = [];
let todosLotes   = [];
let _seq = 0;
let modoEdicion = false;
let notaEditandoId = null;
function nextId() { return ++_seq; }

/* =========================================================
   INIT — solo una vez por lifetime de la app
========================================================= */
export function initNuevaNotaCanaView() {
  if (inicializado) return;
  inicializado = true;

  document.getElementById('btn-cana-nuevo-volver').onclick = () => {
    modoEdicion = false;
    notaEditandoId = null;
    window.showView('cana-registros');
  };

  document.getElementById('cana-empresa-select').onchange = async () => {
    const empresaId = document.getElementById('cana-empresa-select').value;
    if (!empresaId) return;
    const sectores = await listarSectores(empresaId);
    renderSectoresCana(sectores);
    todosLotes = [];
    plantaciones = [];
    renderPlantaciones();
  };

  document.getElementById('form-cana-nueva-nota').addEventListener('submit', async e => {
    e.preventDefault();
    await guardarNota();
  });
}

/* =========================================================
   CARGAR — cada vez que se navega a la vista
========================================================= */
export async function cargarNuevaNotaCana() {
  modoEdicion = false;
  notaEditandoId = null;

  plantaciones = [];
  todosLotes   = [];
  _seq         = 0;

  document.getElementById('form-cana-nueva-nota').reset();
  document.getElementById('cana-campana-input').value = String(new Date().getFullYear());

  const hoy = new Date();
  const fechaHoy = [hoy.getFullYear(), String(hoy.getMonth()+1).padStart(2,'0'), String(hoy.getDate()).padStart(2,'0')].join('-');
  document.getElementById('cana-fecha').value = fechaHoy;

  const activa = getEmpresaActiva();
  const empresaSel = document.getElementById('cana-empresa-select');
  if (activa) {
    empresaSel.innerHTML = `<option value="${activa.id}">${activa.nombre}</option>`;
    empresaSel.value = activa.id;
    empresaSel.disabled = true;
  }

  const tecnicos = await listarTecnicos(activa?.id || null);
  poblarSelect('cana-tecnico-select', tecnicos, 'Enc. de Siembra');

  if (activa) {
    const sectores = await listarSectores(activa.id);
    renderSectoresCana(sectores);
    if (sectores.length > 0) {
      todosLotes = await listarLotesPorSectores(sectores.map(s => s.id));
    }
  }

  renderPlantaciones();

  const header = document.querySelector('#view-cana-nuevo h3');
  if (header) header.textContent = '🌾 Nueva nota de plantación';

  const btn = document.querySelector('#form-cana-nueva-nota button[type="submit"]');
  if (btn) { btn.disabled = false; btn.textContent = '📌 Crear nota de plantación'; }
}

/* =========================================================
   CARGAR EDICIÓN
========================================================= */
export async function cargarEdicionNotaCana(id) {
  modoEdicion = true;
  notaEditandoId = id;

  plantaciones = [];
  todosLotes   = [];
  _seq         = 0;

  document.getElementById('form-cana-nueva-nota').reset();

  const data = await obtenerNotaCana(id);
  if (!data) {
    alert('No se encontró la nota');
    window.showView('cana-registros');
    return;
  }

  const c = data.cab;

  // Cabecera
  document.getElementById('cana-campana-input').value = c.campana ?? '';
  document.getElementById('cana-fecha').value = c.fecha ?? '';
  document.getElementById('cana-observaciones').value = c.observaciones ?? '';

  const empresaSel = document.getElementById('cana-empresa-select');
  empresaSel.innerHTML = `<option value="${c.empresa_id}">${c.empresa_nombre}</option>`;
  empresaSel.value = c.empresa_id;
  empresaSel.disabled = true;

  const tecnicos = await listarTecnicos(c.empresa_id);
  poblarSelect('cana-tecnico-select', tecnicos, 'Enc. de Siembra');
  document.getElementById('cana-tecnico-select').value = c.tecnico_id ?? '';

  // Sectores
  const sectores = await listarSectores(c.empresa_id);

  // Determinar sectores seleccionados a partir de las plantaciones
  const sectoresSeleccionados = new Set();
  if (data.plantaciones?.length) {
    // Necesitamos conocer el sector de cada lote plantado
    // Como todosLotes aún no está cargado, hacemos una carga previa de todos los lotes de la empresa
    const lotesEmpresa = await listarLotesPorSectores(sectores.map(s => s.id));
    data.plantaciones.forEach(p => {
      const lote = lotesEmpresa.find(l => String(l.id) === String(p.lote_id));
      if (lote?.sector_id) sectoresSeleccionados.add(String(lote.sector_id));
    });
    todosLotes = lotesEmpresa;
  }

  renderSectoresCana(sectores, [...sectoresSeleccionados]);

  // Plantaciones
  plantaciones = data.plantaciones.map(p => ({
    _id: nextId(),
    lote_id: p.lote_id,
    variedad_id: p.variedad_id,
    ha_manual: p.ha_manual,
    ha_mecanizada: p.ha_mecanizada,
    cantidad_sembradora_grupos: p.cantidad_sembradora_grupos,
    fecha_inicio: p.fecha_inicio,
    fecha_fin: p.fecha_fin,
  }));

  renderPlantaciones();

  const header = document.querySelector('#view-cana-nuevo h3');
  if (header) header.textContent = '✏️ Editar nota de plantación';

  const btn = document.querySelector('#form-cana-nueva-nota button[type="submit"]');
  if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar cambios'; }
}

/* =========================================================
   SECTORES
========================================================= */
function renderSectoresCana(sectores, idsSeleccionados = []) {
  const cont = document.getElementById('cana-sectores-container');
  if (!sectores.length) {
    cont.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem">No hay sectores para esta empresa.</p>';
    return;
  }
  const selSet = new Set(idsSeleccionados.map(String));
  cont.innerHTML = `
    <div class="chip-row">
      ${sectores.map(s => {
        const checked = selSet.has(String(s.id)) ? 'checked' : '';
        return `
        <label class="sector-chip ${checked ? 'activo' : ''}" data-sector-id="${s.id}">
          <input type="checkbox" class="cana-chk-sector" value="${s.id}" ${checked}>
          <svg class="chip-leaf" viewBox="0 0 14 14" fill="none">
            <path class="chip-leaf-bg" d="M7 1C4 1 2 4 2 7s2 6 5 6 5-3 5-6-2-6-5-6z"/>
            <path class="chip-leaf-vein" d="M7 3v8M4 6c1-1 2-1 3 0s2 1 3 0" stroke-width="0.8" stroke-linecap="round"/>
          </svg>
          <span class="chip-nombre">${s.nombre}</span>
          ${s.hectareas ? `<span class="chip-ha">${s.hectareas} ha</span>` : ''}
        </label>`;
      }).join('')}
    </div>`;

  cont.querySelectorAll('.sector-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      requestAnimationFrame(async () => {
        const cb = chip.querySelector('.cana-chk-sector');
        chip.classList.toggle('activo', cb.checked);
        const ids = [...document.querySelectorAll('.cana-chk-sector:checked')].map(c => c.value);
        todosLotes = ids.length ? await listarLotesPorSectores(ids) : [];
        renderPlantaciones();
      });
    });
  });
}

/* =========================================================
   PLANTACIONES
========================================================= */
function renderPlantaciones() {
  const cont = document.getElementById('cana-plantaciones-container');
  cont.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem">
      <strong>🌾 Detalle de plantación</strong>
      <button type="button" class="btn-secondary" style="margin:0;padding:0.35rem 0.8rem;font-size:0.85rem"
        id="btn-agregar-plantacion">➕ Agregar lote</button>
    </div>
    ${plantaciones.length === 0
      ? '<p style="color:var(--text-muted);font-size:0.88rem;padding:0.5rem 0">Sin lotes agregados aún.</p>'
      : plantaciones.map(renderFilaPlantacion).join('')}`;

  document.getElementById('btn-agregar-plantacion').onclick = () => {
    plantaciones.push({ _id: nextId(), lote_id:'', variedad_id:'', ha_manual:'', ha_mecanizada:'',
      cantidad_sembradora_grupos:'', fecha_inicio:'', fecha_fin:'' });
    renderPlantaciones();
  };

  plantaciones.forEach(p => bindPlantacion(p));
}

function labelLote(lote) {
  if (!lote) return '';
  return `${lote.nombre}${lote.hectareas ? ` (${lote.hectareas} ha)` : ''}`;
}

function renderLoteSearch(id, loteId, placeholder) {
  const lote = todosLotes.find(l => String(l.id) === String(loteId));
  const label = lote ? labelLote(lote) : '';
  return `
    <div class="lote-combo-wrap" style="position:relative">
      <input type="text" id="${id}" class="lote-search"
        value="${label}" placeholder="${placeholder}" autocomplete="off"
        style="width:100%;box-sizing:border-box">
      <div id="${id}-dropdown" class="lote-dropdown"
        style="display:none;position:absolute;top:100%;left:0;right:0;z-index:200;
               background:var(--surface,#fff);border:1px solid var(--border,#ccc);
               border-top:none;border-radius:0 0 6px 6px;max-height:200px;overflow-y:auto;
               box-shadow:0 4px 12px rgba(0,0,0,0.15)">
      </div>
      <input type="hidden" id="${id}-id" value="${loteId ?? ''}">
    </div>`;
}

function bindLoteSearch(inputId, onSelect) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(`${inputId}-dropdown`);
  if (!input || !dropdown) return;

  function mostrarOpciones(texto) {
    const q = texto.toLowerCase().trim();
    const filtrados = q
      ? todosLotes.filter(l => l.nombre.toLowerCase().includes(q))
      : todosLotes;

    if (!filtrados.length) {
      dropdown.innerHTML = `<div style="padding:0.5rem 0.8rem;color:var(--text-muted);font-size:0.85rem">Sin resultados</div>`;
    } else {
      dropdown.innerHTML = filtrados.map(l => `
        <div class="lote-drop-item" data-id="${l.id}" data-nombre="${l.nombre}" data-hectareas="${l.hectareas ?? ''}"
          style="padding:0.45rem 0.8rem;cursor:pointer;font-size:0.88rem;border-bottom:1px solid var(--border-light,#eee);transition:background 0.1s"
          onmouseover="this.style.background='var(--primary-faint,#e8f5e9)'" onmouseout="this.style.background=''">
          <span style="font-weight:600">${l.nombre}</span>
          ${l.hectareas ? `<span style="margin-left:0.4rem;color:var(--text-muted);font-size:0.8rem">(${l.hectareas} ha)</span>` : ''}
        </div>`).join('');

      dropdown.querySelectorAll('.lote-drop-item').forEach(item => {
        item.addEventListener('mousedown', e => {
          e.preventDefault();
          input.value = labelLote({ nombre: item.dataset.nombre, hectareas: item.dataset.hectareas });
          dropdown.style.display = 'none';
          onSelect(item.dataset.id);
        });
      });
    }
    dropdown.style.display = 'block';
  }

  input.addEventListener('focus', () => mostrarOpciones(input.value));
  input.addEventListener('input', () => {
    onSelect('');
    mostrarOpciones(input.value);
  });
  input.addEventListener('blur', () => {
    setTimeout(() => { dropdown.style.display = 'none'; }, 150);
  });
}

function renderFilaPlantacion(p) {
  const haTotal = ((parseFloat(p.ha_manual)||0)+(parseFloat(p.ha_mecanizada)||0));

  return `
    <div class="cana-plantacion-bloque">
      <div class="cana-bloque-header">
        <span class="cana-bloque-titulo">🌿 Lote plantado</span>
        <button type="button" class="btn-icon-danger" id="btn-del-p-${p._id}">🗑️</button>
      </div>
      <div class="grid">
        <label>Fecha inicio <input type="date" id="p-fi-${p._id}" value="${p.fecha_inicio??''}"></label>
        <label>Fecha fin <input type="date" id="p-ff-${p._id}" value="${p.fecha_fin??''}"></label>
        <label>Lote ${renderLoteSearch(`p-lote-${p._id}`, p.lote_id, '🔍 Buscar lote...')}</label>
        <label>Variedad <select id="p-var-${p._id}"><option value="">Sin variedad</option></select></label>
        <label>Ha manual <input type="number" id="p-ham-${p._id}" step="0.01" min="0" value="${p.ha_manual??''}" placeholder="0.00"></label>
        <label>Ha mecanizada <input type="number" id="p-hamec-${p._id}" step="0.01" min="0" value="${p.ha_mecanizada??''}" placeholder="0.00"></label>
        <label>Ha total <input type="text" id="p-hat-${p._id}" value="${haTotal>0?haTotal.toFixed(2):''}" readonly style="background:var(--primary-faint);font-weight:600;"></label>
        <label>Cantidad Sembradora/Grupos <input type="text" id="p-gr-${p._id}" value="${p.cantidad_sembradora_grupos??''}" placeholder="Ej: 2 sembradoras / 5 grupos"></label>
      </div>
    </div>`;
}

function bindPlantacion(p) {
  const g = id => document.getElementById(id);

  // Eliminar
  g(`btn-del-p-${p._id}`)?.addEventListener('click', () => {
    plantaciones = plantaciones.filter(x => x._id !== p._id);
    renderPlantaciones();
  });

  // Lote → pre-fill ha y variedad
  bindLoteSearch(`p-lote-${p._id}`, async (loteId) => {
    p.lote_id = loteId;
    if (!loteId) return;
    const lote = todosLotes.find(l => String(l.id) === String(loteId));
    if (lote?.hectareas) {
      p.ha_manual = lote.hectareas;
      const inp = g(`p-ham-${p._id}`); if (inp) inp.value = lote.hectareas;
      recalcHa(p);
    }
    if (lote?.cultivo_id) await fillVariedades(p._id, lote.cultivo_id, lote.variedad_id);
  });

  // Precargar variedad si ya hay lote seleccionado (modo edición)
  if (p.lote_id) {
    const lote = todosLotes.find(l => String(l.id) === String(p.lote_id));
    if (lote?.cultivo_id) {
      fillVariedades(p._id, lote.cultivo_id, p.variedad_id || lote.variedad_id);
    }
  }

  // Ha
  const inpHam = g(`p-ham-${p._id}`); if (inpHam) inpHam.oninput = () => { p.ha_manual = inpHam.value; recalcHa(p); };
  const inpHamec = g(`p-hamec-${p._id}`); if (inpHamec) inpHamec.oninput = () => { p.ha_mecanizada = inpHamec.value; recalcHa(p); };

  // Grupos/sembradora
  const inpGr = g(`p-gr-${p._id}`); if (inpGr) inpGr.oninput = () => p.cantidad_sembradora_grupos = inpGr.value;

  // Fechas de plantación
  const inpFi = g(`p-fi-${p._id}`); if (inpFi) inpFi.oninput = () => p.fecha_inicio = inpFi.value;
  const inpFf = g(`p-ff-${p._id}`); if (inpFf) inpFf.oninput = () => p.fecha_fin = inpFf.value;
}

function recalcHa(p) {
  const t = (parseFloat(p.ha_manual)||0) + (parseFloat(p.ha_mecanizada)||0);
  const el = document.getElementById(`p-hat-${p._id}`);
  if (el) el.value = t > 0 ? t.toFixed(2) : '';
}

async function poblarVariedades(selectId, cultivoId, variedadActual) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">Sin variedad</option>';
  sel.disabled = true;
  if (!cultivoId) return;
  const vars = await listarVariedades(cultivoId);
  sel.innerHTML = '<option value="">Sin variedad</option>' +
    vars.map(v => `<option value="${v.id}" ${String(v.id)===String(variedadActual)?'selected':''}>${v.nombre}</option>`).join('');
  sel.disabled = false;
}

async function fillVariedades(pid, cultivoId, variedadActual) {
  await poblarVariedades(`p-var-${pid}`, cultivoId, variedadActual);
  const sel = document.getElementById(`p-var-${pid}`);
  if (sel) {
    sel.onchange = () => {
      const p = plantaciones.find(x => x._id === pid);
      if (p) p.variedad_id = sel.value;
    };
  }
}

/* =========================================================
   GUARDAR
========================================================= */
async function guardarNota() {
  const val = id => document.getElementById(id).value;
  const fecha = val('cana-fecha');

  if (!fecha) { alert('Ingresá la fecha de la nota'); return; }
  if (!plantaciones.filter(p => p.lote_id).length) { alert('Agregá al menos un lote de plantación'); return; }

  const btn = document.querySelector('#form-cana-nueva-nota button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Guardando...';

  try {
    const payload = {
      empresa_id:    val('cana-empresa-select'),
      tecnico_id:    val('cana-tecnico-select') || null,
      campana:       val('cana-campana-input'),
      fecha:         fecha,
      observaciones: val('cana-observaciones') || null,
      plantaciones: plantaciones.filter(p => p.lote_id).map(p => ({
        lote_id:    p.lote_id,
        variedad_id: p.variedad_id || null,
        ha_manual:   parseFloat(p.ha_manual)||0,
        ha_mecanizada: parseFloat(p.ha_mecanizada)||0,
        cantidad_sembradora_grupos: p.cantidad_sembradora_grupos?.trim() || null,
        fecha_inicio: p.fecha_inicio || null,
        fecha_fin:    p.fecha_fin || null,
      })),
    };

    if (modoEdicion && notaEditandoId) {
      await actualizarNotaCanaCompleta(notaEditandoId, payload);
    } else {
      await crearNotaCana(payload);
    }

    modoEdicion = false;
    notaEditandoId = null;
    window.showView('cana-registros');
  } catch (err) {
    alert('Error al guardar: ' + err.message);
    btn.disabled = false;
    btn.textContent = modoEdicion ? '💾 Guardar cambios' : '📌 Crear nota de plantación';
  }
}

function poblarSelect(id, items, placeholder) {
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.innerHTML = `<option value="">${placeholder}</option>` +
    items.map(i => `<option value="${i.id}">${i.nombre}</option>`).join('');
}