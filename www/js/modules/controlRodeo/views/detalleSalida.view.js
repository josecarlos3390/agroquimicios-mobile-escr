import { getSalida, buscarArboles, agregarLineasSalida } from '../../../services/cefoSalida.service.js';

let inicializado = false;
let lineasPendientes = [];
let salidaIdActual = null;

export function initDetalleSalidaView() {
  if (inicializado) return;
  inicializado = true;

  const cont = document.getElementById('salida-detalle-contenido');

  cont?.addEventListener('click', async (e) => {
    if (e.target.closest('#btn-salida-detalle-volver')) {
      window.showView('control-rodeo-salida-registros');
      return;
    }

    if (e.target.closest('#btn-salida-agregar-linea')) {
      const input = document.getElementById('salida-buscar-arbol');
      const resultados = document.getElementById('salida-resultados-arbol');
      input.value = '';
      resultados.innerHTML = '';
      resultados.style.display = 'none';
      input.focus();
      return;
    }

    if (e.target.closest('#btn-salida-guardar-lineas')) {
      await guardarLineas();
      return;
    }
  });

  cont?.addEventListener('input', async (e) => {
    if (e.target.id === 'salida-buscar-arbol') {
      const t = e.target.value.trim();
      const resultados = document.getElementById('salida-resultados-arbol');
      if (t.length < 2) {
        resultados.style.display = 'none';
        return;
      }
      try {
        const arboles = await buscarArboles(t);
        renderResultadosArboles(arboles, resultados);
      } catch (err) {
        console.error('[SALIDA] Error buscando árboles:', err);
      }
    }
  });

  cont?.addEventListener('click', (e) => {
    const item = e.target.closest('[data-arbol-id]');
    if (item) {
      const id = parseInt(item.dataset.arbolId);
      if (lineasPendientes.some(l => l.cefoDetalleId === id)) {
        alert('Este árbol ya fue agregado');
        return;
      }

      lineasPendientes.push({
        cefoDetalleId: id,
        especie: item.dataset.especie,
        faja: item.dataset.faja ? parseInt(item.dataset.faja) : null,
        nroArbol: item.dataset.nroArbol,
        seccion: item.dataset.seccion,
        diamayor: item.dataset.diamayor ? parseFloat(item.dataset.diamayor) : null,
        diamenor: item.dataset.diamenor ? parseFloat(item.dataset.diamenor) : null,
        largo: item.dataset.largo ? parseFloat(item.dataset.largo) : null,
        volumen: item.dataset.volumen ? parseFloat(item.dataset.volumen) : null,
        nroCfoRecib: item.dataset.nroCfoRecib,
      });

      document.getElementById('salida-resultados-arbol').style.display = 'none';
      document.getElementById('salida-buscar-arbol').value = '';
      renderLineasPendientes();
      return;
    }

    const btnRemove = e.target.closest('[data-remove]');
    if (btnRemove) {
      const idx = parseInt(btnRemove.dataset.remove);
      lineasPendientes.splice(idx, 1);
      renderLineasPendientes();
    }
  });
}

