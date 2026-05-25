import {
  getEspecies,
  crearEspecie,
  editarEspecie,
  borrarEspecie,
} from '../services/especies.service.js';
import { confirmar } from '../utils/confirm.js';

let inicializado = false;

export function initEspeciesView() {
  if (inicializado) return;
  inicializado = true;

  const view = document.getElementById('view-especies');
  const modal = document.getElementById('especie-modal');
  const form = document.getElementById('especie-form');

  const idInput = document.getElementById('especie-id');
  const nombreInput = document.getElementById('especie-nombre');
  const cientificoInput = document.getElementById('especie-cientifico');

  document.getElementById('btn-nueva-especie')
    .addEventListener('click', () => {
      form.reset();
      idInput.value = '';
      modal.classList.remove('hidden');
      nombreInput.focus();
    });

  document.getElementById('btn-cancelar-especie')
    .addEventListener('click', () => {
      modal.classList.add('hidden');
    });

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = '⏳ Guardando...';

    try {
      if (idInput.value) {
        await editarEspecie(idInput.value, {
          nombreComun: nombreInput.value,
          nombreCientifico: cientificoInput.value,
        });
      } else {
        await crearEspecie({
          nombreComun: nombreInput.value,
          nombreCientifico: cientificoInput.value,
        });
      }
      modal.classList.add('hidden');
      await cargarEspecies();
    } catch (err) {
      alert('❌ ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar';
    }
  });

  // Buscador
  const searchInput = document.getElementById('especies-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      filtrarEspecies(searchInput.value);
    });
  }

  view.addEventListener('click', async e => {
    const btnEdit = e.target.closest('[data-edit]');
    const btnDelete = e.target.closest('[data-delete]');

    if (btnEdit) {
      const id = btnEdit.dataset.edit;
      const tr = btnEdit.closest('tr').children;
      idInput.value = id;
      nombreInput.value = tr[1].innerText;
      cientificoInput.value = tr[2].innerText === '—' ? '' : tr[2].innerText;
      modal.classList.remove('hidden');
      nombreInput.focus();
    }

    if (btnDelete) {
      const ok = await confirmar({
        icon: '🗑️',
        titulo: '¿Eliminar especie?',
        msg: 'Esta acción no se puede deshacer.',
      });
      if (ok) {
        await borrarEspecie(btnDelete.dataset.delete);
        await cargarEspecies();
      }
    }
  });
}

let todasLasEspecies = [];

export async function cargarEspecies() {
  const tbody = document.getElementById('especies-body');
  const countLabel = document.getElementById('especies-count');

  try {
    todasLasEspecies = await getEspecies();
  } catch (err) {
    console.error('[ESPECIES] Error al cargar:', err);
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">Error al cargar especies</td></tr>';
    return;
  }

  renderEspecies(todasLasEspecies);

  if (countLabel) {
    countLabel.textContent = `${todasLasEspecies.length} especies`;
  }
}

function renderEspecies(lista) {
  const tbody = document.getElementById('especies-body');

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">Sin especies</td></tr>';
    return;
  }

  tbody.innerHTML = lista.map(e => `
    <tr>
      <td>${e.codigo}</td>
      <td>${e.nombre_comun}</td>
      <td>${e.nombre_cientifico || '—'}</td>
      <td>
        <button data-edit="${e.id}">✏️</button>
        <button data-delete="${e.id}">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function filtrarEspecies(termino) {
  const t = termino.trim().toUpperCase();
  if (!t) {
    renderEspecies(todasLasEspecies);
    return;
  }
  const filtradas = todasLasEspecies.filter(e =>
    e.nombre_comun.toUpperCase().includes(t) ||
    (e.nombre_cientifico || '').toUpperCase().includes(t) ||
    e.codigo.toUpperCase().includes(t)
  );
  renderEspecies(filtradas);
}
