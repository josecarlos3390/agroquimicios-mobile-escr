import { getSalida, actualizarSalidaCabecera, buscarArboles, agregarLineasSalida, quitarLineaSalida, confirmarSalidaCab } from '../../../services/cefoSalida.service.js';
import { confirmar } from '../../../utils/confirm.js';

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

    if (e.target.closest('#btn-salida-editar-cabecera')) {
      mostrarFormularioEdicion();
      return;
    }

    if (e.target.closest('#btn-salida-cancelar-edicion')) {
      if (salidaIdActual) cargarDetalleSalida(salidaIdActual);
      return;
    }

    if (e.target.closest('#btn-salida-guardar-cabecera')) {
      await guardarEdicionCabecera();
      return;
    }

    if (e.target.closest('#btn-salida-confirmar')) {
      await confirmarDespacho();
      return;
    }
  });

  cont?.addEventListener('input', async (e) => {
    if (e.target.id === 'salida-buscar-arbol' || e.target.id === 'salida-filtro-faja' || e.target.id === 'salida-filtro-nro-arbol') {
      await ejecutarBusqueda();
    }
  });

  cont?.addEventListener('click', async (e) => {
    const item = e.target.closest('[data-rodeo-detalle-id]');
    if (item) {
      if (Number(item.dataset.despachado) === 1) {
        alert('Este árbol ya fue despachado en otro registro');
        return;
      }
      const id = parseInt(item.dataset.rodeoDetalleId);
      if (!id || isNaN(id)) {
        alert('Error: ID de árbol inválido');
        return;
      }
      if (lineasPendientes.some(l => l.rodeoDetalleId === id)) {
        alert('Este árbol ya fue agregado');
        return;
      }

      lineasPendientes.push({
        rodeoDetalleId: id,
        nroRodeo: item.dataset.nroRodeo,
        especie: item.dataset.especie,
        faja: item.dataset.faja ? parseInt(item.dataset.faja) : null,
        nroArbol: item.dataset.nroArbol,
        seccion: item.dataset.seccion,
        diamayor: item.dataset.diamayor ? parseFloat(item.dataset.diamayor) : null,
        diamenor: item.dataset.diamenor ? parseFloat(item.dataset.diamenor) : null,
        largo: item.dataset.largo ? parseFloat(item.dataset.largo) : null,
        volumen: item.dataset.volumen ? parseFloat(item.dataset.volumen) : null,
        paraTransporte: item.dataset.paraTransporte,
        rodeoNumero: item.dataset.rodeoNumero,
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
      return;
    }

    const btnQuitar = e.target.closest('[data-quitar-linea]');
    if (btnQuitar) {
      const ok = confirm('¿Quitar este árbol del despacho? Se liberará para usar en otro despacho.');
      if (!ok) return;
      await quitarLineaGuardada(
        salidaIdActual,
        parseInt(btnQuitar.dataset.quitarLinea),
        parseInt(btnQuitar.dataset.rodeoDetalleId)
      );
    }
  });
}

async function ejecutarBusqueda() {
  const termino = document.getElementById('salida-buscar-arbol')?.value?.trim() || '';
  const faja = document.getElementById('salida-filtro-faja')?.value?.trim() || '';
  const nroArbol = document.getElementById('salida-filtro-nro-arbol')?.value?.trim() || '';
  const resultados = document.getElementById('salida-resultados-arbol');

  if (termino.length < 2 && !faja && !nroArbol) {
    resultados.style.display = 'none';
    return;
  }

  try {
    const arboles = await buscarArboles({ termino: termino || null, faja: faja || null, nroArbol: nroArbol || null });
    renderResultadosArboles(arboles, resultados);
  } catch (err) {
    console.error('[MONTE] Error buscando árboles:', err);
  }
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

    const confirmado = cab.estado === 'CONFIRMADO';
    const badgeEstado = confirmado
      ? '<span style="display:inline-block;background:var(--success);color:#fff;padding:0.25rem 0.6rem;border-radius:1rem;font-size:0.75rem">✅ CONFIRMADO</span>'
      : '<span style="display:inline-block;background:var(--warning);color:#fff;padding:0.25rem 0.6rem;border-radius:1rem;font-size:0.75rem">📝 BORRADOR</span>';

    let html = `
      <div class="card" id="salida-cabecera-card">
        <div class="vista-header">
          <button type="button" id="btn-salida-detalle-volver" class="btn-volver">← Volver</button>
          <h3>🌲 ${cab.numero_completo}</h3>
          ${badgeEstado}
        </div>
        <div class="grid" style="margin-top:0.5rem">
          <label>Nro CFO Despacho <span class="detalle-info">${cab.nro_cfo_despacho}</span></label>
          <label>Fecha despacho <span class="detalle-info">${fecha}</span></label>
          <label>Placa <span class="detalle-info">${cab.placa || '—'}</span></label>
          <label>Chofer <span class="detalle-info">${cab.chofer || '—'}</span></label>
          <label>Total árboles <span class="detalle-info">${det.length}</span></label>
        </div>
        ${cab.observaciones ? `<label style="margin-top:0.5rem">Observaciones <span class="detalle-info">${cab.observaciones}</span></label>` : ''}
        ${!confirmado ? `
          <div style="margin-top:0.75rem; display:flex; gap:0.5rem">
            <button type="button" id="btn-salida-editar-cabecera" class="btn-secondary" style="flex:1; margin:0">✏️ Editar cabecera</button>
            <button type="button" id="btn-salida-confirmar" class="btn-primary" style="flex:1; margin:0">✅ Confirmar despacho</button>
          </div>
        ` : `
          <div style="margin-top:0.75rem; padding:0.75rem; background:rgba(40,167,69,0.1); border-radius:var(--radius-sm); color:var(--success); text-align:center; font-size:0.9rem">
            🔒 Despacho confirmado. No se permite editar ni eliminar.
          </div>
        `}
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
                  <th>Rodeo</th>
                  <th>Especie</th>
                  <th>Faja</th>
                  <th>Nro Árbol</th>
                  <th>Sección</th>
                  <th>D1</th>
                  <th>D2</th>
                  <th>Largo</th>
                  <th>Volumen</th>
                  ${!confirmado ? '<th></th>' : ''}
                </tr>
              </thead>
              <tbody>
                ${det.map((a, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td>${a.rodeo_numero || '—'}</td>
                    <td>${a.especie}</td>
                    <td>${a.faja ?? '—'}</td>
                    <td>${a.nro_arbol}</td>
                    <td>${a.seccion}</td>
                    <td>${a.diamayor?.toFixed(2) ?? '—'}</td>
                    <td>${a.diamenor?.toFixed(2) ?? '—'}</td>
                    <td>${a.largo?.toFixed(2) ?? '—'}</td>
                    <td>${a.volumen?.toFixed(3) ?? '—'}</td>
                    ${!confirmado ? `<td><button class="btn-icon" data-quitar-linea="${a.id}" data-rodeo-detalle-id="${a.rodeo_detalle_id}" title="Quitar">✖</button></td>` : ''}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    if (!confirmado) {
      html += `
        <div class="card">
          <h3>➕ Agregar árboles del Rodeo</h3>
          <label>Buscar árbol
            <input type="text" id="salida-buscar-arbol" placeholder="Código de rodeo, especie o nro árbol..." autocomplete="off">
          </label>
          <div class="grid" style="margin-top:0.5rem; grid-template-columns: 1fr 1fr;">
            <label>Fija
              <input type="text" id="salida-filtro-faja" placeholder="Ej: 5" autocomplete="off">
            </label>
            <label>Nro Árbol
              <input type="text" id="salida-filtro-nro-arbol" placeholder="Ej: 12" autocomplete="off">
            </label>
          </div>
          <div id="salida-resultados-arbol" style="display:none; margin-top:0.5rem; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--card); max-height:240px; overflow-y:auto;"></div>
          <button type="button" id="btn-salida-agregar-linea" class="btn-secondary" style="margin-top:0.75rem">🔍 Buscar árbol</button>
        </div>

        <div class="card">
          <h3>🌲 Árboles agregados</h3>
          <div id="salida-lineas-pendientes" style="overflow-x:auto">
            <p style="color:var(--text-muted);font-size:0.9rem">Sin líneas agregadas</p>
          </div>
          <button type="button" id="btn-salida-guardar-lineas" class="btn-primary" style="width:100%; margin-top:0.75rem" disabled>💾 Guardar líneas</button>
        </div>
      `;
    }

    container.innerHTML = html;
    renderLineasPendientes();

  } catch (err) {
    console.error('[MONTE] Error al cargar detalle:', err);
    container.innerHTML = '<p style="text-align:center;color:var(--text-muted)">Error al cargar detalle</p>';
  }
}

function mostrarFormularioEdicion() {
  const card = document.getElementById('salida-cabecera-card');
  if (!card || !salidaIdActual) return;

  const labels = card.querySelectorAll('label');
  let nroCfo = '';
  let fecha = '';
  let placa = '';
  let chofer = '';
  let observaciones = '';

  labels.forEach(lbl => {
    const txt = lbl.textContent;
    const val = lbl.querySelector('.detalle-info')?.textContent?.trim() || '';
    if (txt.includes('Nro CFO Despacho')) nroCfo = val;
    if (txt.includes('Fecha despacho')) {
      const parts = val.split('/');
      if (parts.length === 3) fecha = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    if (txt.includes('Placa') && !txt.includes('Nro CFO')) placa = val === '—' ? '' : val;
    if (txt.includes('Chofer')) chofer = val === '—' ? '' : val;
    if (txt.includes('Observaciones')) observaciones = val;
  });

  card.innerHTML = `
    <div class="vista-header">
      <button type="button" id="btn-salida-detalle-volver" class="btn-volver">← Volver</button>
      <h3>✏️ Editar Cabecera</h3>
    </div>
    <div class="grid" style="margin-top:0.5rem">
      <label>Nro CFO Despacho <input type="text" id="edit-salida-nro-cfo" class="input-upper" value="${nroCfo}" required></label>
      <label>Fecha despacho <input type="date" id="edit-salida-fecha" value="${fecha}"></label>
      <label>Placa <input type="text" id="edit-salida-placa" class="input-upper" value="${placa}"></label>
      <label>Chofer <input type="text" id="edit-salida-chofer" class="input-upper" value="${chofer}"></label>
    </div>
    <label style="margin-top:0.5rem">Observaciones <textarea id="edit-salida-observaciones" rows="2">${observaciones}</textarea></label>
    <div style="margin-top:0.75rem; display:flex; gap:0.5rem">
      <button type="button" id="btn-salida-guardar-cabecera" class="btn-primary" style="flex:1; margin:0">💾 Guardar</button>
      <button type="button" id="btn-salida-cancelar-edicion" class="btn-secondary" style="flex:1; margin:0">❌ Cancelar</button>
    </div>
  `;
}

async function guardarEdicionCabecera() {
  const btn = document.getElementById('btn-salida-guardar-cabecera');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Guardando...';
  }

  try {
    const nroCfo = document.getElementById('edit-salida-nro-cfo')?.value?.trim();
    const fecha = document.getElementById('edit-salida-fecha')?.value || null;
    const placa = document.getElementById('edit-salida-placa')?.value?.trim();
    const chofer = document.getElementById('edit-salida-chofer')?.value?.trim();
    const observaciones = document.getElementById('edit-salida-observaciones')?.value?.trim();

    if (!nroCfo) {
      alert('❌ El número de CFO de despacho es obligatorio');
      return;
    }

    await actualizarSalidaCabecera(salidaIdActual, {
      nroCfoDespacho: nroCfo,
      fechaDespacho: fecha,
      placa: placa,
      chofer: chofer,
      observaciones: observaciones,
    });

    mostrarToast('✅ Cabecera actualizada');
    await cargarDetalleSalida(salidaIdActual);
  } catch (err) {
    console.error('[MONTE] Error al actualizar cabecera:', err);
    alert('❌ ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '💾 Guardar';
    }
  }
}

function renderResultadosArboles(arboles, container) {
  if (arboles.length === 0) {
    container.innerHTML = '<div style="padding:0.5rem;color:var(--text-muted)">Sin resultados</div>';
    container.style.display = 'block';
    return;
  }

  container.innerHTML = arboles.map(a => {
    const usado = a.estado_uso !== 'DISPONIBLE';
    const badgeText = a.estado_uso === 'DESPACHADO' ? 'DESPACHADO' : a.estado_uso === 'RECEPCIONADO' ? 'RECEPCIONADO' : a.estado_uso === 'DESPACHO_ASERRADERO' ? 'DESP. ASERRADERO' : '';
    const style = usado ? 'background:var(--gray-200);opacity:0.6;pointer-events:none;' : '';
    return `
      <div class="buscar-resultado-item" style="${style}padding:0.5rem;border-bottom:1px solid var(--border);cursor:pointer;"
           data-rodeo-detalle-id="${a.id}" data-despachado="${usado ? 1 : 0}"
           data-nro-rodeo="${a.nro_rodeo ?? ''}" data-especie="${a.especie}" data-faja="${a.faja ?? ''}" data-nro-arbol="${a.nro_arbol}"
           data-seccion="${a.seccion}" data-diamayor="${a.d1 ?? ''}" data-diamenor="${a.d2 ?? ''}"
           data-largo="${a.largo ?? ''}" data-volumen="${a.volumen ?? ''}" data-para-transporte="${a.para_transporte ?? ''}"
           data-rodeo-numero="${a.rodeo_numero ?? ''}">
        <div><strong>${a.especie}</strong> · Faja ${a.faja ?? '—'} · Árbol ${a.nro_arbol} · Sec ${a.seccion}</div>
        <div style="font-size:0.78rem;color:var(--text-muted)">
          Rodeo: ${a.rodeo_numero ?? '—'} · Sector: ${a.sector_nombre ?? '—'} · Vol: ${a.volumen?.toFixed(3) ?? '—'} · ${a.para_transporte ?? ''}
          ${usado ? `<span style="color:var(--danger);margin-left:0.5rem">⚠️ ${badgeText}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
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
          <th>Rodeo</th>
          <th>Especie</th>
          <th>Faja</th>
          <th>Nro Árbol</th>
          <th>Sec</th>
          <th>Vol</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${lineasPendientes.map((l, i) => `
          <tr>
            <td>${l.rodeoNumero || '—'}</td>
            <td>${l.especie}</td>
            <td>${l.faja ?? '—'}</td>
            <td>${l.nroArbol}</td>
            <td>${l.seccion}</td>
            <td>${l.volumen?.toFixed(3) ?? '—'}</td>
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
    mostrarToast('✅ Líneas guardadas');
  } catch (err) {
    alert('❌ ' + err.message);
    btn.disabled = false;
    btn.textContent = '💾 Guardar líneas';
  }
}

async function quitarLineaGuardada(salidaId, salidaDetalleId, rodeoDetalleId) {
  try {
    await quitarLineaSalida(salidaId, salidaDetalleId, rodeoDetalleId);
    mostrarToast('✅ Árbol quitado del despacho');
    await cargarDetalleSalida(salidaIdActual);
  } catch (err) {
    console.error('[MONTE] Error al quitar línea:', err);
    alert('❌ ' + err.message);
  }
}

async function confirmarDespacho() {
  if (!salidaIdActual) return;
  const ok = await confirmar({
    icon: '✅',
    titulo: '¿Confirmar despacho?',
    msg: 'Una vez confirmado no podrás editar ni eliminar este despacho ni sus árboles.',
  });
  if (!ok) return;

  const btn = document.getElementById('btn-salida-confirmar');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Confirmando...';
  }

  try {
    await confirmarSalidaCab(salidaIdActual);
    mostrarToast('✅ Despacho confirmado');
    await cargarDetalleSalida(salidaIdActual);
  } catch (err) {
    console.error('[MONTE] Error al confirmar despacho:', err);
    alert('❌ ' + err.message);
    if (btn) {
      btn.disabled = false;
      btn.textContent = '✅ Confirmar despacho';
    }
  }
}

function mostrarToast(mensaje) {
  const toast = document.createElement('div');
  toast.textContent = mensaje;
  toast.style.cssText = `
    position:fixed; bottom:5rem; left:50%; transform:translateX(-50%);
    background:rgba(30,61,30,0.92); color:#fff; padding:0.6rem 1.2rem;
    border-radius:2rem; font-size:0.85rem; z-index:9999;
    box-shadow:0 4px 16px rgba(0,0,0,0.3);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
