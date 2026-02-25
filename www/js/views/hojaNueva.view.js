import { listarEmpresas } from '../services/empresas.service.js';
import { listarSectores } from '../services/sectores.service.js';
import { listarTecnicos } from '../services/tecnicos.service.js';
import { listarTiposAplicacion } from '../services/tiposAplicacion.service.js';
import { listarCaudales } from '../services/caudales.service.js';
import { listarVariedades } from '../services/variedades.service.js';
import { listarLotesPorSector } from '../services/lotes.service.js';
import { crearHojaTrabajoCabecera } from '../services/hojas.service.js';

const MESES = [
  'ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
  'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'
];

let lotesDisponibles = []; // cache de lotes del sector actual
let inicializado = false;  // FIX #1: flag para registrar listeners solo una vez

export function initNuevaHojaView() {

  const empresaSelect  = document.getElementById('empresa-select');
  const sectorSelect   = document.getElementById('sector-select');
  const cultivoSelect  = document.getElementById('cultivo-select');
  const variedadSelect = document.getElementById('variedad-select');
  const form           = document.getElementById('form-hoja-trabajo');

  if (inicializado) return; // listeners ya registrados, no duplicar
  inicializado = true;

  // 1️⃣ EMPRESA → carga sectores
  empresaSelect.onchange = async () => {
    resetDesde('sector');
    if (!empresaSelect.value) return;
    const sectores = await listarSectores(empresaSelect.value);
    poblarSelect(sectorSelect, sectores, 'Seleccione sector');
    sectorSelect.disabled = false;
  };

  // 2️⃣ SECTOR → carga lotes
  sectorSelect.onchange = async () => {
    resetDesde('lotes');
    if (!sectorSelect.value) return;
    lotesDisponibles = await listarLotesPorSector(sectorSelect.value);
    renderLotes(lotesDisponibles);
  };

  // 3️⃣ LOTES — FIX #1: escuchar sobre el FORM, no sobre el container
  //    Así el listener sobrevive aunque resetDesde() reemplace el innerHTML del container
  form.addEventListener('change', (e) => {
    // Solo reaccionar a checkboxes de lotes
    if (!e.target.classList.contains('chk-lote') &&
        e.target.id !== 'chk-todos-lotes') return;

    resetDesde('cultivo');
    const cultivosUnicos = getCultivosDeLotesSeleccionados();
    if (cultivosUnicos.length === 0) return;

    poblarSelect(cultivoSelect, cultivosUnicos, 'Seleccione cultivo');
    cultivoSelect.disabled = false;
  });

  // 4️⃣ CULTIVO → carga variedades
  cultivoSelect.onchange = async () => {
    resetDesde('variedad');
    if (!cultivoSelect.value) return;
    const variedades = await listarVariedades(cultivoSelect.value);
    if (variedades.length > 0) {
      poblarSelect(variedadSelect, variedades, 'Sin variedad');
      variedadSelect.disabled = false;
    }
  };

  // 5️⃣ SUBMIT
  form.addEventListener('submit', async e => {
    e.preventDefault();

    const lotesSeleccionados = getLotesSeleccionados();
    if (lotesSeleccionados.length === 0) {
      alert('Seleccione al menos un lote');
      return;
    }

    const fechaInicio = document.getElementById('fecha-inicio').value;
    const fechaFin    = document.getElementById('fecha-fin').value;

    // FIX #3: validar que fecha fin no sea anterior a fecha inicio
    if (fechaFin < fechaInicio) {
      alert('La fecha de fin no puede ser anterior a la fecha de inicio');
      return;
    }

    // FIX #2: parsear número correctamente antes de guardar
    const cantidadHectareas = parseFloat(document.getElementById('cantidad-hectareas').value);
    if (!cantidadHectareas || cantidadHectareas <= 0) {
      alert('Ingrese una cantidad de hectáreas válida');
      return;
    }

    const mes = MESES[new Date(fechaInicio + 'T00:00:00').getMonth()];

    const btnSubmit = form.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.textContent = '⏳ Guardando...';

    try {
      const hojaId = await crearHojaTrabajoCabecera({
        empresa_id:          empresaSelect.value,
        sector_id:           sectorSelect.value,
        tecnico_id:          document.getElementById('tecnico-select').value,
        tipo_aplicacion_id:  document.getElementById('tipo-aplicacion-select').value,
        caudal_id:           document.getElementById('caudal-select').value,
        cultivo_id:          cultivoSelect.value,
        variedad_id:         variedadSelect.value || null,
        campana:             document.getElementById('campana-input').value,
        fecha_inicio:        fechaInicio,
        fecha_fin:           fechaFin,
        cantidad_hectareas:  cantidadHectareas,  // FIX #2: número, no string
        observaciones:       document.getElementById('observaciones').value || null,
        mes,
        lotes:               lotesSeleccionados
      });

      window.showView('hoja-detalle', hojaId);

    } catch (err) {
      alert('❌ ' + err.message);
      btnSubmit.disabled = false;
      btnSubmit.textContent = '📌 Crear hoja de trabajo';
    }
  });
}

