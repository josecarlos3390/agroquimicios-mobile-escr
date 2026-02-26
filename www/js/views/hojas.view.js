import { listarHojas, eliminarHoja, marcarComoExportado } from '../services/hojas.service.js';
import { exportarHojas, lineasAXLSX } from '../services/exportacion.service.js';
import { confirmar } from '../utils/confirm.js';

let inicializado = false;
let modoSeleccion = false;
let filtroEstado = 'BORRADOR'; // Por defecto solo muestra borradores

/* =========================
   HELPER: formato dd/mm/yyyy
========================= */
function formatFecha(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function initHojasView() {
  // FIX #4: resetear modoSeleccion cada vez que se entra a la vista
  modoSeleccion = false;

  if (inicializado) {
    actualizarModoSeleccion();
    return;
  }
  inicializado = true;

  // Inicializar el modal de exportación
  initModalExportar();

  // Inicializar filtro de estado
  const filtroEl = document.getElementById('filtro-estado-hojas');
  if (filtroEl) {
    filtroEl.value = filtroEstado;
    filtroEl.addEventListener('change', async () => {
      filtroEstado = filtroEl.value || null;
      await cargarHojas();
    });
  }

  document.getElementById('btn-nueva-hoja').onclick = () => {
    window.showView('nueva-hoja');
  };

  document.getElementById('btn-seleccionar-hojas').onclick = () => {
    modoSeleccion = !modoSeleccion;
    actualizarModoSeleccion();
  };

  document.getElementById('btn-cancelar-seleccion').onclick = () => {
    modoSeleccion = false;
    actualizarModoSeleccion();
  };

  document.getElementById('btn-marcar-todas').onclick = () => {
    const checkboxes = document.querySelectorAll('.hoja-checkbox');
    const todasMarcadas = [...checkboxes].every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !todasMarcadas);
    actualizarContadorSeleccion();
    document.getElementById('btn-marcar-todas').textContent =
      todasMarcadas ? '☑️ Todas' : '🔲 Ninguna';
  };

  document.getElementById('btn-exportar-seleccionadas').onclick = () => {
    const seleccionadas = getHojasSeleccionadas();
    if (seleccionadas.length === 0) { alert('Seleccione al menos una hoja'); return; }
    abrirModalExportar(seleccionadas);
  };

  document.getElementById('btn-sincronizar-seleccionadas').onclick = () => {
    const seleccionadas = getHojasSeleccionadas();
    if (seleccionadas.length === 0) { alert('Seleccione al menos una hoja'); return; }
    alert(`🔄 Sincronizar ${seleccionadas.length} hoja(s) — pendiente de implementar`);
  };

  document.getElementById('view-hojas').addEventListener('click', async e => {

    if (e.target.classList.contains('hoja-checkbox')) {
      actualizarContadorSeleccion();
      return;
    }

    if (e.target.dataset.verDetalle) {
      window.showView('hoja-detalle', e.target.dataset.verDetalle);
    }

    if (e.target.dataset.editarHoja) {
      window.showView('editar-hoja', e.target.dataset.editarHoja);
    }

    if (e.target.dataset.eliminarHoja) {
      const hojaId = e.target.dataset.eliminarHoja;
      const btn = e.target;

      const ok = await confirmar({
        icon:    '🗑️',
        titulo:  '¿Eliminar hoja de trabajo?',
        msg:     'Se eliminará la hoja y todos sus productos. Esta acción no se puede deshacer.',
        okLabel: 'Sí, eliminar',
      });

      if (ok) {
        btn.disabled = true;
        btn.textContent = '⏳';
        await eliminarHoja(hojaId);
        await cargarHojas();
      }
    }

    if (e.target.dataset.exportarHoja) {
      abrirModalExportar([e.target.dataset.exportarHoja]);
    }

    if (e.target.dataset.sincronizarHoja) {
      alert(`🔄 Sincronizar hoja — pendiente de implementar`);
    }
  });
}

