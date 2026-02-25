// www/js/views/empresas.view.js
import {
  listarEmpresas,
  guardarEmpresa,
  eliminarEmpresa,
  setEmpresaActiva
} from '../services/empresas.service.js';

const tbody = document.getElementById('empresas-body');
const modal = document.getElementById('empresa-modal');
const form = document.getElementById('empresa-form');

const idInput = document.getElementById('empresa-id');
const nombreInput = document.getElementById('empresa-nombre');
const rutInput = document.getElementById('empresa-rut');
const telefonoInput = document.getElementById('empresa-telefono');
const emailInput = document.getElementById('empresa-email');

/* =========================
   LISTAR EMPRESAS
========================= */
export async function cargarEmpresas() {
  const empresas = await listarEmpresas();
  tbody.innerHTML = '';

  if (empresas.length > 0) {
    // 👉 empresa activa por defecto
    setEmpresaActiva(empresas[0]);
  }

  empresas.forEach(e => {
    tbody.innerHTML += `
      <tr data-id="${e.id}">
        <td>${e.nombre}</td>
        <td>${e.rut || ''}</td>
        <td>${e.telefono || ''}</td>
        <td>${e.email || ''}</td>
        <td>
          <button data-edit="${e.id}">✏️</button>
          <button data-delete="${e.id}">🗑️</button>
        </td>
      </tr>
    `;
  });
}

/* =========================
   MODAL
========================= */
document
  .getElementById('view-empresas')
  .addEventListener('click', e => {

    // ➕ NUEVA EMPRESA
    if (e.target.id === 'btn-nueva-empresa') {
      form.reset();
      idInput.value = '';
      modal.classList.remove('hidden');
    }

    // ❌ CANCELAR MODAL
    if (e.target.id === 'btn-cancelar-empresa') {
      form.reset();
      idInput.value = '';
      modal.classList.add('hidden');
    }

  });


/* =========================
   GUARDAR
========================= */
form.onsubmit = async e => {
  e.preventDefault();

  await guardarEmpresa({
    id: idInput.value || null,
    nombre: nombreInput.value,
    rut: rutInput.value,
    telefono: telefonoInput.value,
    email: emailInput.value
  });

  modal.classList.add('hidden');
  cargarEmpresas();
};

/* =========================
   EDITAR / ELIMINAR / SELECCIONAR
========================= */
document
  .getElementById('view-empresas')
  .addEventListener('click', async e => {

    // EDITAR
    if (e.target.dataset.edit) {
      const tr = e.target.closest('tr').children;
      idInput.value = e.target.dataset.edit;
      nombreInput.value = tr[0].innerText;
      modal.classList.remove('hidden');
    }

    // ELIMINAR
    if (e.target.dataset.delete) {
      if (confirm('¿Eliminar empresa?')) {
        await eliminarEmpresa(e.target.dataset.delete);
        cargarEmpresas();
      }
    }

    // 👉 SELECCIONAR EMPRESA ACTIVA (click en fila)
    if (e.target.tagName === 'TD') {
      const tr = e.target.closest('tr');
      setEmpresaActiva({
        id: tr.dataset.id,
        nombre: tr.children[0].innerText
      });
    }
  });
