import { getEmpresaActiva } from '../../../services/empresas.service.js';
import { listarAsignaciones, eliminarAsignacion } from '../services/combustible.service.js';
import { confirmar } from '../../../utils/confirm.js';
import { formatFecha } from '../../../utils/fecha.js';

let inicializado = false;

export function initRegistrosCombustibleView() {
  if (inicializado) return;
  inicializado = true;

  document.getElementById('btn-nueva-asignacion').onclick = () =>
    window.showView('combustible-nuevo');

  document.getElementById('view-combustible-registros').addEventListener('click', async e => {
    if (e.target.dataset.verDetalle) {
      window.showView('combustible-detalle', e.target.dataset.verDetalle);
      return;
    }

    if (e.target.dataset.editarAsignacion) {
      window.showView('combustible-editar', e.target.dataset.editarAsignacion);
      return;
    }

    if (e.target.dataset.eliminarAsignacion) {
      const id  = e.target.dataset.eliminarAsignacion;
      const btn = e.target;
      const ok  = await confirmar({
        icon: '🗑️',
        titulo: '¿Eliminar asignación?',
        msg: 'Se eliminará este registro de combustible. Esta acción no se puede deshacer.',
        okLabel: 'Sí, eliminar',
      });
      if (ok) {
        btn.disabled = true;
        btn.textContent = '⏳';
        await eliminarAsignacion(id);
        await cargarRegistrosCombustible();
      }
    }
  });
}

export async function cargarRegistrosCombustible() {
  const container = document.getElementById('combustible-lista');

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
  const asignaciones = await listarAsignaciones(empresa?.id || null);

  if (asignaciones.length === 0) {
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
        <p class="empty-state-titulo">Sin asignaciones de combustible</p>
        <p class="empty-state-sub">Creá tu primer registro tocando <strong>➕ Nueva asignación</strong>.</p>
      </div>`;
    return;
  }

  container.innerHTML = asignaciones.map(a => `
    <div class="hoja-card" data-estado="${a.estado}">
      <div class="hoja-card-header">
        <span class="hoja-numero">${a.numero_completo}</span>
        <span class="hoja-estado hoja-estado--${a.estado.toLowerCase()}">${a.estado}</span>
      </div>
      <div class="hoja-card-body">
        <div class="hoja-card-main-row">
          <span class="hoja-card-empresa">🚛 ${a.placa_codigo}</span>
          <span class="hoja-card-tecnico">⛽ ${a.tipo_combustible}</span>
        </div>
        <div class="hoja-card-cultivo">
          📅 ${formatFecha(a.fecha)} &nbsp;·&nbsp; 📦 ${a.cantidad} Litros${a.horometro ? ` &nbsp;·&nbsp; 🛞 ${a.horometro} Km` : ''}
        </div>
        <div class="hoja-card-pills">
          <span class="hoja-pill hoja-pill--fecha">
            📥 Recibe: ${a.persona_recibe}
          </span>
          <span class="hoja-pill hoja-pill--productos">
            📤 Entrega: ${a.persona_entrega}
          </span>
        </div>
        ${a.foto_base64 ? `
        <div style="margin-top:0.5rem">
          <img src="${a.foto_base64}" alt="Foto" style="width:100%;max-height:180px;object-fit:cover;border-radius:8px;cursor:pointer"
            onclick="this.style.maxHeight=this.style.maxHeight==='100%'?'180px':'100%';this.style.position=this.style.position==='fixed'?'':'fixed';this.style.top='0';this.style.left='0';this.style.width='100vw';this.style.height='100vh';this.style.zIndex='9999';this.style.objectFit='contain';this.style.background='rgba(0,0,0,0.9)';this.style.padding='1rem';this.style.boxSizing='border-box';this.style.borderRadius='0'">
        </div>` : ''}
      </div>
      <div class="hoja-card-actions">
        <button data-ver-detalle="${a.id}">📋 Ver</button>
        <button data-editar-asignacion="${a.id}">✏️ Editar</button>
        <button data-eliminar-asignacion="${a.id}">🗑️</button>
      </div>
    </div>
  `).join('');
}
