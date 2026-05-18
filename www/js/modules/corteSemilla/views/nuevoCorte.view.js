import { getEmpresaActiva } from '../../../services/empresas.service.js';
import { listarTecnicos } from '../../../services/tecnicos.service.js';
import { listarSectores } from '../../../services/sectores.service.js';
import { listarLotesPorSectores } from '../../../services/lotes.service.js';
import { listarVariedades } from '../../../services/variedades.service.js';
import { crearCorteSemilla, obtenerCorteSemilla, actualizarCorteSemillaCompleta, prepararExcelCorteSemilla } from '../services/corteSemilla.service.js';
import { formatFecha } from '../../../utils/fecha.js';

let inicializado = false;
let cortes = [];
let todosLotes = [];
let _seq = 0;
let modoEdicion = false;
let notaEditandoId = null;
function nextId() { return ++_seq; }

export function initNuevoCorteSemillaView() {
  if (inicializado) return;
  inicializado = true;

  document.getElementById('btn-cs-nuevo-volver').onclick = () => {
    modoEdicion = false; notaEditandoId = null;
    window.showView('corte-semilla-registros');
  };

  document.getElementById('cs-empresa-select').onchange = async () => {
    const empresaId = document.getElementById('cs-empresa-select').value;
    if (!empresaId) return;
    const sectores = await listarSectores(empresaId);
    renderSectoresCS(sectores);
    todosLotes = [];
    cortes = [];
    renderCortes();
  };

  document.getElementById('form-cs-nuevo').addEventListener('submit', async e => {
    e.preventDefault();
    await guardarCorteSemilla();
  });
}

export async function cargarNuevoCorteSemilla() {
  modoEdicion = false;
  notaEditandoId = null;
  cortes = [];
  todosLotes = [];
  _seq = 0;

  document.getElementById('form-cs-nuevo').reset();
  document.getElementById('cs-campana-input').value = String(new Date().getFullYear());
  const hoy = new Date();
  const fechaHoy = [hoy.getFullYear(), String(hoy.getMonth()+1).padStart(2,'0'), String(hoy.getDate()).padStart(2,'0')].join('-');
  document.getElementById('cs-fecha').value = fechaHoy;

  const activa = getEmpresaActiva();
  const empresaSel = document.getElementById('cs-empresa-select');
  if (activa) {
    empresaSel.innerHTML = `<option value="${activa.id}">${activa.nombre}</option>`;
    empresaSel.value = activa.id;
  }

  const tecnicos = await listarTecnicos(activa?.id || null);
  poblarSelect('cs-tecnico-select', tecnicos, 'Encargado');
  if (activa) {
    const sectores = await listarSectores(activa.id);
    renderSectoresCS(sectores);
    if (sectores.length > 0) {
      todosLotes = await listarLotesPorSectores(sectores.map(s => s.id));
    }
  }
  renderCortes();

  const header = document.querySelector('#view-corte-semilla-nuevo h3');
  if (header) header.textContent = '✂️ Nuevo corte de semilla';
  const btn = document.querySelector('#form-cs-nuevo button[type="submit"]');
  if (btn) { btn.disabled = false; btn.textContent = '📌 Crear corte de semilla'; }
}

