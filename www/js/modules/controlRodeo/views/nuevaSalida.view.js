import { crearSalida, buscarArboles } from '../../../services/cefoSalida.service.js';

let inicializado = false;
let lineas = [];

export function initNuevaSalidaView() {
  if (inicializado) return;
  inicializado = true;

  const form = document.getElementById('form-salida');
  const btnAgregar = document.getElementById('btn-salida-agregar-linea');
  const btnGuardar = document.getElementById('btn-salida-guardar');
  const btnVolver = document.getElementById('btn-salida-volver');
  const buscarInput = document.getElementById('salida-buscar-arbol');
  const resultadosDiv = document.getElementById('salida-resultados-arbol');

  btnVolver?.addEventListener('click', () => {
    window.showView('control-rodeo-salida-registros');
  });

  btnAgregar?.addEventListener('click', () => {
    buscarInput.value = '';
    resultadosDiv.innerHTML = '';
    resultadosDiv.style.display = 'none';
    buscarInput.focus();
  });

  buscarInput?.addEventListener('input', async () => {
    const t = buscarInput.value.trim();
    if (t.length < 2) {
      resultadosDiv.style.display = 'none';
      return;
    }
    try {
      const arboles = await buscarArboles(t);
      renderResultadosArboles(arboles, resultadosDiv);
    } catch (err) {
      console.error('[SALIDA] Error buscando árboles:', err);
    }
  });

  resultadosDiv?.addEventListener('click', (e) => {
    const item = e.target.closest('[data-arbol-id]');
    if (!item) return;

    const id = parseInt(item.dataset.arbolId);
    if (lineas.some(l => l.cefoDetalleId === id)) {
      alert('Este árbol ya fue agregado');
      return;
    }

    lineas.push({
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

    resultadosDiv.style.display = 'none';
    buscarInput.value = '';
    renderLineas();
  });

  document.getElementById('salida-lineas-container')?.addEventListener('click', (e) => {
    if (e.target.closest('[data-remove]')) {
      const idx = parseInt(e.target.closest('[data-remove]').dataset.remove);
      lineas.splice(idx, 1);
      renderLineas();
    }
  });

  btnGuardar?.addEventListener('click', async () => {
    if (lineas.length === 0) {
      alert('Agregá al menos una línea');
      return;
    }

    btnGuardar.disabled = true;
    btnGuardar.textContent = '⏳ Guardando...';

    try {
      await crearSalida({
        nroCfoDespacho: document.getElementById('salida-nro-cfo').value,
        fechaDespacho: document.getElementById('salida-fecha').value,
        placa: document.getElementById('salida-placa').value,
        chofer: document.getElementById('salida-chofer').value,
        lineas,
      });

      form.reset();
      lineas = [];
      renderLineas();
      window.showView('control-rodeo-salida-registros');

    } catch (err) {
      alert('❌ ' + err.message);
    } finally {
      btnGuardar.disabled = false;
      btnGuardar.textContent = '💾 Guardar despacho';
    }
  });
}

export function cargarNuevaSalida() {
  lineas = [];
  renderLineas();
  document.getElementById('form-salida')?.reset();
  document.getElementById('salida-resultados-arbol').style.display = 'none';
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

function renderLineas() {
  const container = document.getElementById('salida-lineas-container');
  if (!container) return;

  if (lineas.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem">Sin líneas agregadas</p>';
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
        ${lineas.map((l, i) => `
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
}
