import { getEmpresaActiva } from '../../../services/empresas.service.js';
import { listarTecnicos }    from '../../../services/tecnicos.service.js';
import { listarSectores }    from '../../../services/sectores.service.js';
import { listarLotesPorSectores } from '../../../services/lotes.service.js';
import { listarVariedades }  from '../../../services/variedades.service.js';
import { crearNotaCana, getProductosCana } from '../services/cana.service.js';

let inicializado = false;
let plantaciones = [];
let insumos      = [];
let todosLotes   = [];
let _productosDisponibles = [];
let _seq = 0;
function nextId() { return ++_seq; }

/* =========================================================
   INIT — solo una vez por lifetime de la app
========================================================= */
export function initNuevaNotaCanaView() {
  if (inicializado) return;
  inicializado = true;

  document.getElementById('btn-cana-nuevo-volver').onclick = () =>
    window.showView('cana-registros');

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
  plantaciones = [];
  insumos      = [];
  todosLotes   = [];
  _seq         = 0;

  document.getElementById('form-cana-nueva-nota').reset();
  document.getElementById('cana-campana-input').value = String(new Date().getFullYear());

  const hoy = new Date();
  const fechaHoy = [hoy.getFullYear(), String(hoy.getMonth()+1).padStart(2,'0'), String(hoy.getDate()).padStart(2,'0')].join('-');
  document.getElementById('cana-fecha-inicio').value = fechaHoy;
  document.getElementById('cana-fecha-fin').value    = fechaHoy;

  const activa = getEmpresaActiva();
  const empresaSel = document.getElementById('cana-empresa-select');
  if (activa) {
    empresaSel.innerHTML = `<option value="${activa.id}">${activa.nombre}</option>`;
    empresaSel.value = activa.id;
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

  _productosDisponibles = await getProductosCana();
  insumos = _productosDisponibles.map(p => ({
    tipo:            p.codigo.includes('BIO') ? 'BIOLOGICO' : 'AGROQUIMICO',
    producto_id:     p.id,
    producto_nombre: p.nombre,
    cantidad:        '',
    unidad:          p.unidad_default ?? 'L',
  }));

  renderInsumos();
  renderPlantaciones();

  const btn = document.querySelector('#form-cana-nueva-nota button[type="submit"]');
  if (btn) { btn.disabled = false; btn.textContent = '📌 Crear nota de plantación'; }
}

/* =========================================================
   SECTORES
========================================================= */
function renderSectoresCana(sectores) {
  const cont = document.getElementById('cana-sectores-container');
  if (!sectores.length) {
    cont.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem">No hay sectores para esta empresa.</p>';
    return;
  }
  cont.innerHTML = `
    <div class="chip-row">
      ${sectores.map(s => `
        <label class="sector-chip" data-sector-id="${s.id}">
          <input type="checkbox" class="cana-chk-sector" value="${s.id}">
          <svg class="chip-leaf" viewBox="0 0 14 14" fill="none">
            <path class="chip-leaf-bg" d="M7 1C4 1 2 4 2 7s2 6 5 6 5-3 5-6-2-6-5-6z"/>
            <path class="chip-leaf-vein" d="M7 3v8M4 6c1-1 2-1 3 0s2 1 3 0" stroke-width="0.8" stroke-linecap="round"/>
          </svg>
          <span class="chip-nombre">${s.nombre}</span>
          ${s.hectareas ? `<span class="chip-ha">${s.hectareas} ha</span>` : ''}
        </label>`).join('')}
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
      cantidad_sembradora_grupos:'', personas_por_grupo:'', cortes:[] });
    renderPlantaciones();
  };

  plantaciones.forEach(p => bindPlantacion(p));
}

function renderFilaPlantacion(p) {
  const loteOpts = todosLotes.map(l =>
    `<option value="${l.id}" ${String(l.id)===String(p.lote_id)?'selected':''}>${l.nombre}${l.hectareas?` (${l.hectareas} ha)`:''}</option>`
  ).join('');
  const haTotal = ((parseFloat(p.ha_manual)||0)+(parseFloat(p.ha_mecanizada)||0));

  return `
    <div class="cana-plantacion-bloque">
      <div class="cana-bloque-header">
        <span class="cana-bloque-titulo">🌿 Lote plantado</span>
        <button type="button" class="btn-icon-danger" id="btn-del-p-${p._id}">🗑️</button>
      </div>
      <div class="grid">
        <label>Lote <select id="p-lote-${p._id}" required><option value="">Seleccione</option>${loteOpts}</select></label>
        <label>Variedad <select id="p-var-${p._id}"><option value="">Sin variedad</option></select></label>
        <label>Ha manual <input type="number" id="p-ham-${p._id}" step="0.01" min="0" value="${p.ha_manual??''}" placeholder="0.00"></label>
        <label>Ha mecanizada <input type="number" id="p-hamec-${p._id}" step="0.01" min="0" value="${p.ha_mecanizada??''}" placeholder="0.00"></label>
        <label>Ha total <input type="text" id="p-hat-${p._id}" value="${haTotal>0?haTotal.toFixed(2):''}" readonly style="background:var(--primary-faint);font-weight:600;"></label>
        <label>Grupos sembradora <input type="number" id="p-gr-${p._id}" min="0" value="${p.cantidad_sembradora_grupos??''}"></label>
        <label>Personas/grupo <input type="number" id="p-pe-${p._id}" min="0" value="${p.personas_por_grupo??''}"></label>
      </div>
      <div id="cortes-${p._id}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin:0.6rem 0 0.35rem">
          <strong style="font-size:0.87rem">✂️ Cortes de semilla</strong>
          <button type="button" class="btn-secondary" id="btn-add-c-${p._id}"
            style="margin:0;padding:0.28rem 0.65rem;font-size:0.8rem">➕ Corte</button>
        </div>
        ${p.cortes.length===0
          ? `<p style="color:var(--text-muted);font-size:0.82rem">Sin cortes registrados.</p>`
          : p.cortes.map(c => renderFilaCorte(c)).join('')}
      </div>
    </div>`;
}

function renderFilaCorte(c) {
  const loteOpts = todosLotes.map(l =>
    `<option value="${l.id}" ${String(l.id)===String(c.lote_semilla_id)?'selected':''}>${l.nombre}</option>`
  ).join('');
  return `
    <div class="cana-corte-fila">
      <div style="display:flex;justify-content:flex-end;margin-bottom:0.2rem">
        <button type="button" class="btn-icon-danger btn-del-c" data-cid="${c._id}" title="Quitar">✕</button>
      </div>
      <div class="grid">
        <label>Lote semilla (origen) <select id="c-ls-${c._id}"><option value="">Seleccione</option>${loteOpts}</select></label>
        <label>Sup. corte (ha) <input type="number" id="c-sup-${c._id}" step="0.01" min="0" value="${c.sup_corte_ha??''}" placeholder="0.00"></label>
        <label>Rend. Tn/Ha <input type="number" id="c-rend-${c._id}" step="0.01" min="0" value="${c.rendimiento_tn_ha??''}" placeholder="0.00"></label>
        <label>Tn cortadas manual <input type="number" id="c-tnm-${c._id}" step="0.01" min="0" value="${c.tn_manual??''}" placeholder="0.00"></label>
        <label>Tn cortadas mecanizada <input type="number" id="c-tnmec-${c._id}" step="0.01" min="0" value="${c.tn_mecanizada??''}" placeholder="0.00"></label>
        <label>Consumo semilla Tn/Ha <input type="number" id="c-cons-${c._id}" step="0.01" min="0" value="${c.consumo_tn_ha??''}" placeholder="0.00"></label>
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
  const selLote = g(`p-lote-${p._id}`);
  if (selLote) selLote.onchange = async () => {
    const lote = todosLotes.find(l => String(l.id) === selLote.value);
    p.lote_id = selLote.value;
    if (lote?.hectareas) {
      p.ha_manual = lote.hectareas;
      const inp = g(`p-ham-${p._id}`); if (inp) inp.value = lote.hectareas;
      recalcHa(p);
    }
    if (lote?.cultivo_id) await fillVariedades(p._id, lote.cultivo_id, lote.variedad_id);
  };

  // Ha
  const inpHam = g(`p-ham-${p._id}`); if (inpHam) inpHam.oninput = () => { p.ha_manual = inpHam.value; recalcHa(p); };
  const inpHamec = g(`p-hamec-${p._id}`); if (inpHamec) inpHamec.oninput = () => { p.ha_mecanizada = inpHamec.value; recalcHa(p); };

  // Grupos / personas
  const inpGr = g(`p-gr-${p._id}`); if (inpGr) inpGr.oninput = () => p.cantidad_sembradora_grupos = inpGr.value;
  const inpPe = g(`p-pe-${p._id}`); if (inpPe) inpPe.oninput = () => p.personas_por_grupo = inpPe.value;

  // Agregar corte
  g(`btn-add-c-${p._id}`)?.addEventListener('click', () => {
    p.cortes.push({ _id: nextId(), lote_semilla_id:'', sup_corte_ha:'', rendimiento_tn_ha:'',
      tn_manual:'', tn_mecanizada:'', consumo_tn_ha:'' });
    renderPlantaciones();
  });

  // Cortes
  p.cortes.forEach(c => {
    const bind = (id, field) => { const el = g(id); if (el) el.oninput = () => c[field] = el.value; };
    const selLs = g(`c-ls-${c._id}`); if (selLs) selLs.onchange = () => c.lote_semilla_id = selLs.value;
    bind(`c-sup-${c._id}`,  'sup_corte_ha');
    bind(`c-rend-${c._id}`, 'rendimiento_tn_ha');
    bind(`c-tnm-${c._id}`,  'tn_manual');
    bind(`c-tnmec-${c._id}`,'tn_mecanizada');
    bind(`c-cons-${c._id}`, 'consumo_tn_ha');
    document.querySelector(`.btn-del-c[data-cid="${c._id}"]`)?.addEventListener('click', () => {
      p.cortes = p.cortes.filter(x => x._id !== c._id);
      renderPlantaciones();
    });
  });
}

function recalcHa(p) {
  const t = (parseFloat(p.ha_manual)||0) + (parseFloat(p.ha_mecanizada)||0);
  const el = document.getElementById(`p-hat-${p._id}`);
  if (el) el.value = t > 0 ? t.toFixed(2) : '';
}

async function fillVariedades(pid, cultivoId, variedadActual) {
  const vars = await listarVariedades(cultivoId);
  const sel  = document.getElementById(`p-var-${pid}`);
  if (!sel) return;
  sel.innerHTML = `<option value="">Sin variedad</option>` +
    vars.map(v => `<option value="${v.id}" ${String(v.id)===String(variedadActual)?'selected':''}>${v.nombre}</option>`).join('');
  sel.onchange = () => {
    const p = plantaciones.find(x => x._id === pid);
    if (p) p.variedad_id = sel.value;
  };
}

/* =========================================================
   INSUMOS
========================================================= */
function renderInsumos() {
  const cont = document.getElementById('cana-insumos-container');
  const agro = insumos.filter(i => i.tipo === 'AGROQUIMICO');
  const bio  = insumos.filter(i => i.tipo === 'BIOLOGICO');
  cont.innerHTML = renderGrupoInsumos('AGROQUIMICO','🧪 Consumo Agroquímicos', agro)
                 + renderGrupoInsumos('BIOLOGICO',  '🌿 Consumo Biológicos',   bio);
  bindInsumos();
}

function renderGrupoInsumos(tipo, titulo, items) {
  const filtro = p => tipo === 'BIOLOGICO' ? p.codigo.includes('BIO') : !p.codigo.includes('BIO');

  const filas = items.map(ins => {
    const gi = insumos.indexOf(ins);
    return `
      <div class="insumo-fila">
        <select class="ins-sel" data-idx="${gi}" style="flex:2;min-width:0">
          <option value="">Producto...</option>
          ${_productosDisponibles.filter(filtro).map(p =>
            `<option value="${p.id}" ${p.id===ins.producto_id?'selected':''}>${p.nombre}</option>`
          ).join('')}
        </select>
        <input type="number" class="ins-qty" data-idx="${gi}"
          value="${ins.cantidad??''}" placeholder="Cant." step="0.01" min="0" style="width:88px">
        <span class="insumo-unidad-label" id="ins-u-${gi}">${ins.unidad??''}</span>
        <button type="button" class="btn-icon-danger ins-del" data-idx="${gi}" title="Quitar">✕</button>
      </div>`;
  }).join('');

  return `
    <div class="cana-insumos-grupo">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.4rem">
        <strong style="font-size:0.9rem">${titulo}</strong>
        <button type="button" class="btn-secondary ins-add" data-tipo="${tipo}"
          style="margin:0;padding:0.3rem 0.7rem;font-size:0.82rem">➕</button>
      </div>
      ${filas||'<p style="color:var(--text-muted);font-size:0.83rem">Sin productos.</p>'}
    </div>`;
}

function bindInsumos() {
  const cont = document.getElementById('cana-insumos-container');

  cont.querySelectorAll('.ins-qty').forEach(inp => {
    inp.oninput = () => { insumos[+inp.dataset.idx].cantidad = inp.value; };
  });

  cont.querySelectorAll('.ins-sel').forEach(sel => {
    sel.onchange = () => {
      const gi = +sel.dataset.idx;
      const p  = _productosDisponibles.find(x => x.id === sel.value);
      if (!p) return;
      insumos[gi].producto_id    = p.id;
      insumos[gi].producto_nombre = p.nombre;
      insumos[gi].unidad          = p.unidad_default ?? 'L';
      const u = document.getElementById(`ins-u-${gi}`); if (u) u.textContent = insumos[gi].unidad;
    };
  });

  cont.querySelectorAll('.ins-del').forEach(btn => {
    btn.onclick = () => { insumos.splice(+btn.dataset.idx, 1); renderInsumos(); };
  });

  cont.querySelectorAll('.ins-add').forEach(btn => {
    btn.onclick = () => {
      insumos.push({ tipo: btn.dataset.tipo, producto_id:'', producto_nombre:'', cantidad:'', unidad:'L' });
      renderInsumos();
    };
  });
}

/* =========================================================
   GUARDAR
========================================================= */
async function guardarNota() {
  const val = id => document.getElementById(id).value;
  const fechaInicio = val('cana-fecha-inicio');
  const fechaFin    = val('cana-fecha-fin');

  if (!fechaInicio) { alert('Ingresá la fecha de inicio'); return; }
  if (fechaFin && fechaFin < fechaInicio) { alert('La fecha fin no puede ser anterior al inicio'); return; }
  if (!plantaciones.filter(p => p.lote_id).length) { alert('Agregá al menos un lote de plantación'); return; }

  const btn = document.querySelector('#form-cana-nueva-nota button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Guardando...';

  try {
    await crearNotaCana({
      empresa_id:    val('cana-empresa-select'),
      tecnico_id:    val('cana-tecnico-select') || null,
      campana:       val('cana-campana-input'),
      fecha_inicio:  fechaInicio,
      fecha_fin:     fechaFin || fechaInicio,
      observaciones: val('cana-observaciones') || null,
      plantaciones: plantaciones.filter(p => p.lote_id).map(p => ({
        lote_id:    p.lote_id,
        variedad_id: p.variedad_id || null,
        ha_manual:   parseFloat(p.ha_manual)||0,
        ha_mecanizada: parseFloat(p.ha_mecanizada)||0,
        cantidad_sembradora_grupos: parseInt(p.cantidad_sembradora_grupos)||null,
        personas_por_grupo: parseInt(p.personas_por_grupo)||null,
        cortes: p.cortes.map(c => ({
          lote_semilla_id:        c.lote_semilla_id||null,
          variedad_id:            c.variedad_id||null,
          sup_corte_ha:           parseFloat(c.sup_corte_ha)||null,
          rendimiento_tn_ha:      parseFloat(c.rendimiento_tn_ha)||null,
          tn_cortadas_manual:     parseFloat(c.tn_manual)||0,
          tn_cortadas_mecanizada: parseFloat(c.tn_mecanizada)||0,
          consumo_semilla_tn_ha:  parseFloat(c.consumo_tn_ha)||null,
        })),
      })),
      insumos: insumos.filter(i => i.producto_nombre && i.cantidad !== '' && i.cantidad !== null)
        .map(i => ({ tipo: i.tipo, producto_id: i.producto_id||null,
          producto_nombre: i.producto_nombre, cantidad: parseFloat(i.cantidad), unidad: i.unidad })),
    });
    window.showView('cana-registros');
  } catch (err) {
    alert('Error al guardar: ' + err.message);
    btn.disabled = false; btn.textContent = '📌 Crear nota de plantación';
  }
}

function poblarSelect(id, items, placeholder) {
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.innerHTML = `<option value="">${placeholder}</option>` +
    items.map(i => `<option value="${i.id}">${i.nombre}</option>`).join('');
}