export async function cargarEdicionCorteSemilla(id) {
  modoEdicion = true;
  notaEditandoId = id;
  cortes = [];
  todosLotes = [];
  _seq = 0;

  document.getElementById('form-cs-nuevo').reset();

  const data = await obtenerCorteSemilla(id);
  if (!data) { alert('No se encontró el registro'); window.showView('corte-semilla-registros'); return; }

  const c = data.cab;
  document.getElementById('cs-campana-input').value = c.campana ?? '';
  document.getElementById('cs-fecha').value = c.fecha ?? '';
  document.getElementById('cs-observaciones').value = c.observaciones ?? '';

  const empresaSel = document.getElementById('cs-empresa-select');
  empresaSel.innerHTML = `<option value="${c.empresa_id}">${c.empresa_nombre}</option>`;
  empresaSel.value = c.empresa_id;

  const tecnicos = await listarTecnicos(c.empresa_id);
  poblarSelect('cs-tecnico-select', tecnicos, 'Encargado');
  document.getElementById('cs-tecnico-select').value = c.tecnico_id ?? '';

  const sectores = await listarSectores(c.empresa_id);
  const sectoresSeleccionados = new Set();
  if (data.cortes?.length) {
    const lotesEmpresa = await listarLotesPorSectores(sectores.map(s => s.id));
    data.cortes.forEach(co => {
      const lote = lotesEmpresa.find(l => String(l.id) === String(co.lote_semilla_id));
      if (lote?.sector_id) sectoresSeleccionados.add(String(lote.sector_id));
    });
    todosLotes = lotesEmpresa;
  }
  renderSectoresCS(sectores, [...sectoresSeleccionados]);

  cortes = (data.cortes || []).map(co => ({
    _id: nextId(),
    lote_semilla_id: co.lote_semilla_id,
    lote_plantado_id: co.lote_plantado_id,
    variedad_id: co.variedad_id,
    fecha_corte: co.fecha_corte,
    sup_corte_ha: co.sup_corte_ha,
    rendimiento_tn_ha: co.rendimiento_tn_ha,
    tn_cortadas_manual: co.tn_cortadas_manual,
    tn_cortadas_mecanizada: co.tn_cortadas_mecanizada,
    consumo_semilla_tn_ha: co.consumo_semilla_tn_ha,
    total_general_ha: co.total_general_ha,
    sup_plantada_mec_ha: co.sup_plantada_mec_ha,
  }));

  renderCortes();

  const header = document.querySelector('#view-corte-semilla-nuevo h3');
  if (header) header.textContent = '✏️ Editar corte de semilla';
  const btn = document.querySelector('#form-cs-nuevo button[type="submit"]');
  if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar cambios'; }
}

/* ========================= SECTORES ========================= */
function renderSectoresCS(sectores, idsSeleccionados = []) {
  const cont = document.getElementById('cs-sectores-container');
  if (!sectores.length) { cont.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem">No hay sectores.</p>'; return; }
  const selSet = new Set(idsSeleccionados.map(String));
  cont.innerHTML = `
    <div class="chip-row">
      ${sectores.map(s => {
        const checked = selSet.has(String(s.id)) ? 'checked' : '';
        return `
        <label class="sector-chip ${checked ? 'activo' : ''}" data-sector-id="${s.id}">
          <input type="checkbox" class="cs-chk-sector" value="${s.id}" ${checked}>
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
        const cb = chip.querySelector('.cs-chk-sector');
        chip.classList.toggle('activo', cb.checked);
        const ids = [...document.querySelectorAll('.cs-chk-sector:checked')].map(c => c.value);
        todosLotes = ids.length ? await listarLotesPorSectores(ids) : [];
        renderCortes();
      });
    });
  });
}

/* ========================= CORTES ========================= */
function labelLote(lote) {
  if (!lote) return '';
  return `${lote.nombre}${lote.hectareas ? ` (${lote.hectareas} ha)` : ''}`;
}

function renderLoteSearchCS(id, loteId, placeholder) {
  const lote = todosLotes.find(l => String(l.id) === String(loteId));
  const label = lote ? labelLote(lote) : '';
  return `
    <div class="lote-combo-wrap" style="position:relative">
      <input type="text" id="${id}" class="lote-search" value="${label}" placeholder="${placeholder}" autocomplete="off"
        style="width:100%;box-sizing:border-box">
      <div id="${id}-dropdown" class="lote-dropdown"
        style="display:none;position:absolute;top:100%;left:0;right:0;z-index:200;
               background:var(--surface,#fff);border:1px solid var(--border,#ccc);
               border-top:none;border-radius:0 0 6px 6px;max-height:200px;overflow-y:auto;
               box-shadow:0 4px 12px rgba(0,0,0,0.15)"></div>
      <input type="hidden" id="${id}-id" value="${loteId ?? ''}">
    </div>`;
}

