// views/tecnicos.view.js
import {
  listarTecnicos,
  guardarTecnico,
  eliminarTecnico
} from '../services/tecnicos.service.js';

let inicializado = false;

export function initTecnicosView() {
  if (inicializado) return;
  inicializado = true;

  const view = document.getElementById('view-tecnicos');
  const modal = document.getElementById('tecnico-modal');
  const form = document.getElementById('tecnico-form');

  const idInput = document.getElementById('tecnico-id');
  const nombreInput = document.getElementById('tecnico-nombre');

  document.getElementById('btn-nuevo-tecnico')
    .addEventListener('click', () => {
      form.reset();
      idInput.value = '';
      modal.classList.remove('hidden');
    });

  document.getElementById('btn-cancelar-tecnico')
    .addEventListener('click', () => {
      modal.classList.add('hidden');
    });

  form.addEventListener('submit', async e => {
    e.preventDefault();

    await guardarTecnico({
      id: idInput.value || null,
      nombre: nombreInput.value,
    });

    modal.classList.add('hidden');
    cargarTecnicos();
  });

  view.addEventListener('click', async e => {
    if (e.target.dataset.edit) {
      const tr = e.target.closest('tr').children;

      idInput.value = e.target.dataset.edit;
      nombreInput.value = tr[0].innerText;

      modal.classList.remove('hidden');
    }

    if (e.target.dataset.delete) {
      if (confirm('¿Eliminar técnico?')) {
        await eliminarTecnico(e.target.dataset.delete);
        cargarTecnicos();
      }
    }
  });
}

export async function cargarTecnicos() {
  const tbody = document.getElementById('tecnicos-body');
  const tecnicos = await listarTecnicos();

  tbody.innerHTML = '';

  tecnicos.forEach(t => {
    tbody.innerHTML += `
      <tr>
        <td>${t.nombre}</td>
        <td>
          <button data-edit="${t.id}">✏️</button>
          <button data-delete="${t.id}">🗑️</button>
        </td>
      </tr>
    `;
  });
}