/* =========================
   CARGA INICIAL
========================= */
export async function cargarNuevaHoja() {
  lotesDisponibles = [];

  // FIX #7: Resetear el form y todos los estados en cascada desde empresa
  document.getElementById('form-hoja-trabajo').reset();
  document.getElementById('campana-input').value = String(new Date().getFullYear());

  // Fecha actual en formato yyyy-mm-dd para los inputs
  const hoy = new Date();
  const fechaHoy = [
    hoy.getFullYear(),
    String(hoy.getMonth() + 1).padStart(2, '0'),
    String(hoy.getDate()).padStart(2, '0')
  ].join('-');

  document.getElementById('fecha-inicio').value = fechaHoy;
  document.getElementById('fecha-fin').value    = fechaHoy;

  // Restaurar texto del botón submit por si quedó en "Guardando..."
  const btnSubmit = document.querySelector('#form-hoja-trabajo button[type="submit"]');
  if (btnSubmit) {
    btnSubmit.disabled = false;
    btnSubmit.textContent = '📌 Crear hoja de trabajo';
  }

  // Cargar datos independientes en paralelo
  await Promise.all([
    listarEmpresas().then(data         => poblarSelect(document.getElementById('empresa-select'), data, 'Seleccione empresa')),
    listarTecnicos().then(data         => poblarSelect(document.getElementById('tecnico-select'), data, 'Seleccione técnico')),
    listarTiposAplicacion().then(data  => poblarSelect(document.getElementById('tipo-aplicacion-select'), data, 'Seleccione tipo')),
    listarCaudales().then(data         => poblarSelect(document.getElementById('caudal-select'), data, 'Seleccione caudal')),
  ]);

  // Resetear cascada desde sector hacia abajo
  resetDesde('sector');
}

/* =========================
   RESET EN CASCADA
========================= */
function resetDesde(desde) {
  const orden = ['sector', 'lotes', 'cultivo', 'variedad'];
  const idx = orden.indexOf(desde);

  if (idx <= orden.indexOf('sector')) {
    const s = document.getElementById('sector-select');
    s.innerHTML = '<option value="">Seleccione sector</option>';
    s.disabled = true;
  }

  if (idx <= orden.indexOf('lotes')) {
    document.getElementById('lotes-container').innerHTML =
      '<strong>🌿 Lotes</strong><p>Seleccione un sector para ver los lotes</p>';
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

/* =========================
   RENDER LOTES
========================= */
function renderLotes(lotes) {
  const container = document.getElementById('lotes-container');

  if (lotes.length === 0) {
    container.innerHTML = '<strong>🌿 Lotes</strong><p>No hay lotes en este sector</p>';
    return;
  }

  container.innerHTML = `
    <strong>🌿 Lotes (${lotes.length})</strong>

    <div style="position:relative; margin: 0.6rem 0 0.5rem;">
      <input type="text" id="lotes-buscar"
        placeholder="🔍 Buscar lote..."
        style="padding-left: 0.85rem; font-size:0.88rem;"
        autocomplete="off">
    </div>

    <label style="display:flex; gap:0.5rem; align-items:center; padding-bottom:0.5rem; border-bottom: 1px solid var(--border);">
      <input type="checkbox" id="chk-todos-lotes">
      <em style="font-size:0.85rem; color: var(--text-soft)">Seleccionar / deseleccionar todos</em>
    </label>

    <div id="lotes-lista">
      ${lotes.map(l => `
        <label style="display:flex; gap:0.5rem; align-items:center; margin-top:0.5rem">
          <input type="checkbox" class="chk-lote" value="${l.id}" 
            data-cultivo-id="${l.cultivo_id ?? ''}" 
            data-cultivo-nombre="${l.cultivo_nombre ?? ''}"
            data-nombre="${(l.nombre ?? '').toLowerCase()}"
            >
          <span>
            <strong style="font-size:0.88rem">${l.nombre}</strong>
            <span style="font-size:0.8rem; color:var(--text-muted)"> · ${l.hectareas ?? '-'} ha</span>
            ${l.cultivo_nombre ? `<span style="font-size:0.8rem; color:var(--text-soft)"> — ${l.cultivo_nombre}</span>` : ''}
            ${l.variedad_nombre ? `<span style="font-size:0.8rem; color:var(--text-muted)"> / ${l.variedad_nombre}</span>` : ''}
          </span>
        </label>
      `).join('')}
    </div>
  `;

  // Filtro en tiempo real
  document.getElementById('lotes-buscar').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    document.querySelectorAll('#lotes-lista .chk-lote').forEach(cb => {
      const label = cb.closest('label');
      label.style.display = (!q || cb.dataset.nombre.includes(q)) ? 'flex' : 'none';
    });
  });

  // Seleccionar todos (solo los visibles)
  document.getElementById('chk-todos-lotes').onchange = (e) => {
    document.querySelectorAll('#lotes-lista .chk-lote').forEach(cb => {
      const label = cb.closest('label');
      if (label.style.display !== 'none') {
        cb.checked = e.target.checked;
      }
    });
    // Disparar el evento change para recalcular cultivos
    document.getElementById('lotes-lista').dispatchEvent(new Event('change', { bubbles: true }));
  };
}

/* =========================
   HELPERS
========================= */
function poblarSelect(select, items, placeholder) {
  select.innerHTML = `<option value="">${placeholder}</option>`;
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = item.nombre;
    select.appendChild(opt);
  });
}

function getLotesSeleccionados() {
  return [...document.querySelectorAll('#lotes-container .chk-lote:checked')]
    .map(cb => cb.value);
}

function getCultivosDeLotesSeleccionados() {
  const checkeados = [...document.querySelectorAll('#lotes-container .chk-lote:checked')];
  const mapa = new Map();

  checkeados.forEach(cb => {
    const id = cb.dataset.cultivoId;
    const nombre = cb.dataset.cultivoNombre;
    if (id && !mapa.has(id)) {
      mapa.set(id, { id, nombre });
    }
  });

  return [...mapa.values()];
}