import { getEmpresaActiva } from '../../../services/empresas.service.js';
import { crearAsignacionCombustible, obtenerAsignacion, actualizarAsignacionCombustible, aplicarMarcaAgua } from '../services/combustible.service.js';
import { formatFecha } from '../../../utils/fecha.js';

let inicializado = false;
let fotoBase64 = null;
let modoEdicion = false;
let asignacionEditandoId = null;

export function initNuevaAsignacionCombustibleView() {
  if (inicializado) return;
  inicializado = true;

  document.getElementById('btn-combustible-volver').onclick = () => {
    modoEdicion = false;
    asignacionEditandoId = null;
    window.showView('combustible-registros');
  };

  document.getElementById('btn-tomar-foto').addEventListener('click', () => {
    document.getElementById('input-foto-combustible').click();
  });

  document.getElementById('input-foto-combustible').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const hoy = new Date();
        const fechaTexto = [
          String(hoy.getDate()).padStart(2, '0'),
          String(hoy.getMonth() + 1).padStart(2, '0'),
          hoy.getFullYear(),
        ].join('/');
        const horaTexto = [
          String(hoy.getHours()).padStart(2, '0'),
          String(hoy.getMinutes()).padStart(2, '0'),
        ].join(':');
        const marca = `AgroApp - ${fechaTexto} ${horaTexto}`;

        const conMarca = await aplicarMarcaAgua(reader.result, marca);
        fotoBase64 = conMarca;

        const preview = document.getElementById('foto-preview');
        preview.innerHTML = `<img src="${conMarca}" alt="Vista previa" style="width:100%;max-height:220px;object-fit:cover;border-radius:8px;border:2px solid var(--accent)">`;
        document.getElementById('btn-tomar-foto').textContent = '📸 Cambiar foto';
      } catch (err) {
        alert('❌ Error al procesar la foto: ' + err.message);
      }
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('form-combustible-asignacion').addEventListener('submit', async e => {
    e.preventDefault();
    await guardarAsignacion();
  });
}

export async function cargarNuevaAsignacion() {
  modoEdicion = false;
  asignacionEditandoId = null;
  fotoBase64 = null;

  document.getElementById('form-combustible-asignacion').reset();

  const hoy = new Date();
  const fechaHoy = [hoy.getFullYear(), String(hoy.getMonth()+1).padStart(2,'0'), String(hoy.getDate()).padStart(2,'0')].join('-');
  document.getElementById('combustible-fecha').value = fechaHoy;

  const activa = getEmpresaActiva();
  const empresaSel = document.getElementById('combustible-empresa-select');
  if (activa) {
    empresaSel.innerHTML = `<option value="${activa.id}">${activa.nombre}</option>`;
    empresaSel.value = activa.id;
    empresaSel.disabled = true;
  }

  document.getElementById('foto-preview').innerHTML = '';
  document.getElementById('btn-tomar-foto').textContent = '📸 Tomar foto';

  const header = document.querySelector('#view-combustible-nuevo h3');
  if (header) header.textContent = '⛽ Nueva asignación de combustible';

  const btn = document.querySelector('#form-combustible-asignacion button[type="submit"]');
  if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar asignación'; }
}

export async function cargarEdicionAsignacion(id) {
  modoEdicion = true;
  asignacionEditandoId = id;
  fotoBase64 = null;

  document.getElementById('form-combustible-asignacion').reset();

  const data = await obtenerAsignacion(id);
  if (!data) {
    alert('No se encontró la asignación');
    window.showView('combustible-registros');
    return;
  }

  document.getElementById('combustible-fecha').value = data.fecha ?? '';
  document.getElementById('combustible-placa').value = data.placa_codigo ?? '';
  document.getElementById('combustible-recibe').value = data.persona_recibe ?? '';
  document.getElementById('combustible-entrega').value = data.persona_entrega ?? '';
  document.getElementById('combustible-cantidad').value = data.cantidad ?? '';
  document.getElementById('combustible-tipo').value = data.tipo_combustible ?? 'DIESEL';
  document.getElementById('combustible-horometro').value = data.horometro ?? '';
  document.getElementById('combustible-observaciones').value = data.observaciones ?? '';

  const empresaSel = document.getElementById('combustible-empresa-select');
  empresaSel.innerHTML = `<option value="${data.empresa_id}">${data.empresa_nombre}</option>`;
  empresaSel.value = data.empresa_id;
  empresaSel.disabled = true;

  if (data.foto_base64) {
    fotoBase64 = data.foto_base64;
    document.getElementById('foto-preview').innerHTML = `<img src="${data.foto_base64}" alt="Vista previa" style="width:100%;max-height:220px;object-fit:cover;border-radius:8px;border:2px solid var(--accent)">`;
    document.getElementById('btn-tomar-foto').textContent = '📸 Cambiar foto';
  } else {
    document.getElementById('foto-preview').innerHTML = '';
    document.getElementById('btn-tomar-foto').textContent = '📸 Tomar foto';
  }

  const header = document.querySelector('#view-combustible-nuevo h3');
  if (header) header.textContent = '✏️ Editar asignación de combustible';

  const btn = document.querySelector('#form-combustible-asignacion button[type="submit"]');
  if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar cambios'; }
}

