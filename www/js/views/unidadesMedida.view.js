import {
  listarUnidadesMedida,
  crearUnidadMedida,
  actualizarUnidadMedida,
  eliminarUnidadMedida
} from '../services/unidadesMedida.service.js';
import { confirmar } from '../utils/confirm.js';

let inicializado = false;

export function initUnidadesMedidaView() {
  if (inicializado) return;
  inicializado = true;

  const form = document.getElementById('unidad-form');
  const modal = document.getElementById('unidad-modal');
  const idInput = document.getElementById('unidad-id');
  const codigoInput = document.getElementById('unidad-codigo');
  const nombreInput = document.getElementById('unidad-nombre');
  const factorInput = document.getElementById('unidad-factor');

  document.getElementById('btn-nueva-unidad').onclick = () => {
    form.reset();
    idInput.value = '';
    modal.classList.remove('hidden');
  };

  document.getElementById('btn-cancelar-unidad').onclick = () => {
    modal.classList.add('hidden');
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const data = {
      codigo: codigoInput.value.trim().toUpperCase(),
      nombre: nombreInput.value.trim(),
      factor: parseFloat(factorInput.value) || 1
    };

    if (idInput.value) {
      await actualizarUnidadMedida(idInput.value, data);
    } else {
      await crearUnidadMedida(data);
    }

    modal.classList.add('hidden');
    cargarUnidadesMedida();
  });

  document.getElementById('view-unidades').addEventListener('click', async e => {
    if (e.target.dataset.edit) {
      const tr = e.target.closest('tr').children;
      idInput.value = e.target.dataset.edit;
      codigoInput.value = tr[0].innerText;
      nombreInput.value = tr[1].innerText;
      factorInput.value = tr[2].innerText;
      modal.classList.remove('hidden');
    }

    if (e.target.dataset.delete) {
      const ok = await confirmar({ icon: '🗑️', titulo: '¿Eliminar unidad de medida?', msg: 'Esta acción no se puede deshacer.' });
      if (ok) {
        await eliminarUnidadMedida(e.target.dataset.delete);
        cargarUnidadesMedida();
      }
    }
  });
}

export async function cargarUnidadesMedida() {
  const tbody = document.getElementById('unidades-body');
  const unidades = await listarUnidadesMedida();

  tbody.innerHTML = '';
  unidades.forEach(u => {
    tbody.innerHTML += `
      <tr>
        <td>${u.codigo}</td>
        <td>${u.nombre}</td>
        <td>${u.factor}</td>
        <td>
          <button data-edit="${u.id}">✏️</button>
          <button data-delete="${u.id}">🗑️</button>
        </td>
      </tr>
    `;
  });
}