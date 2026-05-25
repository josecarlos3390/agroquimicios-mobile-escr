import { getCefo } from '../../../services/cefo.service.js';

let inicializado = false;

export function initDetalleControlRodeoView() {
  if (inicializado) return;
  inicializado = true;

  document.getElementById('btn-cefo-detalle-volver')
    ?.addEventListener('click', () => {
      window.showView('control-rodeo-registros');
    });
}

export async function cargarDetalleCefo(id) {
  const container = document.getElementById('cefo-detalle-contenido');
  container.innerHTML = '<p style="text-align:center;color:var(--text-muted)">Cargando...</p>';

  try {
    const data = await getCefo(id);
    if (!data) {
      container.innerHTML = '<p style="text-align:center;color:var(--text-muted)">CFO no encontrado</p>';
      return;
    }

    const cab = data.cabecera;
    const det = data.detalle;

    const fecha = cab.fecha_recep
      ? new Date(cab.fecha_recep).toLocaleDateString('es-ES')
      : '—';

    let html = `
      <div class="card">
        <div class="vista-header">
          <button type="button" id="btn-cefo-detalle-volver" class="btn-volver">← Volver</button>
          <h3>📋 CFO ${cab.nro_cfo_recib}</h3>
        </div>
        <div class="grid" style="margin-top:0.5rem">
          <label>Nro CFO <span class="detalle-info">${cab.nro_cfo_recib}</span></label>
          <label>Fecha recep. <span class="detalle-info">${fecha}</span></label>
          <label>Placa <span class="detalle-info">${cab.placa || '—'}</span></label>
          <label>Chofer <span class="detalle-info">${cab.chofer || '—'}</span></label>
          <label>Total árboles <span class="detalle-info">${det.length}</span></label>
        </div>
        ${cab.observaciones ? `<label style="margin-top:0.5rem">Observaciones <span class="detalle-info">${cab.observaciones}</span></label>` : ''}
      </div>

      <div class="card">
        <h3>🌲 Árboles</h3>
        <div style="overflow-x:auto">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Especie</th>
                <th>Faja</th>
                <th>Nro Árbol</th>
                <th>Sección</th>
                <th>Diam Mayor</th>
                <th>Diam Menor</th>
                <th>Largo</th>
                <th>Volumen</th>
              </tr>
            </thead>
            <tbody>
              ${det.map((a, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${a.especie}</td>
                  <td>${a.faja ?? '—'}</td>
                  <td>${a.nro_arbol}</td>
                  <td>${a.seccion}</td>
                  <td>${a.diamayor?.toFixed(2) ?? '—'}</td>
                  <td>${a.diamenor?.toFixed(2) ?? '—'}</td>
                  <td>${a.largo?.toFixed(2) ?? '—'}</td>
                  <td>${a.volumen?.toFixed(3) ?? '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = html;

  } catch (err) {
    console.error('[CEFO] Error al cargar detalle:', err);
    container.innerHTML = '<p style="text-align:center;color:var(--text-muted)">Error al cargar detalle</p>';
  }
}
