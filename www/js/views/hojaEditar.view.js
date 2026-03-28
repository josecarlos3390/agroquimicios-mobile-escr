import { getHojaCabById, updateHojaCab } from '../repositories/hojasCab.repo.js';
import { actualizarHojaCabecera } from '../services/hojas.service.js';
import { listarEmpresas } from '../services/empresas.service.js';
import { listarSectores } from '../services/sectores.service.js';
import { listarTecnicos } from '../services/tecnicos.service.js';
import { listarTiposAplicacion } from '../services/tiposAplicacion.service.js';
import { listarVariedades } from '../services/variedades.service.js';
import { getLotesByHojaId, replaceLotesHoja } from '../repositories/hojasLotes.repo.js';
import { getSectoresByHojaId, replaceSectoresHoja } from '../repositories/hojasSectores.repo.js';
import { listarLotesPorSectores } from '../services/lotes.service.js';
import { recalcularDosisHoja } from '../repositories/hojasDetalle.repo.js';

let hojaActual = null;
let _editarInicializado = false;
// Mapa loteId -> hectareasAplicadas para edición parcial
let hectareasParciales = {};

const MESES = [
  'ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
  'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'
];

export function initHojaEditarView() {
  if (_editarInicializado) return;
  _editarInicializado = true;

  const form          = document.getElementById('form-editar-hoja');
  const empresaSelect = document.getElementById('editar-empresa-select');
  const cultivoSelect = document.getElementById('editar-cultivo-select');
  const variedadSelect = document.getElementById('editar-variedad-select');

  // Empresa → recarga sectores como chips
  empresaSelect.onchange = async () => {
    resetEditarDesde('sectores');
    if (!empresaSelect.value) return;
    const sectores = await listarSectores(empresaSelect.value);
    renderSectoresEditar(sectores, new Set());
  };

  // Delegación: cambio de chip de sector → recargar lotes
  form.addEventListener('change', async (e) => {

    if (e.target.classList.contains('chk-sector-editar')) {
      resetEditarDesde('lotes');
      const sectorIds = getSectoresSeleccionados();
      if (sectorIds.length === 0) return;
      const lotes = await listarLotesPorSectores(sectorIds);
      renderLotesEditar(lotes, new Set(), {});
      return;
    }

    // Cambio en checkbox de lote o "todos" → recalcular total hectáreas
    if (e.target.classList.contains('editar-chk-lote') ||
        e.target.classList.contains('editar-chk-todos-sector')) {
      actualizarHectareasEditar();
    }
  });

  // Cultivo → variedades
  cultivoSelect.onchange = async () => {
    variedadSelect.innerHTML = '<option value="">Sin variedad</option>';
    variedadSelect.disabled = true;
    if (!cultivoSelect.value) return;
    const variedades = await listarVariedades(cultivoSelect.value);
    if (variedades.length > 0) {
      poblarSelect(variedadSelect, variedades, 'Sin variedad');
      variedadSelect.disabled = false;
    }
  };

  // Fecha inicio → mes
  document.getElementById('editar-fecha-inicio').onchange = (e) => {
    if (!e.target.value) return;
    const mes = MESES[new Date(e.target.value + 'T00:00:00').getMonth()];
    document.getElementById('editar-mes').textContent = mes;
  };

  document.getElementById('btn-editar-hoja-volver').onclick = () => {
    window.showView('hojas');
  };

  // Submit
  form.addEventListener('submit', async e => {
    e.preventDefault();

    const sectoresSeleccionados = getSectoresSeleccionados();
    if (sectoresSeleccionados.length === 0) {
      alert('Seleccione al menos un sector');
      return;
    }

    const fechaInicio = document.getElementById('editar-fecha-inicio').value;
    const fechaFin    = document.getElementById('editar-fecha-fin').value;

    if (fechaFin < fechaInicio) {
      alert('La fecha de fin no puede ser anterior a la fecha de inicio');
      return;
    }

    const mes = MESES[new Date(fechaInicio + 'T00:00:00').getMonth()];

    // Armar lotes ANTES de deshabilitar el botón para detectar errores temprano
    const lotesConHa = getLotesConHectareas();
    if (lotesConHa.length === 0) {
      alert('Seleccione al menos un lote');
      return;
    }

    // Calcular hectáreas totales sumando los inputs en este momento
    const container = document.getElementById('editar-lotes-container');
    let hectareasTotales = 0;
    lotesConHa.forEach(l => {
      const input = container.querySelector(`.lote-ha-input[data-lote-id="${l.loteId}"]`);
      const cb    = container.querySelector(`.editar-chk-lote[value="${l.loteId}"]`);
      const ha    = input ? parseFloat(input.value) : parseFloat(cb?.dataset.hectareas || 0);
      if (!isNaN(ha) && ha > 0) hectareasTotales += ha;
    });
    // Si no se pudo calcular, usar el campo manual
    if (hectareasTotales <= 0) {
      hectareasTotales = parseFloat(document.getElementById('editar-cantidad-hectareas').value);
    }
    if (!hectareasTotales || hectareasTotales <= 0) {
      alert('Ingrese una cantidad de hectáreas válida');
      return;
    }

    const btnSubmit = form.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.textContent = '⏳ Guardando...';

    try {
      const hectareasAnteriores = parseFloat(hojaActual.cantidad_hectareas);

      // 1. Actualizar cabecera
      await updateHojaCab(hojaActual.id, {
        empresa_id:         empresaSelect.value,
        campana:            document.getElementById('editar-campana-input').value.toUpperCase(),
        cultivo_id:         cultivoSelect.value,
        tecnico_id:         document.getElementById('editar-tecnico-select').value,
        tipo_aplicacion_id: document.getElementById('editar-tipo-aplicacion-select').value,
        caudal_id:          null,
        caudal_descripcion: document.getElementById('editar-caudal-input').value.toUpperCase() || null,
        mes,
        fecha_inicio:       fechaInicio,
        fecha_fin:          fechaFin,
        cantidad_hectareas: hectareasTotales,
        observaciones:      document.getElementById('editar-observaciones').value?.toUpperCase() || null,
      });

      // 2. Reemplazar sectores
      await replaceSectoresHoja(hojaActual.id, sectoresSeleccionados);

      // 3. Reemplazar lotes con hectáreas parciales
      await replaceLotesHoja(hojaActual.id, lotesConHa);

      // 4. Recalcular dosis solo si las hectáreas cambiaron
      if (hectareasAnteriores !== hectareasTotales) {
        await recalcularDosisHoja(hojaActual.id, hectareasTotales);
      }

      window.showView('hojas');

    } catch (err) {
      const msg = err?.message || err?.error?.message || JSON.stringify(err) || 'Error desconocido';
      alert('❌ ' + msg);
      btnSubmit.disabled = false;
      btnSubmit.textContent = '💾 Guardar cambios';
    }
  });
}

