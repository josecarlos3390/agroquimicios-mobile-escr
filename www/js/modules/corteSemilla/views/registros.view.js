import { getEmpresaActiva } from '../../../services/empresas.service.js';
import { listarCorteSemilla, eliminarCorteSemilla, prepararExcelCorteSemilla } from '../services/corteSemilla.service.js';
import { updateEstadoCorteSemillaCab } from '../repositories/corteSemilla.repo.js';
import { confirmar } from '../../../utils/confirm.js';
import { formatFecha } from '../../../utils/fecha.js';

let inicializado = false;
let filtroEstadoCS = null;

export function initRegistrosCorteSemillaView() {
  if (inicializado) return;
  inicializado = true;

  document.getElementById('btn-nuevo-corte-semilla').onclick = () =>
    window.showView('corte-semilla-nuevo');

  const filtroEl = document.getElementById('filtro-estado-cs');
  if (filtroEl) {
    filtroEl.value = filtroEstadoCS ?? '';
    filtroEl.addEventListener('change', async () => {
      filtroEstadoCS = filtroEl.value || null;
      await cargarRegistrosCorteSemilla();
    });
  }

  document.getElementById('view-corte-semilla-registros').addEventListener('click', async e => {
    if (e.target.dataset.verCorteSemilla) {
      window.showView('corte-semilla-detalle', e.target.dataset.verCorteSemilla);
      return;
    }

    if (e.target.dataset.editarCorteSemilla) {
      window.showView('corte-semilla-editar', e.target.dataset.editarCorteSemilla);
      return;
    }

    if (e.target.dataset.eliminarCorteSemilla) {
      const id  = e.target.dataset.eliminarCorteSemilla;
      const btn = e.target;
      const ok  = await confirmar({
        icon: '\uD83D\uDDD1\uFE0F',
        titulo: '\u00BFEliminar registro?',
        msg: 'Se eliminar\u00E1 este registro de corte de semilla y todos sus datos.',
        okLabel: 'S\u00ED, eliminar',
      });
      if (ok) {
        btn.disabled = true; btn.textContent = '\u23F3';
        await eliminarCorteSemilla(id);
        await cargarRegistrosCorteSemilla();
      }
    }

    if (e.target.dataset.exportarCorteSemilla) {
      const id = e.target.dataset.exportarCorteSemilla;
      const btn = e.target;
      btn.disabled = true; btn.textContent = '\u23F3';
      try {
        const { base64, nombre } = await prepararExcelCorteSemilla(id);
        const { Filesystem, Share } = window.Capacitor.Plugins;
        const base64Limpio = base64.includes(',') ? base64.split(',')[1] : base64;
        const dataUri = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64Limpio}`;
        const resultado = await Filesystem.writeFile({ path: nombre, data: dataUri, directory: 'CACHE', recursive: true });
        await Share.share({
          title: 'Corte de Semilla - AgroApp',
          text: `Exportación: Corte de semilla`,
          files: [resultado.uri],
          dialogTitle: '¿Dónde querés enviar el Excel?'
        });
        await updateEstadoCorteSemillaCab(id, 'EXPORTADO');
        await cargarRegistrosCorteSemilla();
      } catch (err) {
        if (err.message?.includes('cancel') || err.message?.includes('dismiss')) { /* cancelado */ }
        else { alert('\u274C No se pudo exportar:\n' + err.message); }
      } finally {
        btn.disabled = false; btn.textContent = '\uD83D\uDCE4';
      }
    }
  });
}

export async function cargarRegistrosCorteSemilla() {
  const container = document.getElementById('corte-semilla-lista');

  container.innerHTML = [1,2,3].map(() => `
    <div class="skeleton-card">
      <div class="skeleton-header">
        <div class="skeleton-line" style="height:14px;width:55%;border-radius:4px;"></div>
        <div class="skeleton-line" style="height:20px;width:22%;border-radius:20px;margin-left:auto;"></div>
      </div>
      <div class="skeleton-body">
        <div class="skeleton-line" style="height:13px;width:70%;"></div>
        <div class="skeleton-line" style="height:13px;width:55%;"></div>
      </div>
    </div>
  `).join('');

  const empresa = getEmpresaActiva();
  const registros = await listarCorteSemilla(filtroEstadoCS);

  const filtroEl = document.getElementById('filtro-estado-cs');
  if (filtroEl) filtroEl.value = filtroEstadoCS ?? '';

  if (registros.length === 0) {
    container.innerHTML = `
      <div class="empty-state-hojas">
        <div class="empty-state-illustration">
          <svg viewBox="0 0 220 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="110" cy="155" rx="75" ry="12" fill="#d4e8d4" opacity="0.5"/>
            <rect x="55" y="28" width="90" height="115" rx="10" fill="#f4f9f4" stroke="#b8d4b8" stroke-width="1.5"/>
            <rect x="70" y="52" width="60" height="5" rx="2.5" fill="#c8dfc8"/>
            <rect x="70" y="65" width="50" height="5" rx="2.5" fill="#c8dfc8"/>
            <rect x="70" y="78" width="55" height="5" rx="2.5" fill="#c8dfc8"/>
            <rect x="88" y="22" width="34" height="12" rx="4" fill="#4a7c4a"/>
            <path d="M110 143 C110 143 110 118 110 108" stroke="#4a7c4a" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M110 120 C110 120 98 114 96 104 C104 104 112 112 110 120Z" fill="#6aaa2a" opacity="0.9"/>
            <path d="M110 128 C110 128 122 120 126 110 C118 110 110 118 110 128Z" fill="#4a7c4a" opacity="0.9"/>
          </svg>
        </div>
        <p class="empty-state-titulo">Sin registros de corte de semilla</p>
        <p class="empty-state-sub">Creá tu primer registro tocando <strong>➕ Nuevo corte</strong>.</p>
      </div>`;
    return;
  }

  container.innerHTML = registros.map(r => `
    <div class="hoja-card" data-estado="${r.estado}">
      <div class="hoja-card-header">
        <span class="hoja-numero">${r.numero_completo}</span>
        <span class="hoja-estado hoja-estado--${r.estado.toLowerCase()}">${r.estado}</span>
      </div>
      <div class="hoja-card-body">
        <div class="hoja-card-main-row">
          <span class="hoja-card-empresa">${r.empresa_nombre ?? '—'}</span>
          <span class="hoja-card-tecnico">👤 ${r.tecnico_nombre ?? '—'}</span>
        </div>
        <div class="hoja-card-cultivo">
          ✂️ Corte de Semilla${r.mes ? ` &nbsp;·&nbsp; ${r.mes}` : ''}
        </div>
        <div class="hoja-card-pills">
          <span class="hoja-pill hoja-pill--fecha">📅 ${formatFecha(r.fecha)}</span>
          <span class="hoja-pill hoja-pill--productos">🌿 ${r.total_cortes} corte${r.total_cortes !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div class="hoja-card-actions">
        <button data-ver-corte-semilla="${r.id}">📋 Ver</button>
        <button data-editar-corte-semilla="${r.id}">✏️ Editar</button>
        <button data-exportar-corte-semilla="${r.id}">📤 Exportar</button>
        <button data-eliminar-corte-semilla="${r.id}">🗑️</button>
      </div>
    </div>
  `).join('');
}
