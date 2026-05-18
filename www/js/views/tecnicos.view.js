// views/tecnicos.view.js
import {
  listarTecnicos,
  guardarTecnico,
  eliminarTecnico
} from '../services/tecnicos.service.js';
import { listarEmpresas, getEmpresaActiva } from '../services/empresas.service.js';
import { confirmar } from '../utils/confirm.js';

let inicializado = false;
let empresaSeleccionada = null;

export function initTecnicosView() {
  if (inicializado) return;
  inicializado = true;

  const view = document.getElementById('view-tecnicos');
  const modal = document.getElementById('tecnico-modal');
  const form = document.getElementById('tecnico-form');
  const empresaSelect = document.getElementById('tecnicos-empresa-select');

  const idInput = document.getElementById('tecnico-id');
  const nombreInput = document.getElementById('tecnico-nombre');

  // Cambio de empresa → recargar técnicos (solo si el select existe en el HTML)
  if (empresaSelect) {
    empresaSelect.addEventListener('change', async (e) => {
      empresaSeleccionada = e.target.value;
      await cargarTecnicos();
    });
  }

  document.getElementById('btn-nuevo-tecnico')
    .addEventListener('click', () => {
      if (!empresaSeleccionada) {
        alert('Selecciona una empresa primero');
        return;
      }
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
      empresa_id: empresaSeleccionada,
      nombre: nombreInput.value,
    });

    modal.classList.add('hidden');
    await cargarTecnicos();
  });

  view.addEventListener('click', async e => {
    if (e.target.dataset.edit) {
      const tr = e.target.closest('tr').children;

      idInput.value = e.target.dataset.edit;
      nombreInput.value = tr[0].innerText;

      modal.classList.remove('hidden');
    }

    if (e.target.dataset.delete) {
      const ok = await confirmar({ icon: '🗑️', titulo: '¿Eliminar técnico?', msg: 'Esta acción no se puede deshacer.' });
      if (ok) {
        await eliminarTecnico(e.target.dataset.delete);
        await cargarTecnicos();
      }
    }
  });
}

export async function cargarTecnicos() {
  const empresaSelect = document.getElementById('tecnicos-empresa-select');
  const tbody = document.getElementById('tecnicos-body');

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

  const tecnicos = await listarTecnicos(empresaSeleccionada);

  tbody.innerHTML = '';

  if (tecnicos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:var(--text-muted)">Sin técnicos</td></tr>';
    return;
  }

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