async function guardarAsignacion() {
  const val = id => document.getElementById(id).value.trim().toUpperCase();
  const valRaw = id => document.getElementById(id).value.trim();

  const fecha       = valRaw('combustible-fecha');
  const placa       = val('combustible-placa');
  const recibe      = val('combustible-recibe');
  const entrega     = val('combustible-entrega');
  const cantidad    = parseFloat(valRaw('combustible-cantidad'));
  const tipo        = valRaw('combustible-tipo');
  const empresaId   = valRaw('combustible-empresa-select');
  const horometro   = parseFloat(valRaw('combustible-horometro')) || null;
  const obs         = valRaw('combustible-observaciones');

  if (!fecha)    { alert('La fecha es obligatoria'); return; }
  if (!placa)    { alert('La placa o código es obligatorio'); return; }
  if (!recibe)   { alert('La persona que recibe es obligatoria'); return; }
  if (!entrega)  { alert('La persona que entrega es obligatoria'); return; }
  if (!cantidad || cantidad <= 0) { alert('La cantidad debe ser mayor a 0'); return; }
  if (!tipo)     { alert('El tipo de combustible es obligatorio'); return; }

  const btn = document.querySelector('#form-combustible-asignacion button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Guardando...';

  try {
    const payload = {
      empresa_id: empresaId || null,
      fecha,
      placa_codigo: placa,
      persona_recibe: recibe,
      persona_entrega: entrega,
      cantidad,
      tipo_combustible: tipo,
      horometro,
      foto_base64: fotoBase64,
      observaciones: obs || null,
    };

    if (modoEdicion && asignacionEditandoId) {
      await actualizarAsignacionCombustible(asignacionEditandoId, payload);
    } else {
      await crearAsignacionCombustible(payload);
    }

    modoEdicion = false;
    asignacionEditandoId = null;
    window.showView('combustible-registros');
  } catch (err) {
    alert('❌ ' + err.message);
    btn.disabled = false;
    btn.textContent = modoEdicion ? '💾 Guardar cambios' : '💾 Guardar asignación';
  }
}

export async function cargarDetalleCombustible(id) {
  const cont = document.getElementById('combustible-detalle-contenido');
  const data = await obtenerAsignacion(id);
  if (!data) { cont.innerHTML = '<p style="text-align:center;color:var(--text-muted)">No se encontró la asignación</p>'; return; }

  document.getElementById('btn-combustible-detalle-volver').onclick = () => {
    window.showView('combustible-registros');
  };

  cont.innerHTML = `
    <div class="card">
      <div class="hoja-card-header">
        <span class="hoja-numero">${data.numero_completo ?? '—'}</span>
        <span class="hoja-estado hoja-estado--${data.estado.toLowerCase()}">${data.estado}</span>
      </div>
      <div class="detalle-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-top:0.75rem">
        <div class="detalle-info"><strong>Propiedad:</strong> ${data.empresa_nombre ?? '—'}</div>
        <div class="detalle-info"><strong>Fecha:</strong> ${formatFecha(data.fecha)}</div>
        <div class="detalle-info"><strong>Placa/Código:</strong> ${data.placa_codigo}</div>
        <div class="detalle-info"><strong>Combustible:</strong> ${data.tipo_combustible}</div>
        <div class="detalle-info"><strong>Cantidad:</strong> ${data.cantidad} Litros</div>
        ${data.horometro ? `<div class="detalle-info"><strong>Horómetro:</strong> ${data.horometro} Km</div>` : ''}
        <div class="detalle-info"><strong>Recibe:</strong> ${data.persona_recibe}</div>
        <div class="detalle-info"><strong>Entrega:</strong> ${data.persona_entrega}</div>
      </div>
      ${data.observaciones ? `<div class="detalle-info" style="margin-top:0.75rem"><strong>Observaciones:</strong> ${data.observaciones}</div>` : ''}
    </div>
    ${data.foto_base64 ? `
    <div class="card">
      <h4 style="margin:0 0 0.5rem">📸 Evidencia</h4>
      <img src="${data.foto_base64}" alt="Foto evidencia" style="width:100%;max-height:400px;object-fit:contain;border-radius:8px;border:1px solid var(--border)">
    </div>` : ''}
  `;
}
