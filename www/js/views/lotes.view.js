import {
  listarLotesPorSector,
  guardarLote,
  eliminarLote
} from '../services/lotes.service.js';
import { confirmar } from '../utils/confirm.js';

import { listarEmpresas, getEmpresaActiva } from '../services/empresas.service.js';
import { listarSectores } from '../services/sectores.service.js';
import { listarCultivos } from '../services/cultivos.service.js';
import { listarVariedades } from '../services/variedades.service.js';

let empresaSeleccionada = null;
let sectorSeleccionado  = null;
let loteEditando        = null;
let inicializado        = false;

/* =========================
   INIT
========================= */
export function initLotesView() {
  if (inicializado) return;
  inicializado = true;
  registrarEventos();
}

/* =========================
   CARGA DE VISTA
========================= */
export async function cargarVistaLotes() {
  empresaSeleccionada = null;
  sectorSeleccionado  = null;

  document.getElementById('btnNuevoLote').disabled = true;

  await cargarEmpresas();

  const selectSector = document.getElementById('selectSectorLotes');
  selectSector.innerHTML = '<option value="">Seleccione sector</option>';
  selectSector.disabled  = true;

  document.getElementById('tablaLotes').innerHTML = '';
}

/* =========================
   EMPRESAS / SECTORES
========================= */
async function cargarEmpresas() {
  const select = document.getElementById('selectEmpresaLotes');
  const activa = getEmpresaActiva();
  if (activa) {
    select.innerHTML = `<option value="${activa.id}">${activa.nombre}</option>`;
    select.value = activa.id;
    select.disabled = true;
    select.dispatchEvent(new Event('change'));
    return;
  }
  const empresas = await listarEmpresas();
  select.innerHTML = '<option value="">Seleccione empresa</option>';
  empresas.forEach(e => {
    const opt = document.createElement('option');
    opt.value = e.id;
    opt.textContent = e.nombre;
    select.appendChild(opt);
  });
}

async function cargarSectores() {
  const select   = document.getElementById('selectSectorLotes');
  const sectores = await listarSectores(empresaSeleccionada);

  select.innerHTML = '<option value="">Seleccione sector</option>';
  sectores.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.nombre;
    select.appendChild(opt);
  });

  select.disabled = false;
}