export async function cargarHojaEditar(hojaId) {
  hojaActual = await getHojaCabById(hojaId);
  hectareasParciales = {};

  if (!hojaActual) {
    alert('Hoja no encontrada');
    window.showView('hojas');
    return;
  }

  document.getElementById('editar-hoja-numero').textContent = hojaActual.numero_completo;
  document.getElementById('editar-mes').textContent = hojaActual.mes;

  const [empresas, tecnicos, tiposAplicacion] = await Promise.all([
    listarEmpresas(),
    listarTecnicos(),
    listarTiposAplicacion(),
  ]);

  poblarSelect(document.getElementById('editar-empresa-select'), empresas, 'Seleccione empresa');
  poblarSelect(document.getElementById('editar-tecnico-select'), tecnicos, 'Seleccione técnico');
  poblarSelect(document.getElementById('editar-tipo-aplicacion-select'), tiposAplicacion, 'Seleccione tipo');

  document.getElementById('editar-empresa-select').value         = hojaActual.empresa_id;
  document.getElementById('editar-tecnico-select').value         = hojaActual.tecnico_id;
  document.getElementById('editar-tipo-aplicacion-select').value = hojaActual.tipo_aplicacion_id;
  document.getElementById('editar-caudal-input').value           = hojaActual.caudal_descripcion ?? '';
  document.getElementById('editar-campana-input').value          = hojaActual.campana;
  document.getElementById('editar-fecha-inicio').value           = hojaActual.fecha_inicio;
  document.getElementById('editar-fecha-fin').value              = hojaActual.fecha_fin;
  document.getElementById('editar-cantidad-hectareas').value     = hojaActual.cantidad_hectareas;
  document.getElementById('editar-observaciones').value          = hojaActual.observaciones ?? '';

  // Cargar sectores actuales de la hoja
  const [todosLosSectores, sectoresDeHoja, lotesDeHoja] = await Promise.all([
    listarSectores(hojaActual.empresa_id),
    getSectoresByHojaId(hojaActual.id),
    getLotesByHojaId(hojaActual.id),
  ]);

  const idsSectoesActuales = new Set(sectoresDeHoja.map(s => String(s.id)));
  renderSectoresEditar(todosLosSectores, idsSectoesActuales);

  // Cargar todos los lotes de los sectores actuales
  const sectorIdsActuales = sectoresDeHoja.map(s => s.id);
  const todosLosLotes = sectorIdsActuales.length > 0
    ? await listarLotesPorSectores(sectorIdsActuales)
    : [];

  // Construir mapa de loteId → hectáreas parciales guardadas
  const idsLotesActuales = new Set(lotesDeHoja.map(l => String(l.id)));
  const parciales = {};
  lotesDeHoja.forEach(l => {
    if (l.hectareas_parcial !== null && l.hectareas_parcial !== undefined) {
      parciales[String(l.id)] = l.hectareas_parcial;
    }
  });
  hectareasParciales = parciales;

  renderLotesEditar(todosLosLotes, idsLotesActuales, parciales);

  // Cultivo y variedad
  const cultivoSelect  = document.getElementById('editar-cultivo-select');
  const variedadSelect = document.getElementById('editar-variedad-select');

  // Poblar cultivos desde los lotes (únicos)
  const cultivosUnicos = new Map();
  todosLosLotes.forEach(l => {
    if (l.cultivo_id && !cultivosUnicos.has(l.cultivo_id)) {
      cultivosUnicos.set(l.cultivo_id, { id: l.cultivo_id, nombre: l.cultivo_nombre });
    }
  });
  poblarSelect(cultivoSelect, [...cultivosUnicos.values()], 'Seleccione cultivo');
  cultivoSelect.value = hojaActual.cultivo_id ?? '';

  if (hojaActual.cultivo_id) {
    const variedades = await listarVariedades(hojaActual.cultivo_id);
    if (variedades.length > 0) {
      poblarSelect(variedadSelect, variedades, 'Sin variedad');
      variedadSelect.disabled = false;
    }
  }
}

