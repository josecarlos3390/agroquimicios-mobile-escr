import { obtenerGuia, eliminarGuia } from '../services/guiaTransporteCana.service.js';
import { confirmar } from '../../../utils/confirm.js';
import { formatFecha } from '../../../utils/fecha.js';

let inicializado = false;

export function initDetalleGuiaTransporteView() {
  if (inicializado) return;
  inicializado = true;

  document.getElementById('btn-guia-transporte-detalle-volver')?.addEventListener('click', () => {
    window.showView('guia-transporte-registros');
  });

  /* Botones de acción removidos del detalle: Editar y Eliminar ahora están en la lista */
}

export async function cargarDetalleGuiaTransporte(id) {
  const contenedor = document.getElementById('guia-transporte-detalle-contenido');
  if (!contenedor) return;
  contenedor.dataset.id = id;
  contenedor.innerHTML = '<p style="text-align:center;color:var(--text-muted)">Cargando...</p>';

  try {
    const g = await obtenerGuia(id);
    if (!g) {
      contenedor.innerHTML = '<p class="empty-state">Guía no encontrada</p>';
      return;
    }

    let html = `
      <div class="card">
        <div class="guia-detalle-seccion">
          <div class="guia-detalle-seccion-titulo">📋 Información General</div>
          <div class="guia-detalle-grid">
            <div><strong>Número:</strong> ${g.numero_completo}</div>
            <div><strong>Fecha:</strong> ${formatFecha(g.fecha)}</div>
            <div><strong>Hora llegada:</strong> ${g.hora_llegada || '—'}</div>
            <div><strong>Hora salida:</strong> ${g.hora_salida || '—'}</div>
            <div><strong>Hora cola:</strong> ${g.hora_llegada_cola || '—'}</div>
            <div><strong>Boletario:</strong> ${g.boletario || '—'}</div>
            <div><strong>Turno:</strong> ${g.turno || '—'}</div>
            <div><strong>Frente:</strong> ${g.frente || '—'}</div>
            <div><strong>Propiedad:</strong> ${g.propiedad || '—'}</div>
            <div><strong>Lote:</strong> ${g.lote || '—'}</div>
            <div><strong>Variedad:</strong> ${g.variedad || '—'}</div>
            <div><strong>Cultivo:</strong> ${g.cultivo || '—'}</div>
            <div><strong>Hectáreas:</strong> ${g.hectareas != null ? g.hectareas : '—'}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="guia-detalle-seccion">
          <div class="guia-detalle-seccion-titulo">🔓 Liberación</div>
          <div class="guia-detalle-grid">
            <div><strong>Cód. Liberación:</strong> ${g.cod_liberacion || '—'}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="guia-detalle-seccion">
          <div class="guia-detalle-seccion-titulo">🚛 Información del Camión</div>
          <div class="guia-detalle-grid">
            <div><strong>Cód. Chofer:</strong> ${g.cod_chofer || '—'}</div>
            <div><strong>Nombre Chofer:</strong> ${g.nombre_chofer || '—'}</div>
            <div><strong>Cód. Camión:</strong> ${g.cod_camion || '—'}</div>
            <div><strong>Placa:</strong> ${g.placa || '—'}</div>
            <div><strong>Cód. Chata:</strong> ${g.cod_chata || '—'}</div>
            <div><strong>Transportista:</strong> ${g.transportista || '—'}</div>
          </div>
          ${g.foto_camion_base64 ? `<img src="${g.foto_camion_base64}" class="guia-detalle-foto" alt="Foto camión" onerror="this.style.display='none'">` : ''}
        </div>
      </div>

      <div class="card">
        <div class="guia-detalle-seccion">
          <div class="guia-detalle-seccion-titulo">🚜 Cosecha Semi-Mecanizada</div>
          <div class="guia-detalle-grid">
            <div><strong>Cargadora:</strong> ${g.cod_cargadora || '—'}</div>
            <div><strong>Operadora:</strong> ${g.cod_operadora || '—'}</div>
            <div><strong>Tractor Chata:</strong> ${g.cod_tractor_chata || '—'}</div>
            <div><strong>Tractorista:</strong> ${g.cod_tractorista || '—'}</div>
          </div>
          ${g.foto_semi_base64 ? `<img src="${g.foto_semi_base64}" class="guia-detalle-foto" alt="Foto semi-mecanizada" onerror="this.style.display='none'">` : ''}
        </div>
      </div>
    `;

    if (g.cosechas_mecanizadas && g.cosechas_mecanizadas.length > 0) {
      html += `<div class="card"><div class="guia-detalle-seccion"><div class="guia-detalle-seccion-titulo">⚙️ Cosecha Mecanizada</div>`;
      g.cosechas_mecanizadas.forEach(cm => {
        html += `
          <div style="margin-bottom:0.75rem;padding:0.6rem;background:var(--gray-100);border-radius:var(--radius-sm)">
            <div style="font-weight:600;color:var(--primary);margin-bottom:0.3rem">Cosechadora #${cm.numero_cosechadora} · Grilla ${cm.grilla_seleccion || '—'}</div>
            <div class="guia-detalle-grid">
              <div><strong>Cosechadora:</strong> ${cm.cod_cosechadora || '—'}</div>
              <div><strong>Operador:</strong> ${cm.cod_operador || '—'}</div>
              <div><strong>Tractor Transbordo:</strong> ${cm.cod_tractor_transbordo || '—'}</div>
              <div><strong>Tractorista:</strong> ${cm.cod_tractorista || '—'}</div>
            </div>
          </div>
        `;
      });
      html += `</div></div>`;
    }

    if (g.observaciones) {
      html += `
        <div class="card">
          <div class="guia-detalle-seccion">
            <div class="guia-detalle-seccion-titulo">📝 Observaciones</div>
            <div style="font-size:0.88rem;white-space:pre-wrap">${g.observaciones}</div>
          </div>
        </div>
      `;
    }

    contenedor.innerHTML = html;
  } catch (err) {
    console.error('[GUIA-TRANSPORTE] Error cargando detalle:', err);
    contenedor.innerHTML = '<p class="empty-state">❌ Error al cargar detalle</p>';
  }
}
