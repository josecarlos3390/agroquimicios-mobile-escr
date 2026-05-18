import { listarEmpresas, getEmpresaActiva } from '../../services/empresas.service.js';
import { listarSectores } from '../../services/sectores.service.js';
import { listarTecnicos } from '../../services/tecnicos.service.js';
import { listarTiposAplicacion } from '../../services/tiposAplicacion.service.js';
import { listarVariedades } from '../../services/variedades.service.js';
import { listarLotesPorSectores } from '../../services/lotes.service.js';
import { crearHojaTrabajoCabecera } from '../../services/hojas.service.js';

import { MESES } from '../../utils/fecha.js';

let todosLosSectores  = [];
let lotesDisponibles  = [];
let inicializado      = false;

export function initNuevaHojaView() {
  const empresaSelect  = document.getElementById('empresa-select');
  const cultivoSelect  = document.getElementById('cultivo-select');
  const variedadSelect = document.getElementById('variedad-select');
  const form           = document.getElementById('form-hoja-trabajo');

  if (inicializado) return;
  inicializado = true;

  // 1: EMPRESA -> carga sectores como checkboxes + técnicos y tipos de aplicación
  empresaSelect.onchange = async () => {
    resetDesde('sectores');
    if (!empresaSelect.value) return;
    const empresaId = empresaSelect.value;
    todosLosSectores = await listarSectores(empresaId);
    renderSectores(todosLosSectores);

    // Cargar técnicos y tipos de aplicación de esta empresa
    await Promise.all([
      listarTecnicos(empresaId).then(data        => poblarSelect(document.getElementById('tecnico-select'), data, 'Seleccione tecnico')),
      listarTiposAplicacion(empresaId).then(data => poblarSelect(document.getElementById('tipo-aplicacion-select'), data, 'Seleccione tipo')),
    ]);
  };

  // 2: SECTORES / LOTES / cambios de checkbox — delegado en el form
  form.addEventListener('change', async (e) => {

    if (e.target.classList.contains('chk-sector')) {
      resetDesde('lotes');
      const sectorIds = getSectoresSeleccionados();
      if (sectorIds.length === 0) return;
      lotesDisponibles = await listarLotesPorSectores(sectorIds);
      // Todos los lotes seleccionados por defecto
      renderLotes(lotesDisponibles, true);
      actualizarTodo();
      return;
    }

    if (e.target.classList.contains('chk-lote')) {
      actualizarTodo();
    }
  });

  // 3: CULTIVO -> carga variedades
  cultivoSelect.onchange = async () => {
    resetDesde('variedad');
    if (!cultivoSelect.value) return;
    const variedades = await listarVariedades(cultivoSelect.value);
    if (variedades.length > 0) {
      poblarSelect(variedadSelect, variedades, 'Sin variedad');
      variedadSelect.disabled = false;
    }
  };

  // 4: SUBMIT
  form.addEventListener('submit', async e => {
    e.preventDefault();

    const sectoresSeleccionados = getSectoresSeleccionados();
    if (sectoresSeleccionados.length === 0) {
      alert('Seleccione al menos un sector');
      return;
    }

    const lotesSeleccionados = getLotesSeleccionados();
    if (lotesSeleccionados.length === 0) {
      alert('Seleccione al menos un lote');
      return;
    }

    const fechaInicio = document.getElementById('fecha-inicio').value;
    const fechaFin    = document.getElementById('fecha-fin').value;

    if (fechaFin < fechaInicio) {
      alert('La fecha de fin no puede ser anterior a la fecha de inicio');
      return;
    }

    const cantidadHectareas = parseFloat(document.getElementById('cantidad-hectareas').value);
    if (!cantidadHectareas || cantidadHectareas <= 0) {
      alert('Ingrese una cantidad de hectareas valida');
      return;
    }

    const mes = MESES[new Date(fechaInicio + 'T00:00:00').getMonth()];

    const btnSubmit = form.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Guardando...';

    try {
      const hojaId = await crearHojaTrabajoCabecera({
        empresa_id:         empresaSelect.value,
        sectores:           sectoresSeleccionados,
        tecnico_id:         document.getElementById('tecnico-select').value,
        tipo_aplicacion_id: document.getElementById('tipo-aplicacion-select').value,
        caudal_descripcion: document.getElementById('caudal-input').value.toUpperCase() || null,
        cultivo_id:         cultivoSelect.value,
        variedad_id:        variedadSelect.value || null,
        campana:            document.getElementById('campana-input').value,
        fecha_inicio:       fechaInicio,
        fecha_fin:          fechaFin,
        cantidad_hectareas: cantidadHectareas,
        observaciones:      document.getElementById('observaciones').value || null,
        mes,
        lotes: lotesSeleccionados
      });

      window.showView('hoja-detalle', hojaId);

    } catch (err) {
      alert('Error: ' + err.message);
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Crear hoja de trabajo';
    }
  });
}

