import {
  crearGuiaTransporte,
  actualizarGuiaTransporte,
  obtenerGuia,
  aplicarMarcaAgua,
} from '../services/guiaTransporteCana.service.js';
import { getEmpresaActiva } from '../../../services/empresas.service.js';
import { crearBotonEscanear } from '../../../utils/barcode.js';
import { formatFecha } from '../../../utils/fecha.js';

let inicializado = false;
let _modoEdicion = false;
let _idEdicion = null;

/* =========================================================
   INIT
========================================================= */
export function initNuevaGuiaTransporteView() {
  if (inicializado) return;
  inicializado = true;

  const section = document.getElementById('view-guia-transporte-nuevo');
  if (!section) return;

  initAcordeon(section);
  initScanInputs(section);
  initGrillaSelector(section);
  initCosechadorasDinamicas(section);
  initFotos(section);
  initFormulario(section);

  document.getElementById('btn-guia-transporte-nuevo-volver')?.addEventListener('click', () => {
    window.showView('guia-transporte-registros');
  });
}

/* =========================================================
   ACORDEÓN
========================================================= */
function initAcordeon(section) {
  section.querySelectorAll('.acordeon-header').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const body = document.getElementById(targetId);
      const estaAbierto = btn.classList.contains('abierto');

      if (estaAbierto) {
        btn.classList.remove('abierto');
        body?.classList.remove('abierto');
      } else {
        btn.classList.add('abierto');
        body?.classList.add('abierto');
      }
    });
  });
}