function bindLoteSearchCS(inputId, onSelect) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(`${inputId}-dropdown`);
  if (!input || !dropdown) return;

  function mostrarOpciones(texto) {
    const q = texto.toLowerCase().trim();
    const filtrados = q ? todosLotes.filter(l => l.nombre.toLowerCase().includes(q)) : todosLotes;
    if (!filtrados.length) {
      dropdown.innerHTML = `<div style="padding:0.5rem 0.8rem;color:var(--text-muted);font-size:0.85rem">Sin resultados</div>`;
    } else {
      dropdown.innerHTML = filtrados.map(l => `
        <div class="lote-drop-item" data-id="${l.id}" data-nombre="${l.nombre}" data-hectareas="${l.hectareas ?? ''}"
          style="padding:0.45rem 0.8rem;cursor:pointer;font-size:0.88rem;border-bottom:1px solid var(--border-light,#eee)"
          onmouseover="this.style.background='var(--primary-faint,#e8f5e9)'" onmouseout="this.style.background=''">
          <span style="font-weight:600">${l.nombre}</span>
          ${l.hectareas ? `<span style="margin-left:0.4rem;color:var(--text-muted);font-size:0.8rem">(${l.hectareas} ha)</span>` : ''}
        </div>`).join('');
      dropdown.querySelectorAll('.lote-drop-item').forEach(item => {
        item.addEventListener('mousedown', e => { e.preventDefault(); input.value = labelLote({ nombre: item.dataset.nombre, hectareas: item.dataset.hectareas }); dropdown.style.display = 'none'; onSelect(item.dataset.id); });
      });
    }
    dropdown.style.display = 'block';
  }

  input.addEventListener('focus', () => mostrarOpciones(input.value));
  input.addEventListener('input', () => { onSelect(''); mostrarOpciones(input.value); });
  input.addEventListener('blur', () => { setTimeout(() => { dropdown.style.display = 'none'; }, 150); });
}

