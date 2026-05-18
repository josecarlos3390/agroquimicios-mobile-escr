// views/caudales.view.js
import {
  listarCaudales,
  guardarCaudal,
  eliminarCaudal
} from '../services/caudales.service.js';
import { listarEmpresas, getEmpresaActiva } from '../services/empresas.service.js';
import { confirmar } from '../utils/confirm.js';

let inicializado = false;
let empresaSeleccionada = null;

export function initCaudalesView() {
  if (inicializado) return;
  inicializado = true;

  const view   = document.getElementById('view-caudales');
  const modal  = document.getElementById('caudal-modal');
  const form   = document.getElementById('caudal-form');
  const empresaSelect = document.getElementById('caudales-empresa-select');

  const idInput     = document.getElementById('caudal-id');
  const nombreInput = document.getElementById('caudal-nombre');
  const valorInput  = document.getElementById('caudal-valor');
  const unidadInput = document.getElementById('caudal-unidad');

  // Cambio de empresa → recargar caudales (solo si el select existe en el HTML)
  if (empresaSelect) {
    empresaSelect.addEventListener('change', async (e) => {
      empresaSeleccionada = e.target.value;
      await cargarCaudales();
    });
  }

  document.getElementById('btn-nuevo-caudal')
    .addEventListener('click', () => {
      if (!empresaSeleccionada) {
        alert('Selecciona una empresa primero');
        return;
      }
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
      empresa_id: empresaSeleccionada,
      nombre: nombreInput.value.trim(),
      valor:  valorInput.value  ? parseFloat(valorInput.value)  : null,
      unidad: unidadInput.value ? unidadInput.value.trim() : null,
    });

    modal.classList.add('hidden');
    await cargarCaudales();
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
        await cargarCaudales();
      }
    }
  });
}

export async function cargarCaudales() {
  const empresaSelect = document.getElementById('caudales-empresa-select');
  const tbody   = document.getElementById('caudales-body');

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
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">Selecciona una empresa</td></tr>';
    return;
  }

  const caudales = await listarCaudales(empresaSeleccionada);

  tbody.innerHTML = '';

  if (caudales.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">Sin caudales</td></tr>';
    return;
  }

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
