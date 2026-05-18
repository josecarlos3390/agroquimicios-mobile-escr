import {
  listarTiposProducto,
  crearTipoProducto,
  actualizarTipoProducto,
  eliminarTipoProducto
} from '../services/tiposProducto.service.js';
import { confirmar } from '../utils/confirm.js';

let inicializado = false;

export function initTiposProductoView() {
  if (inicializado) return;
  inicializado = true;

  const form = document.getElementById('tipo-producto-form');
  const modal = document.getElementById('tipo-producto-modal');
  const idInput = document.getElementById('tipo-producto-id');
  const nombreInput = document.getElementById('tipo-producto-nombre');
  const cuentaInput = document.getElementById('tipo-producto-cuenta');

  document.getElementById('btn-nuevo-tipo-producto').onclick = () => {
    form.reset();
    idInput.value = '';
    modal.classList.remove('hidden');
  };

  document.getElementById('btn-cancelar-tipo-producto').onclick = () => {
    modal.classList.add('hidden');
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();

    if (idInput.value) {
      // Editar
      await actualizarTipoProducto(idInput.value, {
        nombre: nombreInput.value.trim(),
        cuenta_contable: cuentaInput.value.trim()
      });
    } else {
      // Crear
      await crearTipoProducto({
        nombre: nombreInput.value.trim(),
        cuenta_contable: cuentaInput.value.trim()
      });
    }

    modal.classList.add('hidden');
    cargarTiposProducto();
  });

  document.getElementById('view-tipos-producto').addEventListener('click', async e => {
    if (e.target.dataset.edit) {
      const tr = e.target.closest('tr').children;
      idInput.value = e.target.dataset.edit;
      nombreInput.value = tr[0].innerText;
      cuentaInput.value = tr[1].innerText;
      modal.classList.remove('hidden');
    }

    if (e.target.dataset.delete) {
      const ok = await confirmar({ icon: '🗑️', titulo: '¿Eliminar tipo de producto?', msg: 'Esta acción no se puede deshacer.' });
      if (ok) {
        await eliminarTipoProducto(e.target.dataset.delete);
        cargarTiposProducto();
      }
    }
  });
}

export async function cargarTiposProducto() {
  const tbody = document.getElementById('tipos-producto-body');
  const tipos = await listarTiposProducto();

  tbody.innerHTML = '';
  tipos.forEach(t => {
    tbody.innerHTML += `
      <tr>
        <td>${t.nombre}</td>
        <td>${t.cuenta_contable}</td>
        <td>
          <button data-edit="${t.id}">✏️</button>
          <button data-delete="${t.id}">🗑️</button>
        </td>
      </tr>
    `;
  });
}