export async function cargarHojas() {
  const container = document.getElementById('hojas-lista');

  // Sincronizar selector con el filtro actual
  const filtroEl = document.getElementById('filtro-estado-hojas');
  if (filtroEl) filtroEl.value = filtroEstado ?? '';

  // Mostrar skeleton mientras carga
  container.innerHTML = [1, 2, 3].map(() => `
    <div class="skeleton-card">
      <div class="skeleton-header">
        <div class="skeleton-line" style="height:14px; width:55%; border-radius:4px;"></div>
        <div class="skeleton-line" style="height:20px; width:22%; border-radius:20px; margin-left:auto;"></div>
      </div>
      <div class="skeleton-body">
        <div class="skeleton-line" style="height:13px; width:70%;"></div>
        <div class="skeleton-line" style="height:13px; width:55%;"></div>
        <div class="skeleton-line" style="height:13px; width:80%;"></div>
      </div>
    </div>
  `).join('');

  const hojas = await listarHojas(filtroEstado);

  // FIX #4: siempre resetear el modo selección al recargar la lista
  modoSeleccion = false;
  actualizarModoSeleccion();

  if (hojas.length === 0) {
    container.innerHTML = `
      <div class="empty-state-hojas">
        <div class="empty-state-illustration">
          <svg viewBox="0 0 220 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Fondo suave -->
            <ellipse cx="110" cy="155" rx="75" ry="12" fill="#d4e8d4" opacity="0.5"/>

            <!-- Documento base -->
            <rect x="55" y="28" width="90" height="115" rx="10" fill="#f4f9f4" stroke="#b8d4b8" stroke-width="1.5"/>
            <!-- Líneas del documento -->
            <rect x="70" y="52" width="60" height="5" rx="2.5" fill="#c8dfc8"/>
            <rect x="70" y="65" width="50" height="5" rx="2.5" fill="#c8dfc8"/>
            <rect x="70" y="78" width="55" height="5" rx="2.5" fill="#c8dfc8"/>
            <rect x="70" y="91" width="40" height="5" rx="2.5" fill="#e0eee0"/>
            <rect x="70" y="104" width="48" height="5" rx="2.5" fill="#e0eee0"/>

            <!-- Clip de carpeta arriba -->
            <rect x="88" y="22" width="34" height="12" rx="4" fill="#4a7c4a"/>

            <!-- Planta creciendo del documento -->
            <path d="M110 143 C110 143 110 118 110 108" stroke="#4a7c4a" stroke-width="2.5" stroke-linecap="round"/>
            <!-- Hoja izquierda -->
            <path d="M110 120 C110 120 98 114 96 104 C104 104 112 112 110 120Z" fill="#6aaa2a" opacity="0.9"/>
            <!-- Hoja derecha -->
            <path d="M110 128 C110 128 122 120 126 110 C118 110 110 118 110 128Z" fill="#4a7c4a" opacity="0.9"/>
            <!-- Hoja pequeña arriba -->
            <path d="M110 112 C110 112 103 107 103 100 C109 101 112 107 110 112Z" fill="#8bc34a" opacity="0.85"/>

            <!-- Estrellitas / destellos -->
            <circle cx="78" cy="42" r="2.5" fill="#6aaa2a" opacity="0.5"/>
            <circle cx="148" cy="55" r="1.8" fill="#4a7c4a" opacity="0.4"/>
            <circle cx="145" cy="38" r="3" fill="#8bc34a" opacity="0.35"/>
            <circle cx="72" cy="130" r="2" fill="#6aaa2a" opacity="0.3"/>
          </svg>
        </div>
        <p class="empty-state-titulo">${
          filtroEstado === 'EXPORTADO' ? 'Sin hojas exportadas' :
          filtroEstado === 'SINCRONIZADO' ? 'Sin hojas sincronizadas' :
          filtroEstado === 'BORRADOR' ? 'Sin hojas en borrador' :
          'Sin hojas de trabajo'
        }</p>
        <p class="empty-state-sub">${
          filtroEstado === 'EXPORTADO' ? 'Las hojas que exportes aparecerán aquí.' :
          filtroEstado === 'SINCRONIZADO' ? 'Las hojas sincronizadas con el servidor aparecerán aquí.' :
          'Creá tu primera hoja tocando el botón <strong>➕ Nueva hoja</strong> de arriba.'
        }</p>
      </div>
    `;
    return;
  }

  container.innerHTML = hojas.map(h => `
    <div class="hoja-card" data-estado="${h.estado}">

      <div class="hoja-card-header">
        <div class="hoja-checkbox-wrapper">
          <input type="checkbox" class="hoja-checkbox" value="${h.id}">
        </div>
        <span class="hoja-numero">${h.numero_completo}</span>
        <span class="hoja-estado hoja-estado--${h.estado.toLowerCase()}">${h.estado}</span>
      </div>

      <div class="hoja-card-body">

        <div class="hoja-card-main-row">
          <span class="hoja-card-empresa">${h.empresa_nombre ?? '—'}</span>
          <span class="hoja-card-tecnico">👤 ${h.tecnico_nombre ?? '—'}</span>
        </div>

        <div class="hoja-card-cultivo">
          🌾 ${h.cultivo_nombre ?? '—'}${h.mes ? ` &nbsp;·&nbsp; ${h.mes}` : ''}
        </div>

        <div class="hoja-card-pills">
          <span class="hoja-pill hoja-pill--fecha">
            📅 ${formatFecha(h.fecha_inicio)}${h.fecha_fin !== h.fecha_inicio ? ' → ' + formatFecha(h.fecha_fin) : ''}
          </span>
          <span class="hoja-pill hoja-pill--ha">
            🌿 ${h.cantidad_hectareas} ha
          </span>
          ${h.total_productos === 0
            ? `<span class="hoja-pill hoja-pill--alerta">⚠️ Sin productos</span>`
            : `<span class="hoja-pill hoja-pill--productos">🧪 ${h.total_productos} producto${h.total_productos !== 1 ? 's' : ''}</span>`
          }
        </div>

      </div>

      <div class="hoja-card-actions">
        <button data-ver-detalle="${h.id}">📋 Detalle</button>
        <button data-editar-hoja="${h.id}">✏️ Editar</button>
        <button data-exportar-hoja="${h.id}">📤</button>
        <button data-sincronizar-hoja="${h.id}">🔄</button>
        <button data-eliminar-hoja="${h.id}">🗑️</button>
      </div>

    </div>
  `).join('');

  actualizarContadorSeleccion();
}