/* ========================= CARGA INICIAL ========================= */
export async function cargarNuevaHoja() {
  todosLosSectores = [];
  lotesDisponibles = [];

  document.getElementById('form-hoja-trabajo').reset();
  document.getElementById('campana-input').value = String(new Date().getFullYear());

  const hoy = new Date();
  const fechaHoy = [
    hoy.getFullYear(),
    String(hoy.getMonth() + 1).padStart(2, '0'),
    String(hoy.getDate()).padStart(2, '0')
  ].join('-');

  document.getElementById('fecha-inicio').value = fechaHoy;
  document.getElementById('fecha-fin').value    = fechaHoy;

  const btnSubmit = document.querySelector('#form-hoja-trabajo button[type="submit"]');
  if (btnSubmit) {
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Crear hoja de trabajo';
  }

  await Promise.all([
    (async () => {
      const activa = getEmpresaActiva();
      const sel = document.getElementById('empresa-select');
      if (activa) {
        // Mostrar solo la empresa activa — el usuario ya eligió la propiedad
        sel.innerHTML = `<option value="${activa.id}">${activa.nombre}</option>`;
        sel.value = activa.id;
        sel.dispatchEvent(new Event('change'));
      } else {
        const data = await listarEmpresas();
        poblarSelect(sel, data, 'Seleccione empresa');
      }
    })(),
  ]);

  resetDesde('sectores');
}

/* ========================= RESET EN CASCADA ========================= */
function resetDesde(desde) {
  const orden = ['sectores', 'lotes', 'cultivo', 'variedad'];
  const idx   = orden.indexOf(desde);

  if (idx <= orden.indexOf('sectores')) {
    document.getElementById('sectores-container').innerHTML =
      '<strong>Sectores</strong><p>Seleccione una empresa para ver los sectores</p>';
  }

  if (idx <= orden.indexOf('lotes')) {
    document.getElementById('lotes-container').innerHTML =
      '<strong>Lotes</strong><p>Seleccione al menos un sector para ver los lotes</p>';
  }

  if (idx <= orden.indexOf('cultivo')) {
    const c = document.getElementById('cultivo-select');
    c.innerHTML = '<option value="">Seleccione cultivo</option>';
    c.disabled = true;
  }

  if (idx <= orden.indexOf('variedad')) {
    const v = document.getElementById('variedad-select');
    v.innerHTML = '<option value="">Sin variedad</option>';
    v.disabled = true;
  }
}

/* ========================= RENDER SECTORES (chips opción C) ========================= */
function renderSectores(sectores) {
  const container = document.getElementById('sectores-container');

  if (sectores.length === 0) {
    container.innerHTML = '<strong>🗺️ Sectores</strong><p>No hay sectores en esta empresa</p>';
    return;
  }

  container.innerHTML = `
    <strong>🗺️ Sectores</strong>
    <div class="chip-row" id="sectores-lista">
      ${sectores.map(s => `
        <label class="sector-chip" data-sector-id="${s.id}">
          <input type="checkbox" class="chk-sector" value="${s.id}">
          <svg class="chip-leaf" viewBox="0 0 14 14" fill="none">
            <path class="chip-leaf-bg" d="M7 1C4 1 2 4 2 7s2 6 5 6 5-3 5-6-2-6-5-6z"/>
            <path class="chip-leaf-vein" d="M7 3v8M4 6c1-1 2-1 3 0s2 1 3 0" stroke-width="0.8" stroke-linecap="round"/>
          </svg>
          <span class="chip-nombre">${s.nombre}</span>
          ${s.hectareas ? `<span class="chip-ha">${s.hectareas} ha</span>` : ''}
        </label>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('.sector-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      requestAnimationFrame(() => {
        const cb = chip.querySelector('.chk-sector');
        chip.classList.toggle('activo', cb.checked);
      });
    });
  });
}

