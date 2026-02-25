// cultivos.view.js
import {
  listarCultivos,
  guardarCultivo,
  eliminarCultivo
} from '../services/cultivos.service.js';

let inicializado = false;

export function initCultivosView() {
  if (inicializado) return;
  inicializado = true;

  const modal = document.getElementById('cultivo-modal');
  const form = document.getElementById('cultivo-form');

  const idInput = document.getElementById('cultivo-id');
  const nombreInput = document.getElementById('cultivo-nombre');

  document.getElementById('btn-nueva-cultivo')
    .addEventListener('click', () => {
      form.reset();
      idInput.value = '';
      modal.classList.remove('hidden');
    });

  document.getElementById('btn-cancelar-cultivo')
    .addEventListener('click', () => {
      modal.classList.add('hidden');
    });

  form.addEventListener('submit', async e => {
    e.preventDefault();

    await guardarCultivo({
      id: idInput.value || null,
      nombre: nombreInput.value
    });

    modal.classList.add('hidden');
    cargarCultivos();
  });

  // 🔥 OJO: escuchamos SOLO dentro de la vista
  document
    .getElementById('view-cultivos')
    .addEventListener('click', async e => {

      if (e.target.dataset.edit) {
        const tr = e.target.closest('tr').children;
        idInput.value = e.target.dataset.edit;
        nombreInput.value = tr[0].innerText;
        modal.classList.remove('hidden');
      }

      if (e.target.dataset.delete) {
        if (confirm('¿Eliminar cultivo?')) {
          await eliminarCultivo(e.target.dataset.delete);
          cargarCultivos();
        }
      }
    });
}

export async function cargarCultivos() {
  const tbody = document.getElementById('cultivos-body');
  const cultivos = await listarCultivos();

  tbody.innerHTML = '';

  cultivos.forEach(c => {
    tbody.innerHTML += `
      <tr>
        <td>${c.nombre}</td>
        <td>
          <button data-edit="${c.id}">✏️</button>
          <button data-delete="${c.id}">🗑️</button>
        </td>
      </tr>
    `;
  });
}