/* =========================
   HELPERS
========================= */
function actualizarModoSeleccion() {
  const btnSeleccionar = document.getElementById('btn-seleccionar-hojas');
  const barraAcciones  = document.getElementById('barra-acciones-multiple');
  const checkboxes     = document.querySelectorAll('.hoja-checkbox-wrapper');

  if (modoSeleccion) {
    btnSeleccionar.classList.add('hidden');
    barraAcciones.classList.remove('hidden');
    checkboxes.forEach(w => w.classList.add('visible'));
  } else {
    btnSeleccionar.classList.remove('hidden');
    barraAcciones.classList.add('hidden');
    checkboxes.forEach(w => w.classList.remove('visible'));
    document.querySelectorAll('.hoja-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('btn-marcar-todas').textContent = '☑️ Todas';
  }

  actualizarContadorSeleccion();
}

function getHojasSeleccionadas() {
  return [...document.querySelectorAll('.hoja-checkbox:checked')].map(cb => cb.value);
}

function actualizarContadorSeleccion() {
  const total = getHojasSeleccionadas().length;
  const sufijo = total > 0 ? ` (${total})` : '';
  document.getElementById('btn-exportar-seleccionadas').textContent  = `📤 Exportar${sufijo}`;
  document.getElementById('btn-sincronizar-seleccionadas').textContent = `🔄 Sincronizar${sufijo}`;
}

/* =========================
   EXPORTACIÓN — MODAL DE OPCIONES
========================= */

// Estado del modal: guarda los ids pendientes de exportar
let _hojaIdsParaExportar = [];

function abrirModalExportar(hojaIds) {
  _hojaIdsParaExportar = hojaIds;

  const subtitulo = document.getElementById('modal-exportar-subtitulo');
  subtitulo.textContent = hojaIds.length === 1
    ? '¿Cómo querés exportar esta hoja?'
    : `¿Cómo querés exportar estas ${hojaIds.length} hojas?`;

  // Restaurar estado de los botones por si quedaron cargando
  _resetBotonesExport();

  document.getElementById('modal-exportar').classList.remove('hidden');
}

function cerrarModalExportar() {
  document.getElementById('modal-exportar').classList.add('hidden');
  _hojaIdsParaExportar = [];
}

function _resetBotonesExport() {
  const btnCompartir = document.getElementById('btn-export-compartir');
  const btnGuardar   = document.getElementById('btn-export-guardar');
  btnCompartir.disabled = false;
  btnGuardar.disabled   = false;
  btnCompartir.classList.remove('cargando');
  btnGuardar.classList.remove('cargando');
  btnCompartir.querySelector('.export-opcion-icono').textContent = '📨';
  btnGuardar.querySelector('.export-opcion-icono').textContent   = '💾';
}

function _setBtnCargando(btn, icono) {
  btn.disabled = true;
  btn.classList.add('cargando');
  btn.querySelector('.export-opcion-icono').textContent = icono;
}

// Construye el XLSX en base64 y el nombre del archivo
async function _prepararXLSX(hojaIds) {
  const lineas  = await exportarHojas(hojaIds);
  const base64  = lineasAXLSX(lineas);
  const fecha   = new Date().toISOString().slice(0, 10);
  const hora   = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
  const nombre  = `hojas_trabajo_${fecha}_${hora}.xlsx`;
  return { base64, nombre, lineas };
}

// Opción 1: Compartir (WhatsApp, Gmail, Drive, etc.)
// WhatsApp acepta .xlsx — no acepta .csv
async function exportarCompartiendo(hojaIds) {
  const btnCompartir = document.getElementById('btn-export-compartir');
  _setBtnCargando(btnCompartir, '⏳');

  try {
    const { base64, nombre } = await _prepararXLSX(hojaIds);
    const { Filesystem, Share } = window.Capacitor.Plugins;

    // Prefijo data URI con MIME correcto → Capacitor lo interpreta como binario
    // en TODAS las versiones de Android/iOS, sin ambigüedad.
    const base64Limpio = base64.includes(',') ? base64.split(',')[1] : base64;
    const dataUri = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64Limpio}`;

    const resultado = await Filesystem.writeFile({
      path:      nombre,
      data:      dataUri,
      directory: 'CACHE',
      recursive: true
    });

    await Share.share({
      title:       'Hojas de trabajo - AgroApp',
      text:        `Exportación de ${hojaIds.length} hoja(s) de trabajo`,
      files:       [resultado.uri],
      dialogTitle: '¿Dónde querés enviar el Excel?'
    });

    await marcarComoExportado(hojaIds);
    cerrarModalExportar();
    filtroEstado = 'BORRADOR';
    await cargarHojas();

  } catch (err) {
    if (err.message?.includes('cancel') || err.message?.includes('dismiss')) {
      _resetBotonesExport();
      return;
    }
    cerrarModalExportar();
    alert('❌ No se pudo compartir:\n' + err.message);
  }
}

// Opción 2: Guardar en dispositivo
// Intenta guardar en Descargas (visible en WhatsApp al adjuntar).
// Si el directorio no está disponible cae a DOCUMENTS como fallback.
async function exportarGuardando(hojaIds) {
  const btnGuardar = document.getElementById('btn-export-guardar');
  _setBtnCargando(btnGuardar, '⏳');

  try {
    const { Filesystem } = window.Capacitor.Plugins;
    await Filesystem.requestPermissions();

    const { base64, nombre } = await _prepararXLSX(hojaIds);

    // Capacitor espera base64 puro (sin prefijo data URI) cuando no se
    // especifica encoding — así funciona en todas las versiones.
    const base64Puro = base64.includes(',') ? base64.split(',')[1] : base64;

    // Estrategia en cascada: External → Downloads → Documents
    let rutaFinal   = null;
    let dirFinal    = null;

    const intentos = [
      // Android: ruta absoluta a /storage/emulated/0/Download
      {
        path:      `Download/${nombre}`,
        directory: 'EXTERNAL_STORAGE',
        label:     'Descargas'
      },
      // Capacitor >=4 tiene el alias DOWNLOADS
      {
        path:      nombre,
        directory: 'DOWNLOADS',
        label:     'Descargas'
      },
      // Fallback universal: Documentos internos
      {
        path:      nombre,
        directory: 'DOCUMENTS',
        label:     'Documentos'
      },
    ];

    let ultimoError = null;

    for (const intento of intentos) {
      try {
        await Filesystem.writeFile({
          path:      intento.path,
          data:      base64Puro,
          directory: intento.directory,
          recursive: true,
        });
        rutaFinal = intento.path;
        dirFinal  = intento.label;
        break;
      } catch (e) {
        ultimoError = e;
        // Seguir con el próximo intento
      }
    }

    if (!rutaFinal) {
      throw ultimoError ?? new Error('No se pudo escribir el archivo en ningún directorio.');
    }

    await marcarComoExportado(hojaIds);
    cerrarModalExportar();
    filtroEstado = 'BORRADOR';
    await cargarHojas();
    alert(
      `✅ Excel guardado en:\n${dirFinal}/${nombre}\n\n` +
      `Para enviarlo por WhatsApp:\nAdjuntar → Archivos → ${dirFinal}`
    );

  } catch (err) {
    cerrarModalExportar();
    alert('❌ No se pudo guardar:\n' + err.message);
  }
}

// Inicializar listeners del modal (se llama una sola vez desde initHojasView)
function initModalExportar() {
  document.getElementById('btn-export-compartir').onclick = () =>
    exportarCompartiendo(_hojaIdsParaExportar);

  document.getElementById('btn-export-guardar').onclick = () =>
    exportarGuardando(_hojaIdsParaExportar);

  document.getElementById('btn-export-cancelar').onclick = () =>
    cerrarModalExportar();

  // Cerrar al tocar fuera del modal-content
  document.getElementById('modal-exportar').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-exportar')) cerrarModalExportar();
  });
}