/* ========================= RENDER SECTORES EDITAR (chips) ========================= */
function renderSectoresEditar(sectores, idsSeleccionados = new Set()) {
  const container = document.getElementById('editar-sectores-container');
  if (!container) return;

  if (sectores.length === 0) {
    container.innerHTML = '<strong>🗺️ Sectores</strong><p>No hay sectores</p>';
    return;
  }

  container.innerHTML = `
    <strong>🗺️ Sectores</strong>
    <div class="chip-row">
      ${sectores.map(s => {
        const activo = idsSeleccionados.has(String(s.id));
        return `
          <label class="sector-chip ${activo ? 'activo' : ''}" data-sector-id="${s.id}">
            <input type="checkbox" class="chk-sector-editar" value="${s.id}" ${activo ? 'checked' : ''}>
            <svg class="chip-leaf" viewBox="0 0 14 14" fill="none">
              <path class="chip-leaf-bg" d="M7 1C4 1 2 4 2 7s2 6 5 6 5-3 5-6-2-6-5-6z"/>
              <path class="chip-leaf-vein" d="M7 3v8M4 6c1-1 2-1 3 0s2 1 3 0" stroke-width="0.8" stroke-linecap="round"/>
            </svg>
            <span class="chip-nombre">${s.nombre}</span>
            ${s.hectareas ? `<span class="chip-ha">${s.hectareas} ha</span>` : ''}
          </label>
        `;
      }).join('')}
    </div>
  `;

  container.querySelectorAll('.sector-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      requestAnimationFrame(() => {
        chip.classList.toggle('activo', chip.querySelector('.chk-sector-editar').checked);
      });
    });
  });
}

