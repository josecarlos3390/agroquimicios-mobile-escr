// www/js/views/sectores.view.js
import { listarEmpresas, getEmpresaActiva } from '../services/empresas.service.js';
import {
  listarSectores,
  guardarSector,
  eliminarSector
} from '../services/sectores.service.js';
import { confirmar } from '../utils/confirm.js';

let empresaActual = null;
let eventosRegistrados = false; // 👈 CLAVE

export function initSectoresView() {
  const empresaSelect = document.getElementById('sector-empresa-select');
  const modal = document.getElementById('sector-modal');
  const form = document.getElementById('sector-form');

  const idInput = document.getElementById('sector-id');
  const nombreInput = document.getElementById('sector-nombre');

  empresaSelect.onchange = async () => {
    empresaActual = empresaSelect.value;

    if (!empresaActual) {
      document.getElementById('sectores-body').innerHTML = '';
      return;
    }

    cargarSectores();
  };

  document.getElementById('btn-nuevo-sector').onclick = () => {
    if (!empresaActual) {
      alert('Seleccione una empresa');
      return;
    }
    form.reset();
    idInput.value = '';
    modal.classList.remove('hidden');
  };

  document.getElementById('btn-cancelar-sector').onclick = () => {
    modal.classList.add('hidden');
  };

  form.onsubmit = async e => {
    e.preventDefault();

    await guardarSector({
      id: idInput.value || null,
      empresa_id: empresaActual,
      nombre: nombreInput.value
    });

    modal.classList.add('hidden');
    cargarSectores();
  };

  // 🔒 Registrar eventos UNA SOLA VEZ
  if (!eventosRegistrados) {
    document.body.addEventListener('click', async e => {

      // 🔒 Solo actuar si la vista de sectores está visible
      const vistaSectores = document.getElementById('view-sectores');
      if (vistaSectores.classList.contains('hidden')) return;

      if (e.target.dataset.edit) {
        const tr = e.target.closest('tr').children;
        idInput.value = e.target.dataset.edit;
        nombreInput.value = tr[0].innerText;
        modal.classList.remove('hidden');
      }

      if (e.target.dataset.delete) {
        const ok = await confirmar({ icon: '🗑️', titulo: '¿Eliminar sector?', msg: 'Se eliminarán también todos los lotes del sector.' });
        if (ok) {
          await eliminarSector(e.target.dataset.delete);
          cargarSectores();
        }
      }

    });

    eventosRegistrados = true;
  }

  // ✅ Llamar DESPUÉS de registrar el onchange para que el dispatchEvent lo capture
  cargarEmpresasSector();
}

export async function cargarSectores() {
  if (!empresaActual) return;

  const tbody = document.getElementById('sectores-body');
  const sectores = await listarSectores(empresaActual);

  tbody.innerHTML = '';

  sectores.forEach(s => {
    const ha = s.hectareas_total > 0 ? s.hectareas_total.toFixed(2) : '—';
    tbody.innerHTML += `
      <tr>
        <td>${s.nombre}</td>
        <td>${ha}</td>
        <td>
          <button data-edit="${s.id}">✏️</button>
          <button data-delete="${s.id}">🗑️</button>
        </td>
      </tr>
    `;
  });
}

async function cargarEmpresasSector() {
  const select = document.getElementById('sector-empresa-select');
  const activa = getEmpresaActiva();
  if (activa) {
    select.innerHTML = `<option value="${activa.id}">${activa.nombre}</option>`;
    select.value = activa.id;
    select.disabled = true;
    select.dispatchEvent(new Event('change'));
    return;
  }
  const empresas = await listarEmpresas();
  select.innerHTML = '<option value="">Seleccione empresa</option>';
  empresas.forEach(e => {
    select.innerHTML += `<option value="${e.id}">${e.nombre}</option>`;
  });
}