/* ========================= RENDER LOTES (acordeón por sector) ========================= */
function renderLotes(lotes, todosSeleccionados = false) {
  const container = document.getElementById('lotes-container');

  if (lotes.length === 0) {
    container.innerHTML = '<strong>🌿 Lotes</strong><p>No hay lotes en los sectores seleccionados</p>';
    return;
  }

  const porSector = new Map();
  lotes.forEach(l => {
    if (!porSector.has(l.sector_id)) {
      porSector.set(l.sector_id, { nombre: l.sector_nombre, lotes: [], haTotal: 0 });
    }
    const g = porSector.get(l.sector_id);
    g.lotes.push(l);
    g.haTotal += parseFloat(l.hectareas ?? 0);
  });

  const totalLotes = lotes.length;

  const acordeonesHTML = [...porSector.entries()].map(([sId, grupo]) => `
    <div class="sector-acordeon" data-sector-id="${sId}">
      <div class="sector-acordeon-header">
        <div class="sector-acordeon-titulo">
          <span>🗺️ ${grupo.nombre}</span>
          <span class="sector-acordeon-meta sector-ha-meta" data-sector-id="${sId}">
            ${grupo.lotes.length} lote${grupo.lotes.length !== 1 ? 's' : ''}
            · <span class="sector-ha-valor">${fmtHa(grupo.haTotal)}</span> ha selec.
          </span>
        </div>
        <div class="sector-acordeon-acciones">
          <button type="button" class="sector-acordeon-todos todos-activo" data-sector-id="${sId}">
            ☑ Todos
          </button>
          <span class="sector-acordeon-chevron">▼</span>
        </div>
      </div>
      <div class="sector-acordeon-body">
        ${grupo.lotes.map(l => `
          <label class="lote-label">
            <input type="checkbox" class="chk-lote" value="${l.id}"
              data-sector-id="${sId}"
              data-hectareas="${l.hectareas ?? 0}"
              data-cultivo-id="${l.cultivo_id ?? ''}"
              data-cultivo-nombre="${l.cultivo_nombre ?? ''}"
              data-nombre="${(l.nombre ?? '').toLowerCase()}"
              checked>
            <span class="lote-label-info">
              <span class="lote-nombre">${l.nombre}</span>
              <span class="lote-meta">
                ${l.hectareas ?? '-'} ha
                ${l.cultivo_nombre ? ` · ${l.cultivo_nombre}` : ''}
                ${l.variedad_nombre ? ` / ${l.variedad_nombre}` : ''}
              </span>
            </span>
          </label>
        `).join('')}
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <strong>🌿 Lotes (${totalLotes})</strong>
    <input type="text" id="lotes-buscar"
      placeholder="🔍 Buscar lote..."
      style="margin: 0.5rem 0 0.25rem; font-size:0.88rem;"
      autocomplete="off">
    ${acordeonesHTML}
  `;

  // Abrir/cerrar acordeón
  container.querySelectorAll('.sector-acordeon-header').forEach(header => {
    header.addEventListener('click', (e) => {
      if (e.target.closest('.sector-acordeon-todos')) return;
      header.closest('.sector-acordeon').classList.toggle('abierto');
    });
  });

  // Botón "Todos" — toggle selección + sincronizar todo
  container.querySelectorAll('.sector-acordeon-todos').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sId      = btn.dataset.sectorId;
      const lotesCbs = [...container.querySelectorAll(`.chk-lote[data-sector-id="${sId}"]`)]
        .filter(cb => cb.closest('.lote-label').style.display !== 'none');
      const todosOn  = lotesCbs.every(cb => cb.checked);
      lotesCbs.forEach(cb => cb.checked = !todosOn);
      actualizarTodo();
    });
  });

  // Checkbox individual → ya lo maneja el listener del form (actualizarTodo)
  // pero también necesitamos reaccionar al filtro de búsqueda

  // Filtro en tiempo real
  document.getElementById('lotes-buscar').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    container.querySelectorAll('.sector-acordeon').forEach(acordeon => {
      let hayCoincidencia = false;
      acordeon.querySelectorAll('.chk-lote').forEach(cb => {
        const label   = cb.closest('.lote-label');
        const visible = !q || cb.dataset.nombre.includes(q);
        label.style.display = visible ? 'flex' : 'none';
        if (visible) hayCoincidencia = true;
      });
      acordeon.classList.toggle('abierto', q.length > 0 && hayCoincidencia);
    });
    // Re-sincronizar botones "Todos" según visibles
    sincronizarTodosBotones();
  });
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

