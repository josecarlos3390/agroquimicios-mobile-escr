import { obtenerRodeo } from '../services/rodeo.service.js';
import { formatFecha } from '../../../utils/fecha.js';

let inicializado = false;

export function initRodeoDetalleView() {
  if (inicializado) return;
  inicializado = true;

  document.getElementById('btn-rodeo-detalle-volver')?.addEventListener('click', () => {
    window.showView('rodeo-registros');
  });
}

export async function cargarRodeoDetalle(id) {
  const contenedor = document.getElementById('rodeo-detalle-contenido');
  if (!contenedor) return;
  contenedor.dataset.id = id;
  contenedor.innerHTML = '<p style="text-align:center;color:var(--text-muted)">Cargando...</p>';

  try {
    const r = await obtenerRodeo(id);
    if (!r) {
      contenedor.innerHTML = '<p class="empty-state">Registro no encontrado</p>';
      return;
    }

    let html = `
      <div class="card">
        <div class="guia-detalle-seccion">
          <div class="guia-detalle-seccion-titulo">📋 Cabecera</div>
          <div class="guia-detalle-grid">
            <div><strong>Número:</strong> ${r.numero_completo}</div>
            <div><strong>Fecha:</strong> ${formatFecha(r.fecha)}</div>
            <div><strong>Sector:</strong> ${r.sector_nombre || '—'}</div>
            <div><strong>Árboles:</strong> ${r.detalle?.length || 0}</div>
            ${r.observaciones ? `<div style="grid-column: 1 / -1;"><strong>Observaciones:</strong> ${r.observaciones}</div>` : ''}
          </div>
        </div>
      </div>
    `;

    if (r.detalle && r.detalle.length > 0) {
      const despachados = r.detalle.filter(d => d.despachado === 1).length;
      html += `
        <div class="card" style="overflow-x:auto;">
          <div class="guia-detalle-seccion">
            <div class="guia-detalle-seccion-titulo">🌳 Detalle del Excel (${r.detalle.length} filas${despachados > 0 ? ` · <span style="color:var(--danger)">${despachados} despachado${despachados !== 1 ? 's' : ''}</span>` : ''})</div>
            <table style="width:100%;font-size:0.75rem;border-collapse:collapse;min-width:900px;">
              <thead>
                <tr style="background:var(--gray-100);">
                  <th style="padding:0.4rem;border:1px solid var(--border)">Estado</th>
                  <th style="padding:0.4rem;border:1px solid var(--border)">Nro Rodeo</th>
                  <th style="padding:0.4rem;border:1px solid var(--border)">X Coord</th>
                  <th style="padding:0.4rem;border:1px solid var(--border)">Y Coord</th>
                  <th style="padding:0.4rem;border:1px solid var(--border)">Especie</th>
                  <th style="padding:0.4rem;border:1px solid var(--border)">Faja</th>
                  <th style="padding:0.4rem;border:1px solid var(--border)">Nro Árbol</th>
                  <th style="padding:0.4rem;border:1px solid var(--border)">Sección</th>
                  <th style="padding:0.4rem;border:1px solid var(--border)">D1 (M)</th>
                  <th style="padding:0.4rem;border:1px solid var(--border)">D2 (M)</th>
                  <th style="padding:0.4rem;border:1px solid var(--border)">Largo (M)</th>
                  <th style="padding:0.4rem;border:1px solid var(--border)">Vol (M3)</th>
                  <th style="padding:0.4rem;border:1px solid var(--border)">Para Transporte</th>
                </tr>
              </thead>
              <tbody>
                ${r.detalle.map(d => {
                  const estado = d.estado_uso || 'DISPONIBLE';
                  const usado = estado !== 'DISPONIBLE';
                  const rowStyle = usado ? 'background:#f0f0f0;color:#888;text-decoration:line-through;' : '';
                  const badgeText = estado === 'DESPACHADO' ? 'DESPACHADO' : estado === 'RECEPCIONADO' ? 'RECEPCIONADO' : estado === 'DESPACHO_ASERRADERO' ? 'DESP. ASERRADERO' : 'DISPONIBLE';
                  const badgeColor = usado ? 'var(--danger)' : 'var(--success)';
                  const badge = `<span style="display:inline-block;background:${badgeColor};color:#fff;padding:0.15rem 0.4rem;border-radius:0.25rem;font-size:0.65rem">${badgeText}</span>`;
                  return `
                  <tr style="${rowStyle}">
                    <td style="padding:0.4rem;border:1px solid var(--border);text-align:center;">${badge}</td>
                    <td style="padding:0.4rem;border:1px solid var(--border)">${d.nro_rodeo || '—'}</td>
                    <td style="padding:0.4rem;border:1px solid var(--border)">${d.x_coord ?? '—'}</td>
                    <td style="padding:0.4rem;border:1px solid var(--border)">${d.y_coord ?? '—'}</td>
                    <td style="padding:0.4rem;border:1px solid var(--border)">${d.especie || '—'}</td>
                    <td style="padding:0.4rem;border:1px solid var(--border)">${d.faja || '—'}</td>
                    <td style="padding:0.4rem;border:1px solid var(--border)">${d.nro_arbol || '—'}</td>
                    <td style="padding:0.4rem;border:1px solid var(--border)">${d.seccion || '—'}</td>
                    <td style="padding:0.4rem;border:1px solid var(--border)">${d.d1 ?? '—'}</td>
                    <td style="padding:0.4rem;border:1px solid var(--border)">${d.d2 ?? '—'}</td>
                    <td style="padding:0.4rem;border:1px solid var(--border)">${d.largo ?? '—'}</td>
                    <td style="padding:0.4rem;border:1px solid var(--border)">${d.volumen ?? '—'}</td>
                    <td style="padding:0.4rem;border:1px solid var(--border)">${d.para_transporte || '—'}</td>
                  </tr>
                `;}).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else {
      html += `<div class="card"><p class="empty-state">Sin detalle importado</p></div>`;
    }

    contenedor.innerHTML = html;
  } catch (err) {
    console.error('[RODEO] Error cargando detalle:', err);
    contenedor.innerHTML = '<p class="empty-state">❌ Error al cargar detalle</p>';
  }
}
