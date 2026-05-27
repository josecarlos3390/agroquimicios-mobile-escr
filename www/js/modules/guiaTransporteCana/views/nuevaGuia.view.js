import {
  crearGuiaTransporte,
  actualizarGuiaTransporte,
  obtenerGuia,
  aplicarMarcaAgua,
} from '../services/guiaTransporteCana.service.js';
import { getEmpresaActiva } from '../../../services/empresas.service.js';
import { listarTecnicos } from '../../../services/tecnicos.service.js';
import { listarSectores } from '../../../services/sectores.service.js';
import { listarLotesPorSector } from '../../../services/lotes.service.js';
import { crearBotonEscanear } from '../../../utils/barcode.js';
import { formatFecha } from '../../../utils/fecha.js';

let inicializado = false;
let _modoEdicion = false;
let _idEdicion = null;
let _lotesCache = {}; // loteId -> { nombre, variedad_nombre, cultivo_nombre }

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
  initDependencias(section);
  initModalSS();

  initSearchableSelect('ss-boletario', []);
  initSearchableSelect('ss-turno', []);
  initSearchableSelect('ss-frente', []);
  initSearchableSelect('ss-propiedad', []);
  initSearchableSelect('ss-lote', []);

  const loteHidden = document.querySelector('#ss-lote .ssd-value');
  if (loteHidden) {
    loteHidden.addEventListener('change', () => mostrarVariedadCultivo(loteHidden.value));
  }

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

      const boletario = getSearchableSelectValue('ss-boletario');
      if (!boletario) throw new Error('El nombre del boletario es obligatorio');

      const data = {
        empresa_id: empresa?.id ?? null,
        fecha,
        hora_llegada: section.querySelector('#gt-hora-llegada')?.value || null,
        hora_salida: section.querySelector('#gt-hora-salida')?.value || null,
        hora_llegada_cola: section.querySelector('#gt-hora-cola')?.value || null,
        boletario,
        turno: getSearchableSelectValue('ss-turno'),
        frente: getSearchableSelectValue('ss-frente'),
        propiedad: getSearchableSelectValue('ss-propiedad'),
        lote: getSearchableSelectValue('ss-lote'),
        variedad: section.querySelector('#gt-variedad')?.value?.trim().toUpperCase() || null,
        cultivo: section.querySelector('#gt-cultivo')?.value?.trim().toUpperCase() || null,
        hectareas: section.querySelector('#gt-hectareas')?.value ? parseFloat(section.querySelector('#gt-hectareas').value) : null,
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
}

/* =========================================================
   SEARCHABLE SELECT (modal con búsqueda)
========================================================= */
let _ssModalInicializado = false;
let _ssModalTargetId = null;
let _abrirModalSS = null;
let _cerrarModalSS = null;

function initModalSS() {
  if (_ssModalInicializado) return;
  _ssModalInicializado = true;

  const modal = document.getElementById('modal-ss');
  const titulo = document.getElementById('modal-ss-titulo');
  const buscar = document.getElementById('modal-ss-buscar');
  const lista = document.getElementById('modal-ss-lista');
  const btnCerrar = document.getElementById('modal-ss-cerrar');
  if (!modal || !buscar || !lista) return;

  function renderModalSS(opciones) {
    lista.innerHTML = '';
    if (opciones.length === 0) {
      lista.innerHTML = '<div class="ssd-empty">Sin resultados</div>';
      return;
    }
    opciones.forEach(opt => {
      const div = document.createElement('div');
      div.className = 'ssd-option';
      div.dataset.value = String(opt.value ?? '');
      div.textContent = opt.label || '';

      div.addEventListener('click', () => seleccionarModalSS(opt));

      lista.appendChild(div);
    });
  }

  function seleccionarModalSS(opt) {
    if (!_ssModalTargetId) return;
    const container = document.getElementById(_ssModalTargetId);
    if (!container) return;
    const hidden = container.querySelector('.ssd-value');
    const display = container.querySelector('.ssd-display');
    if (hidden) hidden.value = String(opt.value ?? '');
    if (display) display.textContent = opt.label || display.dataset.placeholder || '';
    _cerrarModalSS();
    if (hidden) hidden.dispatchEvent(new Event('change', { bubbles: true }));
  }

  _cerrarModalSS = function () {
    modal.classList.add('hidden');
    buscar.value = '';
    _ssModalTargetId = null;
    if (document.activeElement === buscar) buscar.blur();
  };

  _abrirModalSS = function (containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    _ssModalTargetId = containerId;
    titulo.textContent = container.dataset.titulo || 'Seleccionar';
    renderModalSS(container._opciones || []);
    modal.classList.remove('hidden');
    requestAnimationFrame(() => buscar.focus());
  };

  btnCerrar?.addEventListener('click', _cerrarModalSS);
  modal.addEventListener('click', e => {
    if (e.target === modal) _cerrarModalSS();
  });

  buscar.addEventListener('input', () => {
    const container = document.getElementById(_ssModalTargetId);
    if (!container) return;
    const term = buscar.value.trim().toLowerCase();
    const filtrados = (container._opciones || []).filter(o => o.label.toLowerCase().includes(term));
    renderModalSS(filtrados);
  });
}