function renderCortes() {
  const cont = document.getElementById('cs-cortes-container');
  cont.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem">
      <strong>✂️ Detalle de corte</strong>
      <button type="button" class="btn-secondary" style="margin:0;padding:0.35rem 0.8rem;font-size:0.85rem"
        id="btn-agregar-corte">➕ Agregar corte</button>
    </div>
    ${cortes.length === 0
      ? '<p style="color:var(--text-muted);font-size:0.88rem;padding:0.5rem 0">Sin cortes agregados aún.</p>'
      : cortes.map(renderFilaCorte).join('')}`;

  document.getElementById('btn-agregar-corte').onclick = () => {
    cortes.push({ _id: nextId(), lote_semilla_id:'', lote_plantado_id:'', variedad_id:'', fecha_corte:'', sup_corte_ha:'', rendimiento_tn_ha:'', tn_cortadas_manual:'', tn_cortadas_mecanizada:'', consumo_semilla_tn_ha:'', total_general_ha:'', sup_plantada_mec_ha:'' });
    renderCortes();
  };
  cortes.forEach(c => bindCorte(c));
}

function renderFilaCorte(c) {
  return `
    <div class="cana-corte-fila">
      <div style="display:flex;justify-content:flex-end;margin-bottom:0.2rem">
        <button type="button" class="btn-icon-danger btn-del-cs" data-cid="${c._id}" title="Quitar">✕</button>
      </div>
      <div class="grid">
        <label>Fecha corte <input type="date" id="cs-cf-${c._id}" value="${c.fecha_corte??''}"></label>
        <label>Lote Plantado ${renderLoteSearchCS(`cs-lp-${c._id}`, c.lote_plantado_id, '🔍 Buscar lote...')}</label>
        <label>SUP. PLANTADA MANUAL HA <input type="number" id="cs-tgha-${c._id}" step="0.01" min="0" value="${c.total_general_ha??''}" placeholder="0.00"></label>
        <label>SUP. PLANTADA MEC HA <input type="number" id="cs-spm-${c._id}" step="0.01" min="0" value="${c.sup_plantada_mec_ha??''}" placeholder="0.00"></label>
        <label>Lote semilla (origen) ${renderLoteSearchCS(`cs-ls-${c._id}`, c.lote_semilla_id, '🔍 Buscar lote...')}</label>
        <label>Variedad <select id="cs-var-${c._id}"><option value="">Sin variedad</option></select></label>
        <label>SUP. CORTE (HA)<input type="number" id="cs-sup-${c._id}" step="0.01" min="0" value="${c.sup_corte_ha??''}" placeholder="0.00"></label>
        <label>TN Cortada Manual <input type="number" id="cs-tnm-${c._id}" step="0.01" min="0" value="${c.tn_cortadas_manual??''}" placeholder="0.00"></label>
        <label>TN Cortada Mecanizada <input type="number" id="cs-tnmec-${c._id}" step="0.01" min="0" value="${c.tn_cortadas_mecanizada??''}" placeholder="0.00"></label>
        <label>Rend TN/HA <input type="number" id="cs-rend-${c._id}" value="${c.rendimiento_tn_ha??''}" readonly style="background:var(--primary-faint)"></label>
        <label>Consumo Semilla TN/HA <input type="number" id="cs-cons-${c._id}" value="${c.consumo_semilla_tn_ha??''}" readonly style="background:var(--primary-faint)"></label>
      </div>
    </div>`;
}

function bindCorte(c) {
  const g = id => document.getElementById(id);

  g(`btn-del-cs-${c._id}`)?.addEventListener('click', () => {
    cortes = cortes.filter(x => x._id !== c._id);
    renderCortes();
  });

  bindLoteSearchCS(`cs-ls-${c._id}`, async (loteId) => {
    c.lote_semilla_id = loteId;
    if (!loteId) { await poblarVariedades(`cs-var-${c._id}`, null, null); return; }
    const lote = todosLotes.find(l => String(l.id) === String(loteId));
    if (lote?.cultivo_id) {
      await poblarVariedades(`cs-var-${c._id}`, lote.cultivo_id, lote.variedad_id);
    }
    c.variedad_id = lote?.variedad_id ?? null;
  });

  bindLoteSearchCS(`cs-lp-${c._id}`, async (loteId) => {
    c.lote_plantado_id = loteId;
  });

  if (c.lote_semilla_id) {
    const lote = todosLotes.find(l => String(l.id) === String(c.lote_semilla_id));
    if (lote?.cultivo_id) {
      poblarVariedades(`cs-var-${c._id}`, lote.cultivo_id, c.variedad_id || lote.variedad_id);
    }
  }

  if (c.lote_plantado_id) {
    const lote = todosLotes.find(l => String(l.id) === String(c.lote_plantado_id));
    if (lote?.cultivo_id) {
      poblarVariedades(`cs-var-${c._id}`, lote.cultivo_id, c.variedad_id || lote.variedad_id);
    }
  }

  const bind = (id, field) => { const el = g(id); if (el) el.oninput = () => c[field] = el.value; };
  bind(`cs-cf-${c._id}`, 'fecha_corte');
  const selVar = g(`cs-var-${c._id}`);
  if (selVar) selVar.onchange = () => c.variedad_id = selVar.value;
  bind(`cs-sup-${c._id}`, 'sup_corte_ha');
  bind(`cs-tgha-${c._id}`, 'total_general_ha');
  bind(`cs-spm-${c._id}`, 'sup_plantada_mec_ha');
  bind(`cs-tnm-${c._id}`, 'tn_cortadas_manual');
  bind(`cs-tnmec-${c._id}`, 'tn_cortadas_mecanizada');

  // Auto-calcular Rend TN/HA y Consumo Semilla
  const recalc = () => {
    const sup = parseFloat(c.sup_corte_ha) || 0;
    const tnm = parseFloat(c.tn_cortadas_manual) || 0;
    const tgha = parseFloat(c.total_general_ha) || 0;
    const rendEl = g(`cs-rend-${c._id}`);
    const consEl = g(`cs-cons-${c._id}`);
    if (rendEl) rendEl.value = sup > 0 ? (tnm / sup).toFixed(4) : '';
    if (consEl) consEl.value = tgha > 0 ? (tnm / tgha).toFixed(4) : '';
    c.rendimiento_tn_ha = sup > 0 ? tnm / sup : null;
    c.consumo_semilla_tn_ha = tgha > 0 ? tnm / tgha : null;
  };

  const supEl = g(`cs-sup-${c._id}`);
  const tnmEl = g(`cs-tnm-${c._id}`);
  const tghaEl = g(`cs-tgha-${c._id}`);
  if (supEl) supEl.addEventListener('input', recalc);
  if (tnmEl) tnmEl.addEventListener('input', recalc);
  if (tghaEl) tghaEl.addEventListener('input', recalc);
}

/* ========================= GUARDAR ========================= */
async function guardarCorteSemilla() {
  const val = id => document.getElementById(id).value;
  const fecha = val('cs-fecha');
  if (!fecha) { alert('La fecha es obligatoria'); return; }
  if (!cortes.filter(c => c.lote_semilla_id).length) { alert('Agregá al menos un corte de semilla'); return; }

  const btn = document.querySelector('#form-cs-nuevo button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Guardando...';

  try {
    const payload = {
      empresa_id: val('cs-empresa-select'),
      tecnico_id: val('cs-tecnico-select') || null,
      campana: val('cs-campana-input'),
      fecha,
      observaciones: val('cs-observaciones') || null,
      cortes: cortes.filter(c => c.lote_semilla_id).map(c => ({
        lote_semilla_id: c.lote_semilla_id || null,
        variedad_id: c.variedad_id || null,
        fecha_corte: c.fecha_corte || null,
        sup_corte_ha: parseFloat(c.sup_corte_ha) || null,
        rendimiento_tn_ha: parseFloat(c.rendimiento_tn_ha) || null,
        tn_cortadas_manual: parseFloat(c.tn_cortadas_manual) || 0,
        tn_cortadas_mecanizada: parseFloat(c.tn_cortadas_mecanizada) || 0,
        consumo_semilla_tn_ha: parseFloat(c.consumo_semilla_tn_ha) || null,
        lote_plantado_id: c.lote_plantado_id || null,
        total_general_ha: parseFloat(c.total_general_ha) || null,
        sup_plantada_mec_ha: parseFloat(c.sup_plantada_mec_ha) || null,
      })),
    };

    if (modoEdicion && notaEditandoId) {
      await actualizarCorteSemillaCompleta(notaEditandoId, payload);
    } else {
      await crearCorteSemilla(payload);
    }

    modoEdicion = false; notaEditandoId = null;
    window.showView('corte-semilla-registros');
  } catch (err) {
    alert('❌ ' + err.message);
    btn.disabled = false;
    btn.textContent = modoEdicion ? '💾 Guardar cambios' : '📌 Crear corte de semilla';
  }
}

/* ========================= HELPERS ========================= */
function poblarSelect(id, items, placeholder) {
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.innerHTML = `<option value="">${placeholder}</option>` +
    items.map(i => `<option value="${i.id}">${i.nombre}</option>`).join('');
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

export async function cargarDetalleCorteSemilla(id) {
  const cont = document.getElementById('cs-detalle-contenido');
  const data = await obtenerCorteSemilla(id);
  if (!data) { cont.innerHTML = '<p style="text-align:center;color:var(--text-muted)">No se encontró el registro</p>'; return; }

  document.getElementById('btn-cs-detalle-volver').onclick = () => window.showView('corte-semilla-registros');

  const c = data.cab;

  cont.innerHTML = `
    <div class="card">
      <div class="hoja-card-header">
        <span class="hoja-numero">${c.numero_completo ?? '—'}</span>
        <span class="hoja-estado hoja-estado--${c.estado.toLowerCase()}">${c.estado}</span>
      </div>
      <div class="detalle-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-top:0.75rem">
        <div class="detalle-info"><strong>Empresa:</strong> ${c.empresa_nombre ?? '—'}</div>
        <div class="detalle-info"><strong>Técnico:</strong> ${c.tecnico_nombre ?? '—'}</div>
        <div class="detalle-info"><strong>Campaña:</strong> ${c.campana ?? '—'}</div>
        <div class="detalle-info"><strong>Fecha:</strong> ${formatFecha(c.fecha)}</div>
        <div class="detalle-info"><strong>Mes:</strong> ${c.mes ?? '—'}</div>
      </div>
      ${c.observaciones ? `<div class="detalle-info" style="margin-top:0.75rem"><strong>Observaciones:</strong> ${c.observaciones}</div>` : ''}
    </div>

    <div class="card">
      <h3>✂️ Cortes registrados</h3>
      ${!data.cortes?.length ? '<p style="color:var(--text-muted);font-size:0.88rem">Sin cortes registrados.</p>' : data.cortes.map(co => `
        <div class="detalle-bloque">
          <div class="detalle-bloque-header">
            <strong>🌱 ${co.lote_semilla_nombre ?? '—'}</strong>
          </div>
          <div class="detalle-bloque-body">
            <div class="detalle-grid">
              <span>📅 ${formatFecha(co.fecha_corte)}</span>
              <span>🌿 ${co.variedad_nombre ?? '—'}</span>
              <span>🌾 Plantado: <strong>${co.lote_plantado_nombre ?? '—'}</strong></span>
              <span>Sup: <strong>${co.sup_corte_ha ?? '—'} ha</strong></span>
              <span>Sup Manual: <strong>${co.total_general_ha ?? '—'} ha</strong></span>
              <span>Sup Mec: <strong>${co.sup_plantada_mec_ha ?? '—'} ha</strong></span>
              <span>Manual: <strong>${co.tn_cortadas_manual ?? '—'} tn</strong></span>
              <span>Mec: <strong>${co.tn_cortadas_mecanizada ?? '—'} tn</strong></span>
              <span>Rend: <strong>${co.rendimiento_tn_ha ?? '—'} TN/HA</strong></span>
              <span>Consumo: <strong>${co.consumo_semilla_tn_ha ?? '—'} TN/HA</strong></span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <button id="btn-cs-detalle-exportar" class="btn-secondary" style="width:100%">📤 Exportar Excel</button>
  `;

  document.getElementById('btn-cs-detalle-exportar').onclick = async () => {
    const btn = document.getElementById('btn-cs-detalle-exportar');
    btn.disabled = true; btn.textContent = '⏳ Exportando...';
    try {
      const { base64, nombre } = await prepararExcelCorteSemilla(id);
      const { Filesystem, Share } = window.Capacitor.Plugins;
      const base64Limpio = base64.includes(',') ? base64.split(',')[1] : base64;
      const dataUri = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64Limpio}`;
      const resultado = await Filesystem.writeFile({ path: nombre, data: dataUri, directory: 'CACHE', recursive: true });
      await Share.share({
        title: 'Corte de Semilla - AgroApp',
        text: `Exportación: ${c.numero_completo}`,
        files: [resultado.uri],
        dialogTitle: '¿Dónde querés enviar el Excel?'
      });
    } catch (err) {
      if (err.message?.includes('cancel') || err.message?.includes('dismiss')) { /* cancelado */ }
      else { alert('❌ No se pudo exportar:\n' + err.message); }
    } finally {
      btn.disabled = false; btn.textContent = '📤 Exportar Excel';
    }
  };
}