/* =========================================================
   SCAN INPUTS
========================================================= */
function initScanInputs(section) {
  const camposScan = [
    { input: 'gt-cod-liberacion' },
    { input: 'gt-cod-chofer' },
    { input: 'gt-cod-camion' },
    { input: 'gt-cod-chata' },
    { input: 'gt-cod-cargadora' },
    { input: 'gt-cod-operadora' },
    { input: 'gt-cod-tractor-chata' },
    { input: 'gt-cod-tractorista' },
  ];

  camposScan.forEach(({ input }) => {
    const wrap = section.querySelector(`#wrap-${input}`);
    const inp = section.querySelector(`#${input}`);
    if (!wrap || !inp) return;

    const { extra } = crearBotonEscanear(input, valor => {
      inp.value = valor;
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
    if (extra) wrap.appendChild(extra);
  });
}

/* =========================================================
   GRILLA SELECTOR 2×3
========================================================= */
function initGrillaSelector(section) {
  section.addEventListener('click', e => {
    const celda = e.target.closest('.grilla-celda');
    if (!celda) return;
    const fila = celda.closest('.cosechadora-card');
    if (!fila) return;

    fila.querySelectorAll('.grilla-celda').forEach(c => c.classList.remove('seleccionada'));
    celda.classList.add('seleccionada');
  });
}

function obtenerGrillaSeleccionada(fila) {
  const sel = fila.querySelector('.grilla-celda.seleccionada');
  return sel ? sel.dataset.valor : null;
}

/* =========================================================
   COSECHADORAS DINÁMICAS
========================================================= */
let contadorCosechadoras = 0;

function initCosechadorasDinamicas(section) {
  const btnAgregar = section.querySelector('#btn-agregar-cosechadora');
  const contenedor = section.querySelector('#gt-cosechadoras-container');
  if (!btnAgregar || !contenedor) return;

  btnAgregar.addEventListener('click', () => {
    agregarCosechadora(contenedor);
  });
}

function agregarCosechadora(contenedor, datos = null) {
  contadorCosechadoras++;
  const num = datos?.numero_cosechadora ?? contadorCosechadoras;
  const id = `cosechadora-${num}`;

  const div = document.createElement('div');
  div.className = 'cosechadora-card';
  div.dataset.numero = String(num);
  div.innerHTML = `
    <div class="cosechadora-card-header">
      <div style="display:flex;align-items:center">
        <span class="cosechadora-card-numero">${num}</span>
        <span>Cosechadora Mecanizada</span>
      </div>
      <button type="button" class="btn-eliminar-cosechadora" style="background:none;border:none;color:var(--danger);font-size:1rem;cursor:pointer" title="Eliminar">✕</button>
    </div>

    <div class="grilla-selector">
      <div class="grilla-celda ${datos?.grilla_seleccion === '1/2' ? 'seleccionada' : ''}" data-valor="1/2">1/2</div>
      <div class="grilla-celda ${datos?.grilla_seleccion === '1' ? 'seleccionada' : ''}" data-valor="1">1</div>
      <div class="grilla-celda ${datos?.grilla_seleccion === '2' ? 'seleccionada' : ''}" data-valor="2">2</div>
      <div class="grilla-celda ${datos?.grilla_seleccion === '3' ? 'seleccionada' : ''}" data-valor="3">3</div>
      <div class="grilla-celda ${datos?.grilla_seleccion === '4' ? 'seleccionada' : ''}" data-valor="4">4</div>
      <div class="grilla-celda ${datos?.grilla_seleccion === '5' ? 'seleccionada' : ''}" data-valor="5">5</div>
    </div>

    <div class="grid">
      <label>Cód. Cosechadora
        <div class="input-scan-wrap" id="wrap-${id}-cosechadora">
          <input type="text" id="${id}-cosechadora" placeholder="Escaneá o escribí" value="${datos?.cod_cosechadora || ''}">
        </div>
      </label>
      <label>Cód. Operador
        <div class="input-scan-wrap" id="wrap-${id}-operador">
          <input type="text" id="${id}-operador" placeholder="Escaneá o escribí" value="${datos?.cod_operador || ''}">
        </div>
      </label>
      <label>Cód. Tractor Transbordo
        <div class="input-scan-wrap" id="wrap-${id}-transbordo">
          <input type="text" id="${id}-transbordo" placeholder="Escaneá o escribí" value="${datos?.cod_tractor_transbordo || ''}">
        </div>
      </label>
      <label>Cód. Tractorista
        <div class="input-scan-wrap" id="wrap-${id}-tractorista">
          <input type="text" id="${id}-tractorista" placeholder="Escaneá o escribí" value="${datos?.cod_tractorista || ''}">
        </div>
      </label>
    </div>
  `;

  contenedor.appendChild(div);

  const campos = ['cosechadora', 'operador', 'transbordo', 'tractorista'];
  campos.forEach(campo => {
    const wrap = div.querySelector(`#wrap-${id}-${campo}`);
    const inp = div.querySelector(`#${id}-${campo}`);
    if (!wrap || !inp) return;
    const { extra } = crearBotonEscanear(`${id}-${campo}`, valor => {
      inp.value = valor;
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
    if (extra) wrap.appendChild(extra);
  });

  div.querySelector('.btn-eliminar-cosechadora')?.addEventListener('click', () => {
    div.remove();
    reenumerarCosechadoras(contenedor);
  });
}

function reenumerarCosechadoras(contenedor) {
  const cards = contenedor.querySelectorAll('.cosechadora-card');
  cards.forEach((card, idx) => {
    const nuevoNum = idx + 1;
    card.dataset.numero = String(nuevoNum);
    const badge = card.querySelector('.cosechadora-card-numero');
    if (badge) badge.textContent = String(nuevoNum);
  });
  contadorCosechadoras = cards.length;
}

/* =========================================================
   FOTOS
========================================================= */
function renderPreviewFoto(container, base64) {
  container.dataset.base64 = base64;
  container.innerHTML = `
    <div style="position:relative;display:inline-block;width:100%">
      <img src="${base64}" style="width:100%;border-radius:var(--radius-sm);max-height:220px;object-fit:cover;display:block">
      <button type="button" class="btn-quitar-foto" style="position:absolute;top:0.4rem;right:0.4rem;background:rgba(0,0,0,0.6);color:#fff;border:none;border-radius:50%;width:2rem;height:2rem;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center">
        🗑️
      </button>
    </div>
  `;
}

function initFotos(section) {
  const campos = [
    { btn: 'btn-foto-camion', input: 'input-foto-camion', preview: 'foto-camion-preview', texto: 'FOTO CAMION' },
    { btn: 'btn-foto-semi', input: 'input-foto-semi', preview: 'foto-semi-preview', texto: 'FOTO SEMI' },
  ];

  campos.forEach(({ btn, input, preview, texto }) => {
    const b = section.querySelector(`#${btn}`);
    const i = section.querySelector(`#${input}`);
    const p = section.querySelector(`#${preview}`);
    if (!b || !i || !p) return;

    b.addEventListener('click', () => i.click());

    i.addEventListener('change', async () => {
      const file = i.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async e => {
        try {
          const conMarca = await aplicarMarcaAgua(e.target.result, texto);
          renderPreviewFoto(p, conMarca);
        } catch (err) {
          console.error('[GUIA-TRANSPORTE] Error marca de agua:', err);
          renderPreviewFoto(p, e.target.result);
        }
      };
      reader.readAsDataURL(file);
    });

    // Delegación para botón quitar foto dentro del preview
    p.addEventListener('click', e => {
      const btnQuitar = e.target.closest('.btn-quitar-foto');
      if (!btnQuitar) return;
      p.removeAttribute('data-base64');
      p.innerHTML = '';
    });
  });
}

/* =========================================================
   FORMULARIO
========================================================= */
function initFormulario(section) {
  const form = section.querySelector('#form-guia-transporte');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const textoOriginal = btn?.textContent;

    try {
      if (btn) { btn.disabled = true; btn.textContent = '⏳ Guardando...'; }

      const empresa = getEmpresaActiva();
      const fecha = section.querySelector('#gt-fecha')?.value;
      if (!fecha) throw new Error('La fecha es obligatoria');

      const boletario = section.querySelector('#gt-boletario')?.value?.trim();
      if (!boletario) throw new Error('El nombre del boletario es obligatorio');

      const data = {
        empresa_id: empresa?.id ?? null,
        fecha,
        hora_llegada: section.querySelector('#gt-hora-llegada')?.value || null,
        hora_salida: section.querySelector('#gt-hora-salida')?.value || null,
        hora_llegada_cola: section.querySelector('#gt-hora-cola')?.value || null,
        boletario,
        turno: section.querySelector('#gt-turno')?.value?.trim().toUpperCase() || null,
        frente: section.querySelector('#gt-frente')?.value?.trim().toUpperCase() || null,
        propiedad: section.querySelector('#gt-propiedad')?.value?.trim().toUpperCase() || null,
        observaciones: section.querySelector('#gt-observaciones')?.value?.trim().toUpperCase() || null,

        cod_liberacion: section.querySelector('#gt-cod-liberacion')?.value?.trim().toUpperCase() || null,

        cod_chofer: section.querySelector('#gt-cod-chofer')?.value?.trim().toUpperCase() || null,
        nombre_chofer: section.querySelector('#gt-nombre-chofer')?.value?.trim().toUpperCase() || null,
        cod_camion: section.querySelector('#gt-cod-camion')?.value?.trim().toUpperCase() || null,
        placa: section.querySelector('#gt-placa')?.value?.trim().toUpperCase() || null,
        cod_chata: section.querySelector('#gt-cod-chata')?.value?.trim().toUpperCase() || null,
        transportista: section.querySelector('#gt-transportista')?.value?.trim().toUpperCase() || null,
        foto_camion_base64: document.getElementById('foto-camion-preview')?.dataset?.base64 || null,

        cod_cargadora: section.querySelector('#gt-cod-cargadora')?.value?.trim().toUpperCase() || null,
        cod_operadora: section.querySelector('#gt-cod-operadora')?.value?.trim().toUpperCase() || null,
        cod_tractor_chata: section.querySelector('#gt-cod-tractor-chata')?.value?.trim().toUpperCase() || null,
        cod_tractorista: section.querySelector('#gt-cod-tractorista')?.value?.trim().toUpperCase() || null,
        foto_semi_base64: document.getElementById('foto-semi-preview')?.dataset?.base64 || null,

        cosechas_mecanizadas: obtenerCosechasMecanizadas(),
      };

      if (_modoEdicion && _idEdicion) {
        await actualizarGuiaTransporte(_idEdicion, data);
        alert('✅ Guía actualizada');
      } else {
        await crearGuiaTransporte(data);
        alert('✅ Guía creada');
      }

      limpiarFormulario(section);
      window.showView('guia-transporte-registros');
    } catch (err) {
      alert('❌ ' + err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = textoOriginal || '📌 Guardar guía'; }
    }
  });
}

function obtenerCosechasMecanizadas() {
  const contenedor = document.getElementById('gt-cosechadoras-container');
  if (!contenedor) return [];

  return [...contenedor.querySelectorAll('.cosechadora-card')]
    .map(card => ({
      numero_cosechadora: parseInt(card.dataset.numero, 10) || 1,
      grilla_seleccion: obtenerGrillaSeleccionada(card),
      cod_cosechadora: card.querySelector('input[id$="-cosechadora"]')?.value?.trim().toUpperCase() || null,
      cod_operador: card.querySelector('input[id$="-operador"]')?.value?.trim().toUpperCase() || null,
      cod_tractor_transbordo: card.querySelector('input[id$="-transbordo"]')?.value?.trim().toUpperCase() || null,
      cod_tractorista: card.querySelector('input[id$="-tractorista"]')?.value?.trim().toUpperCase() || null,
    }))
    .filter(cm =>
      cm.grilla_seleccion || cm.cod_cosechadora || cm.cod_operador || cm.cod_tractor_transbordo || cm.cod_tractorista
    );
}

function limpiarFormulario(section) {
  section.querySelectorAll('input, textarea, select').forEach(el => {
    if (el.type === 'file') return;
    el.value = '';
  });

  ['foto-camion-preview', 'foto-semi-preview'].forEach(id => {
    const p = document.getElementById(id);
    if (p) { p.removeAttribute('data-base64'); p.innerHTML = ''; }
  });

  const contenedor = document.getElementById('gt-cosechadoras-container');
  if (contenedor) {
    contenedor.innerHTML = '';
    contadorCosechadoras = 0;
  }

  section.querySelectorAll('.grilla-celda').forEach(c => c.classList.remove('seleccionada'));

  // Reset acordeones: cerrar todos excepto el primero
  section.querySelectorAll('.acordeon-header').forEach((b, i) => {
    b.classList.toggle('abierto', i === 0);
  });
  section.querySelectorAll('.acordeon-cuerpo').forEach((b, i) => {
    b.classList.toggle('abierto', i === 0);
  });

  _modoEdicion = false;
  _idEdicion = null;

  const titulo = section.querySelector('#gt-nuevo-titulo');
  if (titulo) titulo.textContent = '📋 Nueva Guía de Transporte';
}

/* =========================================================
   CARGAR NUEVA / EDICIÓN
========================================================= */
export async function cargarNuevaGuiaTransporte() {
  _modoEdicion = false;
  _idEdicion = null;

  const section = document.getElementById('view-guia-transporte-nuevo');
  if (!section) return;

  const titulo = section.querySelector('#gt-nuevo-titulo');
  if (titulo) titulo.textContent = '📋 Nueva Guía de Transporte';

  limpiarFormulario(section);

  const fechaInput = section.querySelector('#gt-fecha');
  if (fechaInput && !fechaInput.value) {
    fechaInput.value = new Date().toISOString().split('T')[0];
  }

  const contenedor = document.getElementById('gt-cosechadoras-container');
  if (contenedor && contenedor.children.length === 0) {
    agregarCosechadora(contenedor);
  }
}

export async function cargarEdicionGuiaTransporte(id) {
  _modoEdicion = true;
  _idEdicion = id;

  const section = document.getElementById('view-guia-transporte-nuevo');
  if (!section) return;

  const titulo = section.querySelector('#gt-nuevo-titulo');
  if (titulo) titulo.textContent = '✏️ Editar Guía de Transporte';

  limpiarFormulario(section);

  try {
    const g = await obtenerGuia(id);
    if (!g) { alert('Guía no encontrada'); return; }

    section.querySelector('#gt-fecha').value = g.fecha || '';
    section.querySelector('#gt-hora-llegada').value = g.hora_llegada || '';
    section.querySelector('#gt-hora-salida').value = g.hora_salida || '';
    section.querySelector('#gt-hora-cola').value = g.hora_llegada_cola || '';
    section.querySelector('#gt-boletario').value = g.boletario || '';
    section.querySelector('#gt-turno').value = g.turno || '';
    section.querySelector('#gt-frente').value = g.frente || '';
    section.querySelector('#gt-propiedad').value = g.propiedad || '';
    section.querySelector('#gt-observaciones').value = g.observaciones || '';

    section.querySelector('#gt-cod-liberacion').value = g.cod_liberacion || '';

    section.querySelector('#gt-cod-chofer').value = g.cod_chofer || '';
    section.querySelector('#gt-nombre-chofer').value = g.nombre_chofer || '';
    section.querySelector('#gt-cod-camion').value = g.cod_camion || '';
    section.querySelector('#gt-placa').value = g.placa || '';
    section.querySelector('#gt-cod-chata').value = g.cod_chata || '';
    section.querySelector('#gt-transportista').value = g.transportista || '';

    if (g.foto_camion_base64) {
      const p = document.getElementById('foto-camion-preview');
      if (p) { p.innerHTML = `<img src="${g.foto_camion_base64}" style="width:100%;border-radius:var(--radius-sm);max-height:220px;object-fit:cover">`; p.dataset.base64 = g.foto_camion_base64; }
    }

    section.querySelector('#gt-cod-cargadora').value = g.cod_cargadora || '';
    section.querySelector('#gt-cod-operadora').value = g.cod_operadora || '';
    section.querySelector('#gt-cod-tractor-chata').value = g.cod_tractor_chata || '';
    section.querySelector('#gt-cod-tractorista').value = g.cod_tractorista || '';

    if (g.foto_semi_base64) {
      const p = document.getElementById('foto-semi-preview');
      if (p) { p.innerHTML = `<img src="${g.foto_semi_base64}" style="width:100%;border-radius:var(--radius-sm);max-height:220px;object-fit:cover">`; p.dataset.base64 = g.foto_semi_base64; }
    }

    const contenedor = document.getElementById('gt-cosechadoras-container');
    if (contenedor) {
      contenedor.innerHTML = '';
      contadorCosechadoras = 0;
      if (g.cosechas_mecanizadas && g.cosechas_mecanizadas.length > 0) {
        g.cosechas_mecanizadas.forEach(cm => agregarCosechadora(contenedor, cm));
      } else {
        agregarCosechadora(contenedor);
      }
    }
  } catch (err) {
    console.error('[GUIA-TRANSPORTE] Error cargando edición:', err);
    alert('❌ Error al cargar guía para editar');
  }
}