function initSearchableSelect(containerId, opciones) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const display = container.querySelector('.ssd-display');
  if (!display) return;

  container._opciones = opciones;

  display.addEventListener('click', () => {
    if (_abrirModalSS) _abrirModalSS(containerId);
  });
}

function updateSearchableSelectOptions(containerId, opciones) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container._opciones = opciones;
  clearSearchableSelect(containerId);
}

function setSearchableSelectValue(containerId, value) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const hidden = container.querySelector('.ssd-value');
  const display = container.querySelector('.ssd-display');
  const opcion = container._opciones?.find(o => String(o.value) === String(value));
  if (hidden) hidden.value = value || '';
  if (display) display.textContent = opcion ? opcion.label : (display.dataset.placeholder || '');
}

function getSearchableSelectValue(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return null;
  const hidden = container.querySelector('.ssd-value');
  return hidden ? hidden.value.trim() || null : null;
}

function clearSearchableSelect(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const hidden = container.querySelector('.ssd-value');
  const display = container.querySelector('.ssd-display');
  if (hidden) hidden.value = '';
  if (display) display.textContent = display.dataset.placeholder || '';
}

/* =========================================================
   DEPENDENCIAS: Técnicos, Sectores, Lotes
========================================================= */
function limpiarVariedadCultivo() {
  const v = document.getElementById('gt-variedad');
  const c = document.getElementById('gt-cultivo');
  const h = document.getElementById('gt-hectareas');
  if (v) v.value = '';
  if (c) c.value = '';
  if (h) h.value = '';
}

function mostrarVariedadCultivo(loteId) {
  const info = _lotesCache[loteId];
  const v = document.getElementById('gt-variedad');
  const c = document.getElementById('gt-cultivo');
  const h = document.getElementById('gt-hectareas');
  if (v) v.value = info?.variedad_nombre || '';
  if (c) c.value = info?.cultivo_nombre || '';
  if (h) h.value = info?.hectareas != null ? String(info.hectareas) : '';
}

function cacheLotes(lotes) {
  _lotesCache = {};
  lotes.forEach(l => {
    _lotesCache[l.id] = {
      nombre: l.nombre,
      variedad_nombre: l.variedad_nombre,
      cultivo_nombre: l.cultivo_nombre,
      hectareas: l.hectareas,
    };
  });
}

function initDependencias() {
  const container = document.getElementById('ss-propiedad');
  if (!container) return;
  const hidden = container.querySelector('.ssd-value');
  if (!hidden) return;

  hidden.addEventListener('change', async () => {
    const sectorId = hidden.value;
    limpiarVariedadCultivo();
    if (!sectorId) {
      updateSearchableSelectOptions('ss-lote', []);
      _lotesCache = {};
      return;
    }
    try {
      const lotes = await listarLotesPorSector(sectorId);
      cacheLotes(lotes);
      updateSearchableSelectOptions('ss-lote', lotes.map(l => ({ value: l.id, label: l.nombre })));
    } catch (err) {
      console.error('[GUIA-TRANSPORTE] Error cargando lotes:', err);
    }
  });
}

