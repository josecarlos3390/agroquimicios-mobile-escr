import { getHojaCabById } from '../repositories/hojasCab.repo.js';
import { actualizarHojaCabecera } from '../services/hojas.service.js';
import { listarEmpresas } from '../services/empresas.service.js';
import { listarSectores } from '../services/sectores.service.js';
import { listarTecnicos } from '../services/tecnicos.service.js';
import { listarTiposAplicacion } from '../services/tiposAplicacion.service.js';
import { listarCaudales } from '../services/caudales.service.js';
import { listarCultivos } from '../services/cultivos.service.js';
import { listarVariedades } from '../services/variedades.service.js';
import { getLotesByHojaId, replaceLotesHoja } from '../repositories/hojasLotes.repo.js';
import { listarLotesPorSector } from '../services/lotes.service.js';

let hojaActual = null;
let _editarInicializado = false; // FIX #5: renombrado para claridad de propósito

const MESES = [
  'ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
  'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'
];

export function initHojaEditarView() {
  // FIX #5: solo registrar listeners una vez, pero hojaActual se actualiza en cargarHojaEditar
  if (_editarInicializado) return;
  _editarInicializado = true;

  const form         = document.getElementById('form-editar-hoja');
  const empresaSelect = document.getElementById('editar-empresa-select');
  const sectorSelect  = document.getElementById('editar-sector-select');
  const cultivoSelect = document.getElementById('editar-cultivo-select');
  const variedadSelect = document.getElementById('editar-variedad-select');

  // Empresa → carga sectores
  empresaSelect.onchange = async () => {
    // Reset sector
    sectorSelect.innerHTML = '<option value="">Seleccione sector</option>';
    sectorSelect.disabled = true;

    // Reset cultivo
    cultivoSelect.innerHTML = '<option value="">Seleccione cultivo</option>';
    cultivoSelect.value = '';

    // Reset variedad
    variedadSelect.innerHTML = '<option value="">Sin variedad</option>';
    variedadSelect.value = '';
    variedadSelect.disabled = true;

    if (!empresaSelect.value) return;

    const sectores = await listarSectores(empresaSelect.value);
    poblarSelect(sectorSelect, sectores, 'Seleccione sector');
    sectorSelect.disabled = false;
  };

  sectorSelect.onchange = async () => {
    cultivoSelect.innerHTML = '<option value="">Seleccione cultivo</option>';
    cultivoSelect.value = '';
    variedadSelect.innerHTML = '<option value="">Sin variedad</option>';
    variedadSelect.value = '';
    variedadSelect.disabled = true;

    if (!sectorSelect.value) {
      document.getElementById('editar-lotes-container').innerHTML =
        '<strong>🌿 Lotes</strong><p>Seleccione un sector para ver los lotes</p>';
      return;
    }

    const [cultivos, lotes] = await Promise.all([
      listarCultivos(),
      listarLotesPorSector(sectorSelect.value)
    ]);

    poblarSelect(cultivoSelect, cultivos, 'Seleccione cultivo');
    renderLotesEditar(lotes); // sin ids pre-seleccionados al cambiar sector
  };

  // Cultivo → carga variedades
  cultivoSelect.onchange = async () => {
    variedadSelect.innerHTML = '<option value="">Sin variedad</option>';
    variedadSelect.value = '';
    variedadSelect.disabled = true;

    if (!cultivoSelect.value) return;

    const variedades = await listarVariedades(cultivoSelect.value);
    if (variedades.length > 0) {
      poblarSelect(variedadSelect, variedades, 'Sin variedad');
      variedadSelect.disabled = false;
    }
  };

  // Fecha inicio → recalcula mes
  document.getElementById('editar-fecha-inicio').onchange = (e) => {
    if (!e.target.value) return;
    const mes = MESES[new Date(e.target.value + 'T00:00:00').getMonth()];
    document.getElementById('editar-mes').textContent = mes;
  };

  // Volver
  document.getElementById('btn-editar-hoja-volver').onclick = () => {
    window.showView('hojas');
  };

  // Submit
  form.addEventListener('submit', async e => {
    e.preventDefault();

    const lotesSeleccionados = [...document.querySelectorAll('#editar-lotes-container .editar-chk-lote:checked')]
      .map(cb => cb.value);

    if (lotesSeleccionados.length === 0) {
      alert('Seleccione al menos un lote');
      return;
    }

    const fechaInicio = document.getElementById('editar-fecha-inicio').value;
    const fechaFin    = document.getElementById('editar-fecha-fin').value;

    // FIX #3: validar que fecha fin no sea anterior a fecha inicio
    if (fechaFin < fechaInicio) {
      alert('La fecha de fin no puede ser anterior a la fecha de inicio');
      return;
    }

    // FIX #2: parsear correctamente
    const cantidadHectareas = parseFloat(document.getElementById('editar-cantidad-hectareas').value);
    if (!cantidadHectareas || cantidadHectareas <= 0) {
      alert('Ingrese una cantidad de hectáreas válida');
      return;
    }

    const mes = MESES[new Date(fechaInicio + 'T00:00:00').getMonth()];

    const btnSubmit = form.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.textContent = '⏳ Guardando...';

    try {
      await actualizarHojaCabecera(hojaActual.id, {
        empresa_id:         empresaSelect.value,
        sector_id:          sectorSelect.value,
        tecnico_id:         document.getElementById('editar-tecnico-select').value,
        tipo_aplicacion_id: document.getElementById('editar-tipo-aplicacion-select').value,
        caudal_id:          document.getElementById('editar-caudal-select').value,
        cultivo_id:         cultivoSelect.value,
        campana:            document.getElementById('editar-campana-input').value.toUpperCase(),
        fecha_inicio:       fechaInicio,
        fecha_fin:          fechaFin,
        cantidad_hectareas: cantidadHectareas,  // FIX #2: número, no string
        observaciones:      document.getElementById('editar-observaciones').value?.toUpperCase() || null,
        mes
      });

      // Reemplazar lotes asociados
      await replaceLotesHoja(hojaActual.id, lotesSeleccionados);

      window.showView('hojas');

    } catch (err) {
      alert('❌ ' + err.message);
      btnSubmit.disabled = false;
      btnSubmit.textContent = '💾 Guardar cambios';
    }
  });
}

