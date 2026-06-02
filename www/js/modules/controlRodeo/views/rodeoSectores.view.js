import { listarRodeoSectores, guardarRodeoSector, eliminarRodeoSector } from '../services/rodeoSectores.service.js';
import { getEmpresaActiva } from '../../../services/empresas.service.js';
import { confirmar } from '../../../utils/confirm.js';

let inicializado = false;

export function initRodeoSectoresView() {
  if (inicializado) return;
  inicializado = true;

  const form = document.getElementById('form-rodeo-sector');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const input = document.getElementById('rodeo-sector-nombre');
      const nombre = input?.value?.trim().toUpperCase();
      if (!nombre) { alert('El nombre es obligatorio'); return; }

      try {
        const empresa = getEmpresaActiva();
        await guardarRodeoSector({ empresa_id: empresa?.id ?? null, nombre });
        input.value = '';
        await cargarRodeoSectores();
      } catch (err) {
        alert('❌ ' + err.message);
      }
    });
  }

  const lista = document.getElementById('rodeo-sectores-lista');
  if (lista) {
    lista.addEventListener('click', async e => {
      const btn = e.target.closest('.btn-eliminar-rodeo-sector');
      if (!btn) return;
      const id = btn.dataset.id;
      if (!id) return;
      const ok = await confirmar({ titulo: 'Eliminar sector', msg: '¿Eliminar este sector de rodeo?' });
      if (!ok) return;
      try {
        await eliminarRodeoSector(id);
        await cargarRodeoSectores();
      } catch (err) {
        alert('❌ ' + err.message);
      }
    });
  }
}

export async function cargarRodeoSectores() {
  const lista = document.getElementById('rodeo-sectores-lista');
  if (!lista) return;

  try {
    const empresa = getEmpresaActiva();
    const sectores = await listarRodeoSectores(empresa?.id ?? null);

    if (!sectores.length) {
      lista.innerHTML = `<p class="empty-state" style="margin-top:1rem">No hay sectores registrados</p>`;
      return;
    }

    lista.innerHTML = sectores.map(s => `
      <div class="sector-chip" style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0.8rem;margin:0.4rem 0;background:var(--gray-100);border-radius:var(--radius-sm);">
        <span>${s.nombre}</span>
        <button type="button" class="btn-eliminar-rodeo-sector" data-id="${s.id}" style="color:var(--danger);background:none;border:none;font-size:1rem;cursor:pointer;">🗑️</button>
      </div>
    `).join('');
  } catch (err) {
    console.error('[RODEO] Error cargando sectores:', err);
  }
}
