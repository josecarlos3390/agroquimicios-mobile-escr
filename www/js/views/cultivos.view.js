// cultivos.view.js
import {
  listarCultivos,
  guardarCultivo,
  eliminarCultivo
} from '../services/cultivos.service.js';
import { listarEmpresas, getEmpresaActiva } from '../services/empresas.service.js';
import { confirmar } from '../utils/confirm.js';

let inicializado = false;
let empresaSeleccionada = null;

export function initCultivosView() {
  if (inicializado) return;
  inicializado = true;

  const modal = document.getElementById('cultivo-modal');
  const form = document.getElementById('cultivo-form');
  const empresaSelect = document.getElementById('cultivos-empresa-select');

  const idInput = document.getElementById('cultivo-id');
  const nombreInput = document.getElementById('cultivo-nombre');

  // Cambio de empresa → recargar cultivos (solo si el select existe en el HTML)
  if (empresaSelect) {
    empresaSelect.addEventListener('change', async (e) => {
      empresaSeleccionada = e.target.value;
      await cargarCultivos();
    });
  }

  document.getElementById('btn-nueva-cultivo')
    .addEventListener('click', () => {
      if (!empresaSeleccionada) {
        alert('Selecciona una empresa primero');
        return;
      }
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
      empresa_id: empresaSeleccionada,
      nombre: nombreInput.value
    });

    modal.classList.add('hidden');
    await cargarCultivos();
  });

  // Delegación de eventos dentro de la vista
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
        const ok = await confirmar({ icon: '🗑️', titulo: '¿Eliminar cultivo?', msg: 'Esta acción no se puede deshacer.' });
        if (ok) {
          await eliminarCultivo(e.target.dataset.delete);
          await cargarCultivos();
        }
      }
    });
}

export async function cargarCultivos() {
  const empresaSelect = document.getElementById('cultivos-empresa-select');
  const tbody = document.getElementById('cultivos-body');

  // Cargar empresa activa o listar empresas
  const activa = getEmpresaActiva();
  if (activa) {
    empresaSeleccionada = activa.id;
    // El select puede no existir en el HTML (modelo multitenant con empresa fija)
    if (empresaSelect) {
      empresaSelect.innerHTML = `<option value="${activa.id}">${activa.nombre}</option>`;
      empresaSelect.value = activa.id;
      empresaSelect.disabled = true;
    }
  } else {
    const empresas = await listarEmpresas();
    if (empresaSelect) {
      empresaSelect.innerHTML = '<option value="">Selecciona empresa</option>';
      empresas.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = e.nombre;
        empresaSelect.appendChild(opt);
      });
    }
    if (!empresaSeleccionada && empresas.length > 0) {
      empresaSeleccionada = empresas[0].id;
      if (empresaSelect) empresaSelect.value = empresaSeleccionada;
    }
  }

  if (!empresaSeleccionada) {
    tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:var(--text-muted)">Selecciona una empresa</td></tr>';
    return;
  }

  const cultivos = await listarCultivos(empresaSeleccionada);

  tbody.innerHTML = '';

  if (cultivos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:var(--text-muted)">Sin cultivos</td></tr>';
    return;
  }

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
