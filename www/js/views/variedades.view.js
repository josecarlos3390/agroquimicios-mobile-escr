import { listarCultivos } from '../services/cultivos.service.js';
import { listarEmpresas, getEmpresaActiva } from '../services/empresas.service.js';
import {
  listarVariedades,
  guardarVariedad,
  borrarVariedad
} from '../services/variedades.service.js';
import { confirmar } from '../utils/confirm.js';

let cultivoSeleccionado = null;
let empresaSeleccionada = null;
let variedadEditando = null;
let inicializado = false;

/* =========================
   INIT
========================= */

export function initVariedadesView() {
  if (inicializado) return;
  inicializado = true;

  registrarEventos();
}

/* =========================
   CARGA VISTA
========================= */

export async function cargarVistaVariedades() {
  cultivoSeleccionado = null;
  document.getElementById('btnNuevaVariedad').disabled = true;
  limpiarTabla();
  await cargarEmpresas();
}

/* =========================
   EMPRESAS
========================= */

async function cargarEmpresas() {
  const select = document.getElementById('selectEmpresaVariedades');
  const activa = getEmpresaActiva();

  if (activa) {
    empresaSeleccionada = Number(activa.id);
    select.innerHTML = `<option value="${activa.id}">${activa.nombre}</option>`;
    select.value = activa.id;
    select.disabled = true;
  } else {
    const empresas = await listarEmpresas();
    select.innerHTML = '<option value="">Seleccione empresa</option>';
    empresas.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.id;
      opt.textContent = e.nombre;
      select.appendChild(opt);
    });
    if (!empresaSeleccionada && empresas.length > 0) {
      empresaSeleccionada = Number(empresas[0].id);
      select.value = empresaSeleccionada;
    }
  }

  await cargarCultivos();
}

/* =========================
   CULTIVOS
========================= */

async function cargarCultivos() {
  const select = document.getElementById('selectCultivoVariedades');
  cultivoSeleccionado = null;
  document.getElementById('btnNuevaVariedad').disabled = true;
  limpiarTabla();

  if (!empresaSeleccionada) {
    select.innerHTML = '<option value="">Seleccione cultivo</option>';
    return;
  }

  const cultivos = await listarCultivos(empresaSeleccionada);

  select.innerHTML = '<option value="">Seleccione cultivo</option>';

  cultivos.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.nombre;
    select.appendChild(opt);
  });

  if (cultivos.length > 0) {
    cultivoSeleccionado = Number(cultivos[0].id);
    select.value = cultivoSeleccionado;
    document.getElementById('btnNuevaVariedad').disabled = false;
    await cargarVariedades();
  }
}

/* =========================
   VARIEDADES
========================= */

async function cargarVariedades() {
  console.log('[VAR] cargarVariedades → cultivo_id:', cultivoSeleccionado, '| tipo:', typeof cultivoSeleccionado);

  const variedades = await listarVariedades(cultivoSeleccionado);

  console.log('[VAR] Resultado:', variedades);

  if (!Array.isArray(variedades)) {
    console.error('[VAR] ❌ No es array:', variedades);
    return;
  }

  // Si viene vacío, log simple
  if (variedades.length === 0) {
    console.warn('[VAR] ⚠️ 0 resultados para cultivo_id=' + cultivoSeleccionado);
  }

  const tbody = document.getElementById('tablaVariedades');
  tbody.innerHTML = '';

  variedades.forEach(v => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${v.nombre}</td>
      <td>
        <button class="editar">✏️</button>
        <button class="eliminar">🗑️</button>
      </td>
    `;
    tr.querySelector('.editar').onclick = () => editarVariedad(v);
    tr.querySelector('.eliminar').onclick = () => eliminar(v.id);
    tbody.appendChild(tr);
  });
}

function limpiarTabla() {
  document.getElementById('tablaVariedades').innerHTML = '';
}

/* =========================
   EVENTOS
========================= */

function registrarEventos() {
  const selectEmpresa = document.getElementById('selectEmpresaVariedades');
  const selectCultivo = document.getElementById('selectCultivoVariedades');
  const btnNueva = document.getElementById('btnNuevaVariedad');

  selectEmpresa.onchange = async e => {
    empresaSeleccionada = e.target.value ? Number(e.target.value) : null;
    await cargarCultivos();
  };

  selectCultivo.onchange = e => {
    cultivoSeleccionado = e.target.value ? Number(e.target.value) : null;
    btnNueva.disabled = !cultivoSeleccionado;
    limpiarTabla();
    if (cultivoSeleccionado) cargarVariedades();
  };

  btnNueva.onclick = () => abrirModal();

  document.getElementById('btnCancelarVariedad').onclick = cerrarModal;
  document.getElementById('btnGuardarVariedad').onclick = guardarDesdeModal;
}

/* =========================
   MODAL
========================= */

function abrirModal(variedad = null) {
  variedadEditando = variedad;
  document.getElementById('modalVariedad').classList.remove('hidden');

  document.getElementById('tituloModalVariedad').textContent =
    variedad ? '✏️ Editar Variedad' : '➕ Nueva Variedad';

  document.getElementById('variedadNombre').value = variedad?.nombre || '';
}

function cerrarModal() {
  document.getElementById('modalVariedad').classList.add('hidden');
  variedadEditando = null;
}

async function guardarDesdeModal() {
  const nombre = document.getElementById('variedadNombre').value.trim();

  if (!nombre) {
    alert('El nombre es obligatorio');
    return;
  }

  await guardarVariedad({
    id: variedadEditando?.id,
    empresa_id: empresaSeleccionada,
    cultivo_id: cultivoSeleccionado,
    nombre
  });

  cerrarModal();
  cargarVariedades();
}

/* =========================
   CRUD
========================= */

function editarVariedad(variedad) {
  abrirModal(variedad);
}

async function eliminar(id) {
  const ok = await confirmar({ icon: '🗑️', titulo: '¿Eliminar variedad?', msg: 'Esta acción no se puede deshacer.' });
  if (!ok) return;
  await borrarVariedad(id);
  cargarVariedades();
}
