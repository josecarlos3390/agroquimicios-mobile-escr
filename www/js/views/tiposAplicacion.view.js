import {
  listarTiposAplicacion,
  crearTipoAplicacion,
  actualizarTipoAplicacion,
  eliminarTipoAplicacion
} from '../services/tiposAplicacion.service.js';
import { confirmar } from '../utils/confirm.js';
import { getEmpresaActiva } from '../services/empresas.service.js';

let inicializado = false;

export function initTiposAplicacionView() {
  if (inicializado) return;
  inicializado = true;

  const form = document.getElementById('tipo-aplicacion-form');
  const modal = document.getElementById('tipo-aplicacion-modal');
  const idInput = document.getElementById('tipo-aplicacion-id');
  const nombreInput = document.getElementById('tipo-aplicacion-nombre');

  document.getElementById('btn-nuevo-tipo-aplicacion').onclick = () => {
    form.reset();
    idInput.value = '';
    modal.classList.remove('hidden');
  };

  document.getElementById('btn-cancelar-tipo-aplicacion').onclick = () => {
    modal.classList.add('hidden');
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();

    if (idInput.value) {
      await actualizarTipoAplicacion(idInput.value, nombreInput.value.trim());
    } else {
      const empresa = getEmpresaActiva();
      await crearTipoAplicacion(nombreInput.value.trim(), empresa?.id);
    }

    modal.classList.add('hidden');
    cargarTiposAplicacion();
  });

  document.getElementById('view-tipos-aplicacion').addEventListener('click', async e => {
    if (e.target.dataset.edit) {
      const tr = e.target.closest('tr').children;
      idInput.value = e.target.dataset.edit;
      nombreInput.value = tr[0].innerText;
      modal.classList.remove('hidden');
    }

    if (e.target.dataset.delete) {
      const ok = await confirmar({ icon: '🗑️', titulo: '¿Eliminar tipo de aplicación?', msg: 'Esta acción no se puede deshacer.' });
      if (ok) {
        await eliminarTipoAplicacion(e.target.dataset.delete);
        cargarTiposAplicacion();
      }
    }
  });
}

export async function cargarTiposAplicacion() {
  const tbody   = document.getElementById('tipos-aplicacion-body');
  const empresa = getEmpresaActiva();
  const tipos   = await listarTiposAplicacion(empresa?.id);

  tbody.innerHTML = '';
  tipos.forEach(t => {
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