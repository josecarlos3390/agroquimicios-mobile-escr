import { listarCultivos } from '../services/cultivos.service.js';
import {
  listarVariedades,
  guardarVariedad,
  borrarVariedad
} from '../services/variedades.service.js';

let cultivoSeleccionado = null;
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
  await cargarCultivos();
  limpiarTabla();
}

/* =========================
   CULTIVOS
========================= */

async function cargarCultivos() {
  const select = document.getElementById('selectCultivoVariedades');
  const cultivos = await listarCultivos();

  select.innerHTML = '<option value="">Seleccione cultivo</option>';

  cultivos.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.nombre;
    select.appendChild(opt);
  });
}

/* =========================
   VARIEDADES
========================= */

async function cargarVariedades() {
  const variedades = await listarVariedades(cultivoSeleccionado);

  if (!Array.isArray(variedades)) {
    console.error('❌ Variedades no es array:', variedades);
    return;
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
  const selectCultivo = document.getElementById('selectCultivoVariedades');
  const btnNueva = document.getElementById('btnNuevaVariedad');

  selectCultivo.onchange = e => {
    cultivoSeleccionado = e.target.value || null;
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
  if (!confirm('¿Eliminar variedad?')) return;
  await borrarVariedad(id);
  cargarVariedades();
}
