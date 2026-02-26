// views/caudales.view.js
import {
  listarCaudales,
  guardarCaudal,
  eliminarCaudal
} from '../services/caudales.service.js';
import { confirmar } from '../utils/confirm.js';

let inicializado = false;

export function initCaudalesView() {
  if (inicializado) return;
  inicializado = true;

  const view   = document.getElementById('view-caudales');
  const modal  = document.getElementById('caudal-modal');
  const form   = document.getElementById('caudal-form');

  const idInput     = document.getElementById('caudal-id');
  const nombreInput = document.getElementById('caudal-nombre');
  const valorInput  = document.getElementById('caudal-valor');
  const unidadInput = document.getElementById('caudal-unidad');

  document.getElementById('btn-nuevo-caudal')
    .addEventListener('click', () => {
      form.reset();
      idInput.value = '';
      modal.classList.remove('hidden');
    });

  document.getElementById('btn-cancelar-caudal')
    .addEventListener('click', () => {
      modal.classList.add('hidden');
    });

  form.addEventListener('submit', async e => {
    e.preventDefault();

    await guardarCaudal({
      id:     idInput.value || null,
      nombre: nombreInput.value.trim(),
      valor:  valorInput.value  ? parseFloat(valorInput.value)  : null,
      unidad: unidadInput.value ? unidadInput.value.trim() : null,
    });

    modal.classList.add('hidden');
    cargarCaudales();
  });

  view.addEventListener('click', async e => {
    if (e.target.dataset.edit) {
      const tr = e.target.closest('tr').children;

      idInput.value     = e.target.dataset.edit;
      nombreInput.value = tr[0].innerText;
      valorInput.value  = tr[1].innerText;
      unidadInput.value = tr[2].innerText;

      modal.classList.remove('hidden');
    }

    if (e.target.dataset.delete) {
      const ok = await confirmar({ icon: '🗑️', titulo: '¿Eliminar caudal?', msg: 'Esta acción no se puede deshacer.' });
      if (ok) {
        await eliminarCaudal(e.target.dataset.delete);
        cargarCaudales();
      }
    }
  });
}

export async function cargarCaudales() {
  const tbody   = document.getElementById('caudales-body');
  const caudales = await listarCaudales();

  tbody.innerHTML = '';

  caudales.forEach(c => {
    tbody.innerHTML += `
      <tr>
        <td>${c.nombre}</td>
        <td>${c.valor  ?? ''}</td>
        <td>${c.unidad ?? ''}</td>
        <td>
          <button data-edit="${c.id}">✏️</button>
          <button data-delete="${c.id}">🗑️</button>
        </td>
      </tr>
    `;
  });
}