export async function cargarDetalleSalida(id) {
  salidaIdActual = id;
  lineasPendientes = [];
  const container = document.getElementById('salida-detalle-contenido');
  container.innerHTML = '<p style="text-align:center;color:var(--text-muted)">Cargando...</p>';

  try {
    const data = await getSalida(id);
    if (!data) {
      container.innerHTML = '<p style="text-align:center;color:var(--text-muted)">Despacho no encontrado</p>';
      return;
    }

    const cab = data.cabecera;
    const det = data.detalle;

    const fecha = cab.fecha_despacho
      ? new Date(cab.fecha_despacho).toLocaleDateString('es-ES')
      : '—';

    let html = `
      <div class="card">
        <div class="vista-header">
          <button type="button" id="btn-salida-detalle-volver" class="btn-volver">← Volver</button>
          <h3>📦 ${cab.numero_completo}</h3>
        </div>
        <div class="grid" style="margin-top:0.5rem">
          <label>Nro CFO Despacho <span class="detalle-info">${cab.nro_cfo_despacho}</span></label>
          <label>Fecha despacho <span class="detalle-info">${fecha}</span></label>
          <label>Placa <span class="detalle-info">${cab.placa || '—'}</span></label>
          <label>Chofer <span class="detalle-info">${cab.chofer || '—'}</span></label>
          <label>Total árboles <span class="detalle-info">${det.length}</span></label>
        </div>
        ${cab.observaciones ? `<label style="margin-top:0.5rem">Observaciones <span class="detalle-info">${cab.observaciones}</span></label>` : ''}
      </div>
    `;

    if (det.length > 0) {
      html += `
        <div class="card">
          <h3>🌲 Árboles despachados</h3>
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
    }

    html += `
      <div class="card">
        <h3>➕ Agregar árboles</h3>
        <label>Buscar árbol disponible
          <input type="text" id="salida-buscar-arbol" placeholder="Escribí especie, nro árbol o CFO..." autocomplete="off">
        </label>
        <div id="salida-resultados-arbol" style="display:none; margin-top:0.5rem; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--card); max-height:200px; overflow-y:auto;"></div>
        <button type="button" id="btn-salida-agregar-linea" class="btn-secondary" style="margin-top:0.75rem">🔍 Buscar árbol</button>
      </div>

      <div class="card">
        <h3>🌲 Árboles agregados</h3>
        <div id="salida-lineas-pendientes">
          <p style="color:var(--text-muted);font-size:0.9rem">Sin líneas agregadas</p>
        </div>
        <button type="button" id="btn-salida-guardar-lineas" class="btn-primary" style="width:100%; margin-top:0.75rem" disabled>💾 Guardar líneas</button>
      </div>
    `;

    container.innerHTML = html;
    renderLineasPendientes();

  } catch (err) {
    console.error('[SALIDA] Error al cargar detalle:', err);
    container.innerHTML = '<p style="text-align:center;color:var(--text-muted)">Error al cargar detalle</p>';
  }
}

function renderResultadosArboles(arboles, container) {
  if (arboles.length === 0) {
    container.innerHTML = '<div style="padding:0.5rem;color:var(--text-muted)">Sin resultados</div>';
    container.style.display = 'block';
    return;
  }

  container.innerHTML = arboles.map(a => `
    <div class="buscar-resultado-item" data-arbol-id="${a.id}"
         data-especie="${a.especie}" data-faja="${a.faja ?? ''}" data-nro-arbol="${a.nro_arbol}"
         data-seccion="${a.seccion}" data-diamayor="${a.diamayor ?? ''}" data-diamenor="${a.diamenor ?? ''}"
         data-largo="${a.largo ?? ''}" data-volumen="${a.volumen ?? ''}" data-nro-cfo-recib="${a.nro_cfo_recib}">
      <div><strong>${a.especie}</strong> · Faja ${a.faja ?? '—'} · Árbol ${a.nro_arbol} · Sec ${a.seccion}</div>
      <div style="font-size:0.78rem;color:var(--text-muted)">CFO: ${a.nro_cfo_recib} · Vol: ${a.volumen?.toFixed(3) ?? '—'}</div>
    </div>
  `).join('');
  container.style.display = 'block';
}

function renderLineasPendientes() {
  const container = document.getElementById('salida-lineas-pendientes');
  const btnGuardar = document.getElementById('btn-salida-guardar-lineas');
  if (!container) return;

  if (lineasPendientes.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem">Sin líneas agregadas</p>';
    if (btnGuardar) btnGuardar.disabled = true;
    return;
  }

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Especie</th>
          <th>Faja</th>
          <th>Nro Árbol</th>
          <th>Sec</th>
          <th>Vol</th>
          <th>CFO Recib</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${lineasPendientes.map((l, i) => `
          <tr>
            <td>${l.especie}</td>
            <td>${l.faja ?? '—'}</td>
            <td>${l.nroArbol}</td>
            <td>${l.seccion}</td>
            <td>${l.volumen?.toFixed(3) ?? '—'}</td>
            <td>${l.nroCfoRecib}</td>
            <td><button data-remove="${i}" class="btn-icon" title="Quitar">✖</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  if (btnGuardar) btnGuardar.disabled = false;
}

async function guardarLineas() {
  if (lineasPendientes.length === 0 || !salidaIdActual) return;

  const btn = document.getElementById('btn-salida-guardar-lineas');
  btn.disabled = true;
  btn.textContent = '⏳ Guardando...';

  try {
    await agregarLineasSalida(salidaIdActual, lineasPendientes);
    lineasPendientes = [];
    await cargarDetalleSalida(salidaIdActual);

    const toast = document.createElement('div');
    toast.textContent = '✅ Líneas guardadas';
    toast.style.cssText = `
      position:fixed; bottom:5rem; left:50%; transform:translateX(-50%);
      background:rgba(30,61,30,0.92); color:#fff; padding:0.6rem 1.2rem;
      border-radius:2rem; font-size:0.85rem; z-index:9999;
      box-shadow:0 4px 16px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);

  } catch (err) {
    alert('❌ ' + err.message);
    btn.disabled = false;
    btn.textContent = '💾 Guardar líneas';
  }
}