export async function cargarHojaEditar(hojaId) {
  hojaActual = await getHojaCabById(hojaId);

  if (!hojaActual) {
    alert('Hoja no encontrada');
    window.showView('hojas');
    return;
  }

  // Mostrar número
  document.getElementById('editar-hoja-numero').textContent = hojaActual.numero_completo;
  document.getElementById('editar-mes').textContent = hojaActual.mes;

  // Cargar todos los selects en paralelo
  const [empresas, tecnicos, tiposAplicacion, caudales, cultivos] = await Promise.all([
    listarEmpresas(),
    listarTecnicos(),
    listarTiposAplicacion(),
    listarCaudales(),
    listarCultivos()
  ]);

  poblarSelect(document.getElementById('editar-empresa-select'), empresas, 'Seleccione empresa');
  poblarSelect(document.getElementById('editar-tecnico-select'), tecnicos, 'Seleccione técnico');
  poblarSelect(document.getElementById('editar-tipo-aplicacion-select'), tiposAplicacion, 'Seleccione tipo');
  poblarSelect(document.getElementById('editar-caudal-select'), caudales, 'Seleccione caudal');
  poblarSelect(document.getElementById('editar-cultivo-select'), cultivos, 'Seleccione cultivo');

  // Setear valores actuales
  document.getElementById('editar-empresa-select').value       = hojaActual.empresa_id;
  document.getElementById('editar-tecnico-select').value       = hojaActual.tecnico_id;
  document.getElementById('editar-tipo-aplicacion-select').value = hojaActual.tipo_aplicacion_id;
  document.getElementById('editar-caudal-select').value        = hojaActual.caudal_id;
  document.getElementById('editar-cultivo-select').value       = hojaActual.cultivo_id;
  document.getElementById('editar-campana-input').value        = hojaActual.campana;
  document.getElementById('editar-fecha-inicio').value         = hojaActual.fecha_inicio;
  document.getElementById('editar-fecha-fin').value            = hojaActual.fecha_fin;
  document.getElementById('editar-cantidad-hectareas').value   = hojaActual.cantidad_hectareas;
  document.getElementById('editar-observaciones').value        = hojaActual.observaciones ?? '';

  // Cargar sectores de la empresa actual
  const sectores = await listarSectores(hojaActual.empresa_id);
  poblarSelect(document.getElementById('editar-sector-select'), sectores, 'Seleccione sector');
  document.getElementById('editar-sector-select').value  = hojaActual.sector_id;
  document.getElementById('editar-sector-select').disabled = false;

  // Cargar y renderizar lotes del sector, marcando los ya asociados
  const [lotesDelSector, lotesDeHoja] = await Promise.all([
    listarLotesPorSector(hojaActual.sector_id),
    getLotesByHojaId(hojaActual.id)
  ]);

  const idsAsociados = new Set(lotesDeHoja.map(l => String(l.id)));
  renderLotesEditar(lotesDelSector, idsAsociados);

  // Cargar variedades del cultivo actual
  const variedades = await listarVariedades(hojaActual.cultivo_id);
  const variedadSelect = document.getElementById('editar-variedad-select');
  if (variedades.length > 0) {
    poblarSelect(variedadSelect, variedades, 'Sin variedad');
    variedadSelect.disabled = false;
  }
}

function poblarSelect(select, items, placeholder) {
  select.innerHTML = `<option value="">${placeholder}</option>`;
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = item.nombre;
    select.appendChild(opt);
  });
}

function renderLotesEditar(lotes, idsSeleccionados = new Set()) {
  const container = document.getElementById('editar-lotes-container');

  if (!lotes || lotes.length === 0) {
    container.innerHTML = '<strong>🌿 Lotes</strong><p>No hay lotes en este sector</p>';
    return;
  }

  container.innerHTML = `
    <strong>🌿 Lotes</strong>

    <label style="display:flex; gap:0.5rem; align-items:center; margin-top:0.5rem; padding-bottom:0.5rem; border-bottom: 1px solid var(--border);">
      <input type="checkbox" id="editar-chk-todos-lotes">
      <em style="font-size:0.85rem; color: var(--text-soft)">Seleccionar / deseleccionar todos</em>
    </label>

    ${lotes.map(l => `
      <label style="display:flex; gap:0.5rem; align-items:center; margin-top:0.5rem">
        <input type="checkbox" class="editar-chk-lote" value="${l.id}"
          ${idsSeleccionados.has(String(l.id)) ? 'checked' : ''}>
        ${l.nombre} (${l.hectareas ?? '-'} ha)
        ${l.cultivo_nombre ? `— ${l.cultivo_nombre}` : ''}
        ${l.variedad_nombre ? `/ ${l.variedad_nombre}` : ''}
      </label>
    `).join('')}
  `;

  document.getElementById('editar-chk-todos-lotes').onchange = (e) => {
    document.querySelectorAll('#editar-lotes-container .editar-chk-lote')
      .forEach(cb => cb.checked = e.target.checked);
  };
}