/* ========================= RENDER LOTES EDITAR (acordeón con hectáreas editables) ========================= */
function renderLotesEditar(lotes, idsSeleccionados = new Set(), parciales = {}) {
  const container = document.getElementById('editar-lotes-container');
  if (!container) return;

  if (!lotes || lotes.length === 0) {
    container.innerHTML = '<strong>🌿 Lotes</strong><p>No hay lotes en los sectores seleccionados</p>';
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
    g.haTotal += parseFloat(l.hectareas ?? 0);
  });

  const acordeonesHTML = [...porSector.entries()].map(([sId, grupo]) => `
    <div class="sector-acordeon" data-sector-id="${sId}">
      <div class="sector-acordeon-header">
        <div class="sector-acordeon-titulo">
          <span>🗺️ ${grupo.nombre}</span>
          <span class="sector-acordeon-meta">
            ${grupo.lotes.length} lote${grupo.lotes.length !== 1 ? 's' : ''}
            ${grupo.haTotal > 0 ? ` · ${grupo.haTotal.toFixed(2)} ha` : ''}
          </span>
        </div>
        <div class="sector-acordeon-acciones">
          <button type="button" class="sector-acordeon-todos editar-chk-todos-sector" data-sector-id="${sId}">
            ☑ Todos
          </button>
          <span class="sector-acordeon-chevron">▼</span>
        </div>
      </div>
      <div class="sector-acordeon-body">
        ${grupo.lotes.map(l => {
          const checked  = idsSeleccionados.has(String(l.id));
          const haParcial = parciales[String(l.id)] ?? l.hectareas ?? '';
          return `
            <div class="lote-label lote-editar-row" data-lote-id="${l.id}">
              <input type="checkbox" class="editar-chk-lote" value="${l.id}"
                data-sector-id="${sId}"
                data-hectareas="${l.hectareas ?? 0}"
                data-cultivo-id="${l.cultivo_id ?? ''}"
                data-cultivo-nombre="${l.cultivo_nombre ?? ''}"
                data-nombre="${(l.nombre ?? '').toLowerCase()}"
                ${checked ? 'checked' : ''}>
              <span class="lote-label-info" style="flex:1; min-width:0;">
                <span class="lote-nombre">${l.nombre}</span>
                <span class="lote-meta">
                  ${l.hectareas ?? '-'} ha total
                  ${l.cultivo_nombre ? ` · ${l.cultivo_nombre}` : ''}
                  ${l.variedad_nombre ? ` / ${l.variedad_nombre}` : ''}
                </span>
              </span>
              <div class="lote-ha-editar">
                <input type="number"
                  class="lote-ha-input"
                  data-lote-id="${l.id}"
                  data-ha-max="${l.hectareas ?? ''}"
                  value="${haParcial}"
                  step="0.01"
                  min="0.01"
                  max="${l.hectareas ?? ''}"
                  placeholder="ha"
                  title="Hectáreas aplicadas (máx. ${l.hectareas ?? '?'} ha)"
                  ${!checked ? 'disabled' : ''}>
                <span class="lote-ha-label">ha</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <strong>🌿 Lotes</strong>
    <p style="font-size:0.78rem; color:var(--text-muted); margin:0.25rem 0 0.5rem;">
      Podés ajustar las hectáreas aplicadas por lote si la aplicación fue parcial.
    </p>
    ${acordeonesHTML}
  `;

  // Acordeón abrir/cerrar
  container.querySelectorAll('.sector-acordeon-header').forEach(header => {
    header.addEventListener('click', (e) => {
      if (e.target.closest('.sector-acordeon-todos')) return;
      header.closest('.sector-acordeon').classList.toggle('abierto');
    });
  });

  // "Todos" por sector
  container.querySelectorAll('.sector-acordeon-todos').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sId     = btn.dataset.sectorId;
      const cbs     = container.querySelectorAll(`.editar-chk-lote[data-sector-id="${sId}"]`);
      const todosOn = [...cbs].every(cb => cb.checked);
      cbs.forEach(cb => {
        cb.checked = !todosOn;
        habilitarInputHa(cb);
      });
      actualizarHectareasEditar();
    });
  });

  // Checkbox de lote → habilitar/deshabilitar input ha + recalcular total
  container.querySelectorAll('.editar-chk-lote').forEach(cb => {
    cb.addEventListener('change', () => {
      habilitarInputHa(cb);
      actualizarHectareasEditar();
    });
  });

  // Input de hectáreas parciales → guardar en mapa + recalcular total
  container.querySelectorAll('.lote-ha-input').forEach(input => {
    input.addEventListener('input', () => {
      const loteId = input.dataset.loteId;
      const val    = parseFloat(input.value);
      const max    = parseFloat(input.dataset.haMax);
      if (!isNaN(val) && val > 0) {
        if (max && val > max) input.value = max;
        hectareasParciales[loteId] = parseFloat(input.value);
      } else {
        delete hectareasParciales[loteId];
      }
      actualizarHectareasEditar();
    });
  });

  // Auto-expandir los sectores que tienen lotes seleccionados
  container.querySelectorAll('.sector-acordeon').forEach(ac => {
    const tieneMarcados = ac.querySelectorAll('.editar-chk-lote:checked').length > 0;
    if (tieneMarcados) ac.classList.add('abierto');
  });
}

/* Habilita o deshabilita el input de ha según el checkbox del lote */
function habilitarInputHa(cb) {
  const row   = cb.closest('.lote-editar-row');
  const input = row?.querySelector('.lote-ha-input');
  if (!input) return;
  input.disabled = !cb.checked;
  if (!cb.checked) {
    // Al desmarcar, restaurar el valor original del lote
    input.value = input.dataset.haMax;
    delete hectareasParciales[input.dataset.loteId];
  }
}

/* Suma las hectáreas de los lotes seleccionados (con parciales) y actualiza el campo */
function actualizarHectareasEditar() {
  const container = document.getElementById('editar-lotes-container');
  let total = 0;
  container.querySelectorAll('.editar-chk-lote:checked').forEach(cb => {
    const loteId = cb.value;
    const input  = container.querySelector(`.lote-ha-input[data-lote-id="${loteId}"]`);
    const ha     = input ? parseFloat(input.value) : parseFloat(cb.dataset.hectareas || 0);
    if (!isNaN(ha)) total += ha;
  });

  const campo = document.getElementById('editar-cantidad-hectareas');
  if (campo && total > 0) campo.value = parseFloat(total.toFixed(4));
}

/* ========================= HELPERS ========================= */
function poblarSelect(select, items, placeholder) {
  select.innerHTML = `<option value="">${placeholder}</option>`;
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = item.nombre;
    select.appendChild(opt);
  });
}

function getSectoresSeleccionados() {
  return [...document.querySelectorAll('#editar-sectores-container .chk-sector-editar:checked')]
    .map(cb => cb.value);
}

function getLotesConHectareas() {
  const container = document.getElementById('editar-lotes-container');
  return [...container.querySelectorAll('.editar-chk-lote:checked')]
    .map(cb => {
      // Buscar el input dentro del mismo container — nunca en document entero
      const input = container.querySelector(`.lote-ha-input[data-lote-id="${cb.value}"]`);
      const haMax = parseFloat(cb.dataset.hectareas || 0);
      let ha = input ? parseFloat(input.value) : NaN;

      // Si el valor es inválido, vacío o mayor al máximo → usar el máximo del lote
      if (isNaN(ha) || ha <= 0) ha = haMax;
      if (haMax > 0 && ha > haMax) ha = haMax;

      return {
        loteId: cb.value,
        // null = usar 100% del lote (sin hectáreas parciales)
        hectareasAplicadas: (ha > 0 && ha !== haMax) ? ha : null
      };
    });
}