/* =========================
   LOTES
========================= */
async function cargarLotes() {
  if (!sectorSeleccionado) return;

  const lotes = await listarLotesPorSector(sectorSeleccionado);
  const tbody = document.getElementById('tablaLotes');
  tbody.innerHTML = '';

  if (lotes.length === 0) {
    tbody.innerHTML = `
      <tr><td>
        <div style="text-align:center; padding:1.5rem; color:var(--text-muted)">
          Sin lotes en este sector
        </div>
      </td></tr>
    `;
    return;
  }

  lotes.forEach(l => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="lote-card">
          <div class="lote-card-header">
            ${l.codigo ? `<span class="lote-codigo">#${l.codigo}</span>` : ''}
            <span class="lote-nombre">${l.nombre}</span>
            <div class="lote-acciones">
              <button class="editar">✏️</button>
              <button class="eliminar">🗑️</button>
            </div>
          </div>
          <div class="lote-card-body">
            <span>📐 ${l.hectareas ?? '—'} ha</span>
            <span>🌾 ${l.cultivo_nombre ?? '—'}</span>
            <span>🌱 ${l.variedad_nombre ?? '—'}</span>
            ${l.fecha_siembra ? `<span>📅 ${l.fecha_siembra}</span>` : ''}
          </div>
        </div>
      </td>
    `;

    tr.querySelector('.editar').onclick  = () => editarLote(l);
    tr.querySelector('.eliminar').onclick = () => borrarLote(l.id);

    tbody.appendChild(tr);
  });
}

/* =========================
   EVENTOS
========================= */
function registrarEventos() {
  const selectEmpresa = document.getElementById('selectEmpresaLotes');
  const selectSector  = document.getElementById('selectSectorLotes');
  const btnNuevo      = document.getElementById('btnNuevoLote');
  const selectCultivo = document.getElementById('loteCultivo');

  selectEmpresa.onchange = async e => {
    empresaSeleccionada = e.target.value || null;
    sectorSeleccionado  = null;
    btnNuevo.disabled   = true;

    selectSector.innerHTML = '<option value="">Seleccione sector</option>';
    selectSector.disabled  = true;
    document.getElementById('tablaLotes').innerHTML = '';

    if (empresaSeleccionada) await cargarSectores();
  };

  selectSector.onchange = e => {
    sectorSeleccionado    = e.target.value || null;
    btnNuevo.disabled     = !sectorSeleccionado;
    cargarLotes();
  };

  selectCultivo.onchange = async e => {
    await cargarVariedades(e.target.value || null, null);
  };

  btnNuevo.onclick = nuevoLote;

  document.getElementById('btnCancelarLote').onclick = cerrarModalLote;
  document.getElementById('btnGuardarLote').onclick  = guardarDesdeModal;
}

/* =========================
   CRUD
========================= */
function nuevoLote() {
  loteEditando = null;
  abrirModalLote();
}

function editarLote(lote) {
  loteEditando = lote;
  abrirModalLote(lote);
}

async function borrarLote(id) {
  const ok = await confirmar({ icon: '🗑️', titulo: '¿Eliminar lote?', msg: 'Esta acción no se puede deshacer.' });
  if (!ok) return;
  await eliminarLote(id);
  cargarLotes();
}

/* =========================
   MODAL
========================= */
async function abrirModalLote(lote = null) {
  const titulo = document.getElementById('tituloModalLote');
  titulo.textContent = lote ? '✏️ Editar lote' : '➕ Nuevo lote';

  document.getElementById('modalLote').classList.remove('hidden');

  document.getElementById('loteCodigo').value       = lote?.codigo       || '';
  document.getElementById('loteNombre').value       = lote?.nombre       || '';
  document.getElementById('loteHectareas').value    = lote?.hectareas    || '';
  document.getElementById('loteFechaSiembra').value = lote?.fecha_siembra || '';

  await cargarCultivos(lote?.cultivo_id || null);
  await cargarVariedades(lote?.cultivo_id || null, lote?.variedad_id || null);
}

function cerrarModalLote() {
  document.getElementById('modalLote').classList.add('hidden');
  loteEditando = null;
}

async function guardarDesdeModal() {
  const nombre = document.getElementById('loteNombre').value.trim().toUpperCase();

  if (!nombre) {
    alert('El nombre es obligatorio');
    return;
  }

  const data = {
    id:           loteEditando?.id,
    codigo:       document.getElementById('loteCodigo').value || null,
    sector_id:    sectorSeleccionado,
    nombre,
    hectareas:    document.getElementById('loteHectareas').value    || null,
    cultivo_id:   document.getElementById('loteCultivo').value      || null,
    variedad_id:  document.getElementById('loteVariedad').value     || null,
    fecha_siembra: document.getElementById('loteFechaSiembra').value || null
  };

  await guardarLote(data);
  cerrarModalLote();
  cargarLotes();
}

/* =========================
   CULTIVOS
========================= */
async function cargarCultivos(cultivoActual = null) {
  const select   = document.getElementById('loteCultivo');
  const cultivos = await listarCultivos();

  select.innerHTML = '<option value="">Seleccione cultivo</option>';
  cultivos.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.nombre;
    if (String(c.id) === String(cultivoActual)) opt.selected = true;
    select.appendChild(opt);
  });
}

/* =========================
   VARIEDADES
========================= */
async function cargarVariedades(cultivoId, variedadActual = null) {
  const select = document.getElementById('loteVariedad');

  select.innerHTML = '<option value="">Seleccione variedad</option>';
  select.disabled  = true;

  if (!cultivoId) return;

  const variedades = await listarVariedades(cultivoId);
  variedades.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.textContent = v.nombre;
    if (String(v.id) === String(variedadActual)) opt.selected = true;
    select.appendChild(opt);
  });

  select.disabled = false;
}