async function cargarTecnicosSearchable() {
  try {
    const empresa = getEmpresaActiva();
    const tecnicos = await listarTecnicos(empresa?.id || null);
    updateSearchableSelectOptions('ss-boletario', tecnicos.map(t => ({ value: t.nombre, label: t.nombre })));
  } catch (err) {
    console.error('[GUIA-TRANSPORTE] Error cargando técnicos:', err);
  }
}

async function cargarSectoresSearchable() {
  try {
    const empresa = getEmpresaActiva();
    const sectores = await listarSectores(empresa?.id || null);
    updateSearchableSelectOptions('ss-propiedad', sectores.map(s => ({ value: s.id, label: s.nombre })));
  } catch (err) {
    console.error('[GUIA-TRANSPORTE] Error cargando sectores:', err);
  }
}

function setHoraActual(...ids) {
  const ahora = new Date();
  const hh = String(ahora.getHours()).padStart(2, '0');
  const mm = String(ahora.getMinutes()).padStart(2, '0');
  const hora = `${hh}:${mm}`;
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = hora;
  });
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

  const btnSubmit = section.querySelector('#btn-gt-submit');
  if (btnSubmit) btnSubmit.textContent = '📌 Guardar guía';

  limpiarFormulario(section);

  const fechaInput = section.querySelector('#gt-fecha');
  if (fechaInput && !fechaInput.value) {
    fechaInput.value = new Date().toISOString().split('T')[0];
  }

  setHoraActual('gt-hora-llegada', 'gt-hora-salida', 'gt-hora-cola');

  await cargarTecnicosSearchable();
  await cargarSectoresSearchable();
  updateSearchableSelectOptions('ss-lote', []);

  // Opciones fijas
  updateSearchableSelectOptions('ss-turno', [
    { value: 'MAÑANA', label: 'MAÑANA' },
    { value: 'TARDE', label: 'TARDE' },
  ]);
  updateSearchableSelectOptions('ss-frente', [
    { value: '1', label: '1' },
    { value: '2', label: '2' },
  ]);

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

  const btnSubmit = section.querySelector('#btn-gt-submit');
  if (btnSubmit) btnSubmit.textContent = '🔄 Actualizar guía';

  limpiarFormulario(section);

  try {
    const g = await obtenerGuia(id);
    if (!g) { alert('Guía no encontrada'); return; }

    await cargarTecnicosSearchable();
    await cargarSectoresSearchable();

    updateSearchableSelectOptions('ss-turno', [
      { value: 'MAÑANA', label: 'MAÑANA' },
      { value: 'TARDE', label: 'TARDE' },
    ]);
    updateSearchableSelectOptions('ss-frente', [
      { value: '1', label: '1' },
      { value: '2', label: '2' },
    ]);

    section.querySelector('#gt-fecha').value = g.fecha || '';
    section.querySelector('#gt-hora-llegada').value = g.hora_llegada || '';
    section.querySelector('#gt-hora-salida').value = g.hora_salida || '';
    section.querySelector('#gt-hora-cola').value = g.hora_llegada_cola || '';
    setSearchableSelectValue('ss-boletario', g.boletario);
    setSearchableSelectValue('ss-turno', g.turno);
    setSearchableSelectValue('ss-frente', g.frente);
    setSearchableSelectValue('ss-propiedad', g.propiedad);

    // Cargar lotes del sector seleccionado y setear el lote guardado
    if (g.propiedad) {
      try {
        const lotes = await listarLotesPorSector(g.propiedad);
        cacheLotes(lotes);
        updateSearchableSelectOptions('ss-lote', lotes.map(l => ({ value: l.id, label: l.nombre })));
        setSearchableSelectValue('ss-lote', g.lote);
        mostrarVariedadCultivo(g.lote);
      } catch (err) {
        console.error('[GUIA-TRANSPORTE] Error cargando lotes en edición:', err);
      }
    }

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