/* Formatea hectáreas: sin decimales si es entero, 2 decimales si no */
function fmtHa(ha) {
  if (!ha || isNaN(ha)) return '0';
  return ha % 1 === 0 ? ha.toString() : parseFloat(ha.toFixed(2)).toString();
}

/* Actualiza chips, agrupadores, campo hectáreas, cultivos — todo de una vez */
function actualizarTodo() {
  const container = document.getElementById('lotes-container');
  if (!container) return;

  // Recalcular ha seleccionadas por sector
  const haPorSector = new Map();
  container.querySelectorAll('.chk-lote').forEach(cb => {
    const sId = cb.dataset.sectorId;
    if (!haPorSector.has(sId)) haPorSector.set(sId, 0);
    if (cb.checked) {
      haPorSector.set(sId, haPorSector.get(sId) + parseFloat(cb.dataset.hectareas || 0));
    }
  });

  // Actualizar ha en el agrupador (meta del acordeón)
  haPorSector.forEach((ha, sId) => {
    const meta = container.querySelector(`.sector-ha-meta[data-sector-id="${sId}"] .sector-ha-valor`);
    if (meta) meta.textContent = fmtHa(ha);
  });

  // Actualizar chip de cada sector con ha seleccionadas
  haPorSector.forEach((ha, sId) => {
    const chip = document.querySelector(`#sectores-lista .sector-chip[data-sector-id="${sId}"]`);
    if (!chip) return;
    let haSpan = chip.querySelector('.chip-ha');
    if (!haSpan) {
      haSpan = document.createElement('span');
      haSpan.className = 'chip-ha';
      chip.appendChild(haSpan);
    }
    haSpan.textContent = ha > 0 ? `${fmtHa(ha)} ha` : '';
  });

  // Sincronizar botones "Todos"
  sincronizarTodosBotones();

  // Actualizar campo Hectáreas con la suma total
  actualizarHectareasSugeridas();

  // Actualizar cultivos
  const cultivoSelect  = document.getElementById('cultivo-select');
  const variedadSelect = document.getElementById('variedad-select');
  const cultivosUnicos = getCultivosDeLotesSeleccionados();
  if (cultivosUnicos.length === 0) {
    cultivoSelect.innerHTML = '<option value="">Seleccione cultivo</option>';
    cultivoSelect.disabled = true;
    variedadSelect.innerHTML = '<option value="">Sin variedad</option>';
    variedadSelect.disabled = true;
  } else {
    poblarSelect(cultivoSelect, cultivosUnicos, 'Seleccione cultivo');
    cultivoSelect.disabled = false;
  }
}

/* Resalta/apaga el botón "Todos" según si todos los lotes visibles están marcados */
function sincronizarTodosBotones() {
  const container = document.getElementById('lotes-container');
  if (!container) return;
  container.querySelectorAll('.sector-acordeon-todos').forEach(btn => {
    const sId     = btn.dataset.sectorId;
    const visibles = [...container.querySelectorAll(`.chk-lote[data-sector-id="${sId}"]`)]
      .filter(cb => cb.closest('.lote-label').style.display !== 'none');
    const todosOn = visibles.length > 0 && visibles.every(cb => cb.checked);
    btn.classList.toggle('todos-activo', todosOn);
  });
}

function getSectoresSeleccionados() {
  return [...document.querySelectorAll('#sectores-container .chk-sector:checked')]
    .map(cb => cb.value);
}

function getLotesSeleccionados() {
  return [...document.querySelectorAll('#lotes-container .chk-lote:checked')]
    .map(cb => cb.value);
}

function getCultivosDeLotesSeleccionados() {
  const mapa = new Map();
  document.querySelectorAll('#lotes-container .chk-lote:checked').forEach(cb => {
    const id     = cb.dataset.cultivoId;
    const nombre = cb.dataset.cultivoNombre;
    if (id && !mapa.has(id)) mapa.set(id, { id, nombre });
  });
  return [...mapa.values()];
}

/* Suma las hectáreas de los lotes seleccionados y actualiza el campo */
function actualizarHectareasSugeridas() {
  const total = [...document.querySelectorAll('#lotes-container .chk-lote:checked')]
    .reduce((sum, cb) => sum + parseFloat(cb.dataset.hectareas || 0), 0);
  const campo = document.getElementById('cantidad-hectareas');
  if (campo) campo.value = total > 0 ? fmtHa(total) : '';
}