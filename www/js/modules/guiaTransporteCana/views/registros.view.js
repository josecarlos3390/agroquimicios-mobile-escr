import { listarGuias, eliminarGuia, prepararExcelGuiaTransporte, actualizarEstadoGuia } from '../services/guiaTransporteCana.service.js';
import { getEmpresaActiva } from '../../../services/empresas.service.js';
import { confirmar } from '../../../utils/confirm.js';
import { formatFecha } from '../../../utils/fecha.js';

let inicializado = false;
let estadoFiltro = 'BORRADOR';

export function initRegistrosGuiaTransporteView() {
  if (inicializado) return;
  inicializado = true;

  const section = document.getElementById('view-guia-transporte-registros');
  if (!section) return;

  const filtro = document.getElementById('filtro-estado-guia-transporte');
  if (filtro) {
    filtro.addEventListener('change', () => {
      estadoFiltro = filtro.value;
      cargarRegistrosGuiaTransporte();
    });
  }

  section.addEventListener('click', async e => {
    const btnNueva = e.target.closest('#btn-nueva-guia-transporte');
    if (btnNueva) {
      window.showView('guia-transporte-nuevo');
      return;
    }

    const card = e.target.closest('.guia-card');
    if (!card) return;
    const id = card.dataset.id;
    if (!id) return;

    if (e.target.closest('.btn-editar-guia')) {
      window.showView('guia-transporte-editar', id);
      return;
    }

    if (e.target.closest('.btn-enviar-guia')) {
      const btn = e.target.closest('.btn-enviar-guia');
      const textoOriginal = btn.textContent;
      btn.disabled = true; btn.textContent = '⏳';
      try {
        const { base64, nombre } = await prepararExcelGuiaTransporte(id);
        const { Filesystem, Share } = window.Capacitor.Plugins;
        const base64Limpio = base64.includes(',') ? base64.split(',')[1] : base64;
        const dataUri = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64Limpio}`;
        const resultado = await Filesystem.writeFile({ path: nombre, data: dataUri, directory: 'CACHE', recursive: true });
        await Share.share({
          title: 'Guía de Transporte de Caña - AgroApp',
          text: `Exportación: ${nombre}`,
          files: [resultado.uri],
          dialogTitle: '¿Dónde querés enviar el Excel?'
        });
        await actualizarEstadoGuia(id, 'EXPORTADO');
        await cargarRegistrosGuiaTransporte();
      } catch (err) {
        if (err.message?.includes('cancel') || err.message?.includes('dismiss')) { /* usuario canceló */ }
        else { alert('❌ No se pudo exportar:\n' + err.message); }
      } finally {
        btn.disabled = false; btn.textContent = textoOriginal;
      }
      return;
    }

    if (e.target.closest('.btn-eliminar-guia')) {
      const ok = await confirmar({ titulo: 'Eliminar guía', msg: '¿Eliminar esta guía de transporte?' });
      if (!ok) return;
      try {
        await eliminarGuia(id);
        await cargarRegistrosGuiaTransporte();
      } catch (err) {
        alert('❌ ' + err.message);
      }
      return;
    }

    window.showView('guia-transporte-detalle', id);
  });
}

export async function cargarRegistrosGuiaTransporte() {
  const lista = document.getElementById('guia-transporte-lista');
  if (!lista) return;

  lista.innerHTML = `
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
  `;

  try {
    const empresa = getEmpresaActiva();
    const guias = await listarGuias(empresa?.id ?? null);

    const filtradas = estadoFiltro
      ? guias.filter(g => g.estado === estadoFiltro)
      : guias;

    if (!filtradas.length) {
      lista.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <p>No hay guías de transporte${estadoFiltro ? ' en este estado' : ''}</p>
        </div>
      `;
      return;
    }

    lista.innerHTML = filtradas.map(g => `
      <div class="card guia-card" data-id="${g.id}">
        <div class="hoja-card-header">
          <div class="hoja-card-title">${g.numero_completo}</div>
          <span class="hoja-card-badge ${g.estado === 'EXPORTADO' ? 'badge-exportado' : 'badge-borrador'}">${g.estado}</span>
        </div>
        <div class="hoja-card-meta">
          <span>📅 ${formatFecha(g.fecha)}</span>
          <span>🚛 ${g.placa || '—'}</span>
        </div>
        <div class="hoja-card-body" style="font-size:0.85rem;color:var(--text-muted)">
          <div>👤 ${g.boletario || '—'} · Turno: ${g.turno || '—'}</div>
          <div>🔓 Liberación: ${g.cod_liberacion || '—'}</div>
        </div>
        <div class="hoja-card-actions">
          <button type="button" class="btn-editar-guia">
            ✏️ Editar
          </button>
          <button type="button" class="btn-enviar-guia">
            📤 Exportar
          </button>
          <button type="button" class="btn-eliminar-guia">
            🗑️ Eliminar
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('[GUIA-TRANSPORTE] Error cargando guías:', err);
    lista.innerHTML = `<p class="empty-state">❌ Error al cargar guías</p>`;
  }
}
