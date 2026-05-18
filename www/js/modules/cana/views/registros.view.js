import { listarNotasCana, eliminarNotaCana, prepararExcelCana } from '../services/cana.service.js';
import { updateEstadoCanaCab } from '../repositories/cana.repo.js';
import { confirmar } from '../../../utils/confirm.js';
import { formatFecha } from '../../../utils/fecha.js';

let inicializado  = false;
let filtroEstado  = 'BORRADOR';

export function initRegistrosCanaView() {
  if (inicializado) return;
  inicializado = true;

  document.getElementById('btn-nueva-nota-cana').onclick = () =>
    window.showView('cana-nuevo');

  const filtroEl = document.getElementById('filtro-estado-cana');
  if (filtroEl) {
    filtroEl.value = filtroEstado;
    filtroEl.addEventListener('change', async () => {
      filtroEstado = filtroEl.value || null;
      await cargarRegistrosCana();
    });
  }

  document.getElementById('view-cana-registros').addEventListener('click', async e => {
    if (e.target.dataset.verDetalle) {
      window.showView('cana-detalle', e.target.dataset.verDetalle);
      return;
    }

    if (e.target.dataset.editarNota) {
      window.showView('cana-editar', e.target.dataset.editarNota);
      return;
    }

    if (e.target.dataset.exportarNota) {
      const id = e.target.dataset.exportarNota;
      const btn = e.target;
      btn.disabled = true; btn.textContent = '⏳';
      try {
        const { base64, nombre } = await prepararExcelCana(id);
        const { Filesystem, Share } = window.Capacitor.Plugins;
        const base64Limpio = base64.includes(',') ? base64.split(',')[1] : base64;
        const dataUri = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64Limpio}`;
        const resultado = await Filesystem.writeFile({ path: nombre, data: dataUri, directory: 'CACHE', recursive: true });
        await Share.share({
          title: 'Plantación de Caña - AgroApp',
          text: `Exportación de nota`,
          files: [resultado.uri],
          dialogTitle: '¿Dónde querés enviar el Excel?'
        });
        await updateEstadoCanaCab(id, 'EXPORTADO');
        await cargarRegistrosCana();
      } catch (err) {
        if (err.message?.includes('cancel') || err.message?.includes('dismiss')) { /* usuario canceló */ }
        else { alert('❌ No se pudo exportar:\n' + err.message); }
      } finally {
        btn.disabled = false; btn.textContent = '📤';
      }
      return;
    }

    if (e.target.dataset.eliminarNota) {
      const id  = e.target.dataset.eliminarNota;
      const btn = e.target;
      const ok  = await confirmar({
        icon: '🗑️',
        titulo: '¿Eliminar nota?',
        msg: 'Se eliminará la nota y todos sus datos. Esta acción no se puede deshacer.',
        okLabel: 'Sí, eliminar',
      });
      if (ok) {
        btn.disabled = true;
        btn.textContent = '⏳';
        await eliminarNotaCana(id);
        await cargarRegistrosCana();
      }
    }
  });
}

export async function cargarRegistrosCana() {
  const container = document.getElementById('cana-lista');

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

  const notas = await listarNotasCana(filtroEstado);

  const filtroEl = document.getElementById('filtro-estado-cana');
  if (filtroEl) filtroEl.value = filtroEstado ?? '';

  if (notas.length === 0) {
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
        <p class="empty-state-titulo">Sin notas de plantación</p>
        <p class="empty-state-sub">Creá tu primera nota tocando <strong>➕ Nueva nota</strong>.</p>
      </div>`;
    return;
  }

  container.innerHTML = notas.map(n => `
    <div class="hoja-card" data-estado="${n.estado}">
      <div class="hoja-card-header">
        <span class="hoja-numero">${n.numero_completo}</span>
        <span class="hoja-estado hoja-estado--${n.estado.toLowerCase()}">${n.estado}</span>
      </div>
      <div class="hoja-card-body">
        <div class="hoja-card-main-row">
          <span class="hoja-card-empresa">${n.empresa_nombre ?? '—'}</span>
          <span class="hoja-card-tecnico">👤 ${n.tecnico_nombre ?? '—'}</span>
        </div>
        <div class="hoja-card-cultivo">
          🌾 Plantación de Caña${n.mes ? ` &nbsp;·&nbsp; ${n.mes}` : ''}
        </div>
        <div class="hoja-card-pills">
          <span class="hoja-pill hoja-pill--fecha">
            📅 ${formatFecha(n.fecha)}
          </span>
          <span class="hoja-pill hoja-pill--productos">
            🌿 ${n.total_lotes} lote${n.total_lotes !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <div class="hoja-card-actions">
        <button data-ver-detalle="${n.id}">📋 Detalle</button>
        <button data-editar-nota="${n.id}">✏️ Editar</button>
        <button data-exportar-nota="${n.id}">📤 Exportar</button>
        <button data-eliminar-nota="${n.id}">🗑️</button>
      </div>
    </div>
  `).join('');
}
