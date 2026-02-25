import {
  leerExcel,
  detectarTipoExcel,
  previsualizarProductos,
  importarProductos,
  previsualizarLotes,
  importarLotes,
} from '../services/importacion.service.js';
import { confirmar } from '../utils/confirm.js';

/* =========================================================
   ESTADO
========================================================= */
let estado = {
  archivo:      null,
  tipo:         null,
  headers:      [],
  filas:        [],
  preview:      null,
  fase:         'idle',  // idle | preview | importando | resultado
};

let inicializado = false;

/* =========================================================
   INIT
========================================================= */
export function initImportacionView() {
  if (inicializado) return;
  inicializado = true;

  document.getElementById('btn-import-productos').onclick = () => abrirSelector('productos');
  document.getElementById('btn-import-lotes').onclick     = () => abrirSelector('lotes');

  document.getElementById('import-file-input').onchange = (e) => {
    const file = e.target.files[0];
    if (file) procesarArchivo(file);
    e.target.value = '';
  };

  document.getElementById('btn-import-otra-ubicacion').onclick = () => {
    document.getElementById('import-file-input').click();
  };

  document.getElementById('btn-import-confirmar').onclick = ejecutarImportacion;
  document.getElementById('btn-import-cancelar').onclick  = resetearVista;
  document.getElementById('btn-import-nuevo').onclick     = resetearVista;
}

export function cargarImportacion() {
  resetearVista();
}

/* =========================================================
   ABRIR SELECTOR
========================================================= */
function abrirSelector(tipo) {
  estado.tipo = tipo;
  const input = document.getElementById('import-file-input');
  input.accept = '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';
  _abrirPickerConSugerencia(input);
}

async function _abrirPickerConSugerencia(input) {
  try {
    if (window.Capacitor?.Plugins?.Filesystem) {
      const { Filesystem } = window.Capacitor.Plugins;
      const rutasWhatsApp = [
        'WhatsApp/Media/WhatsApp Documents',
        'Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Documents',
        'WhatsApp Business/Media/WhatsApp Business Documents',
      ];
      for (const ruta of rutasWhatsApp) {
        try {
          await Filesystem.readdir({ path: ruta, directory: 'EXTERNAL_STORAGE' });
          mostrarSugerenciaRuta(ruta);
          break;
        } catch { /* sigue */ }
      }
    }
  } catch { /* sin Capacitor */ }
  input.click();
}

function mostrarSugerenciaRuta(ruta) {
  const el = document.getElementById('import-ruta-sugerida');
  if (el) { el.textContent = `📁 Sugerencia: buscar en "${ruta}"`; el.style.display = 'block'; }
}

/* =========================================================
   PASO 1 — LEER ARCHIVO Y MOSTRAR PREVIEW
   La animación de carga NO aparece aquí, solo un texto breve.
   El spinner solo aparece durante la importación real.
========================================================= */
async function procesarArchivo(file) {
  estado.archivo = file;

  // Mostrar sección de "leyendo" sin spinner — es rápido
  setFase('leyendo');

  try {
    const { headers, filas } = await leerExcel(file);
    estado.headers = headers;
    estado.filas   = filas;

    const tipoDetectado = detectarTipoExcel(headers);

    if (!tipoDetectado) {
      setFase('idle');
      mostrarErrorPopup(
        'Formato no reconocido',
        'El archivo no tiene las columnas esperadas.\n\n' +
        '🧪 Productos necesita: CODIGO · DESCRIPCION · UNIDAD · LINEA DE PRODUCTO\n' +
        '🌿 Lotes necesita: LOTE · CODIGO · HECTAREAS · VARIEDAD · CULTIVO · SECTOR'
      );
      return;
    }

    if (estado.tipo && tipoDetectado !== estado.tipo) {
      const ok = await confirmar({
        icon:    '⚠️',
        titulo:  'Tipo de archivo inesperado',
        msg:     `Seleccionaste "Importar ${estado.tipo}" pero el archivo parece ser de ${tipoDetectado}. ¿Continuar de todas formas?`,
        okLabel: 'Sí, continuar',
        okClass: 'modal-confirm-btn-danger',
      });
      if (!ok) { resetearVista(); return; }
    }

    estado.tipo = tipoDetectado;

    // Calcular preview (rápido, solo consultas a BD)
    if (estado.tipo === 'productos') {
      estado.preview = await previsualizarProductos(headers, filas);
    } else {
      estado.preview = await previsualizarLotes(headers, filas);
    }

    // Verificar si hay errores CRÍTICOS que impidan continuar
    const errorCritico = verificarErroresCriticos(estado.preview, estado.tipo);
    if (errorCritico) {
      setFase('idle');
      mostrarErrorPopup('Faltan datos requeridos', errorCritico);
      return;
    }

    setFase('preview');
    renderPreview();

  } catch (err) {
    setFase('idle');
    mostrarErrorPopup('Error al leer el archivo', err.message);
  }
}

/* =========================================================
   VERIFICAR ERRORES CRÍTICOS ANTES DE MOSTRAR PREVIEW
   Detecta catálogos faltantes (cultivos, tipos de producto, etc.)
========================================================= */
function verificarErroresCriticos(preview, tipo) {
  // Todo se crea automáticamente — no hay bloqueos
  return null;
}

/* =========================================================
   PASO 2 — EJECUTAR IMPORTACIÓN (acá sí aparece el spinner)
========================================================= */
async function ejecutarImportacion() {
  if (!estado.preview) return;

  const { nuevos, actualizados } = estado.preview;

  if (nuevos.length === 0 && actualizados.length === 0) {
    setFase('resultado');
    mostrarResultado({ insertados: 0, modificados: 0 });
    return;
  }

  // Ocultar preview y mostrar animación de procesando
  setFase('importando');

  try {
    let resultado;

    if (estado.tipo === 'productos') {
      resultado = await importarProductos(nuevos, actualizados);
    } else {
      resultado = await importarLotes(nuevos, actualizados);
    }

    // Pequeña pausa para que el usuario vea el check de completado
    await new Promise(r => setTimeout(r, 800));

    setFase('resultado');
    mostrarResultado(resultado);

  } catch (err) {
    setFase('preview'); // volver al preview para que pueda reintentar
    mostrarErrorPopup('Error al importar', err.message);
  }
}

/* =========================================================
   RENDER PREVIEW
========================================================= */
function renderPreview() {
  const { nuevos, actualizados, errores } = estado.preview;
  const tipo = estado.tipo;
  const panel = document.getElementById('import-preview-panel');
  const nombreArchivo = estado.archivo?.name ?? 'archivo';
  const iconTipo  = tipo === 'productos' ? '🧪' : '🌿';
  const labelTipo = tipo === 'productos' ? 'productos' : 'lotes';

  let html = `
    <div class="import-preview-header">
      <div class="import-file-badge">
        <span class="import-file-icon">📄</span>
        <div>
          <div class="import-file-name">${nombreArchivo}</div>
          <div class="import-file-meta">${iconTipo} Importación de ${labelTipo} · ${estado.filas.length} filas totales</div>
        </div>
      </div>
    </div>

    <div class="import-stats">
      <div class="import-stat import-stat--new">
        <span class="import-stat-num">${nuevos.length}</span>
        <span class="import-stat-label">Nuevos</span>
      </div>
      <div class="import-stat import-stat--update">
        <span class="import-stat-num">${actualizados.length}</span>
        <span class="import-stat-label">Actualizados</span>
      </div>
      <div class="import-stat import-stat--error">
        <span class="import-stat-num">${errores.length}</span>
        <span class="import-stat-label">Con advertencia</span>
      </div>
    </div>
  `;

  // Avisos informativos de datos que se crearán automáticamente
  if (tipo === 'lotes') {
    const grupos = [
      { lista: estado.preview.sectoresNuevos,   label: 'SECTORES nuevos' },
      { lista: estado.preview.cultivosNuevos,   label: 'CULTIVOS nuevos' },
      { lista: estado.preview.variedadesNuevas, label: 'VARIEDADES nuevas' },
    ].filter(g => g.lista?.length > 0);

    if (grupos.length > 0) {
      html += `<div class="import-info-box">
        <div class="import-info-titulo">ℹ️ Se crearán automáticamente</div>
        ${grupos.map(g => `
          <div class="import-info-grupo">${g.label}:</div>
          ${g.lista.map(v => `<div class="import-info-item">• ${v}</div>`).join('')}
        `).join('')}
      </div>`;
    }
  }

  if (tipo === 'productos') {
    const tiposNuevos    = [...new Set(nuevos.concat(actualizados).filter(p => p.tipoNuevo && p.linea).map(p => p.linea))];
    const unidadesNuevas = [...new Set(nuevos.concat(actualizados).filter(p => p.unidadNueva && p.unidadCodigo).map(p => p.unidadCodigo))];

    const grupos = [
      { lista: tiposNuevos,    label: 'TIPOS DE PRODUCTO nuevos' },
      { lista: unidadesNuevas, label: 'UNIDADES DE MEDIDA nuevas' },
    ].filter(g => g.lista.length > 0);

    if (grupos.length > 0) {
      html += `<div class="import-info-box">
        <div class="import-info-titulo">ℹ️ Se crearán automáticamente</div>
        ${grupos.map(g => `
          <div class="import-info-grupo">${g.label}:</div>
          ${g.lista.map(v => `<div class="import-info-item">• ${v}</div>`).join('')}
        `).join('')}
      </div>`;
    }
  }

  if (errores.length > 0) {
    html += `
      <div class="import-errores">
        <div class="import-errores-title">⚠️ Filas con advertencias (se omitirán)</div>
        ${errores.slice(0, 8).map(e =>
          `<div class="import-error-item">Fila ${e.fila}: ${e.msg}</div>`
        ).join('')}
        ${errores.length > 8 ? `<div class="import-error-item" style="color:var(--text-muted)">...y ${errores.length - 8} más</div>` : ''}
      </div>
    `;
  }

  if (nuevos.length > 0) {
    html += `
      <div class="import-lista-titulo">✅ Se agregarán (${nuevos.length})</div>
      <div class="import-lista">
        ${nuevos.slice(0, 5).map(item => `
          <div class="import-lista-item">
            <span class="import-lista-badge import-lista-badge--new">NUEVO</span>
            <span>${tipo === 'productos' ? item.codigo + ' — ' + item.nombre : item.nombre + ' · ' + (item.hectareas ?? '?') + ' ha'}</span>
            <span class="import-lista-sub">${tipo === 'productos' ? item.linea : item.sectorNombre}</span>
          </div>
        `).join('')}
        ${nuevos.length > 5 ? `<div class="import-lista-item" style="color:var(--text-muted); font-style:italic">...y ${nuevos.length - 5} más</div>` : ''}
      </div>
    `;
  }

  if (actualizados.length > 0) {
    html += `
      <div class="import-lista-titulo">🔄 Se actualizarán (${actualizados.length})</div>
      <div class="import-lista">
        ${actualizados.slice(0, 5).map(item => `
          <div class="import-lista-item">
            <span class="import-lista-badge import-lista-badge--update">ACTUALIZAR</span>
            <span>${tipo === 'productos' ? item.codigo + ' — ' + item.nombre : item.nombre + ' · ' + (item.hectareas ?? '?') + ' ha'}</span>
            <span class="import-lista-sub">${tipo === 'productos' ? item.linea : item.sectorNombre}</span>
          </div>
        `).join('')}
        ${actualizados.length > 5 ? `<div class="import-lista-item" style="color:var(--text-muted); font-style:italic">...y ${actualizados.length - 5} más</div>` : ''}
      </div>
    `;
  }

  if (nuevos.length === 0 && actualizados.length === 0) {
    html += `
      <div class="import-empty">
        <span style="font-size:2rem">✅</span>
        <p>Los datos ya están actualizados. No hay cambios que aplicar.</p>
      </div>
    `;
  }

  panel.innerHTML = html;
}

/* =========================================================
   MOSTRAR RESULTADO FINAL
========================================================= */
function mostrarResultado({ insertados, modificados }) {
  const tipo = estado.tipo === 'productos' ? 'productos' : 'lotes';
  const total = insertados + modificados;

  document.getElementById('import-resultado-texto').innerHTML = `
    <div class="import-resultado-stats">
      <div class="import-resultado-item">
        <span class="import-resultado-num import-resultado-num--green">${insertados}</span>
        <span>${tipo} nuevos agregados</span>
      </div>
      <div class="import-resultado-item">
        <span class="import-resultado-num import-resultado-num--blue">${modificados}</span>
        <span>${tipo} actualizados</span>
      </div>
    </div>
    ${total === 0 ? '<p style="color:var(--text-muted); font-size:0.88rem; margin-top:0.5rem">Los datos ya estaban al día.</p>' : ''}
  `;
}

/* =========================================================
   HELPERS DE UI
========================================================= */
function setFase(fase) {
  estado.fase = fase;

  const secciones = {
    'import-inicio-section':   ['idle'],
    'import-leyendo-section':  ['leyendo'],
    'import-progreso-section': ['importando'],
    'import-preview-section':  ['preview'],
    'import-actions':          ['preview'],
    'import-resultado-panel':  ['resultado'],
  };

  for (const [id, fases] of Object.entries(secciones)) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', !fases.includes(fase));
  }
}

/* Popup de error — usa el modal de confirmación si existe, si no un alert */
function mostrarErrorPopup(titulo, mensaje) {
  // Intentar usar el modal de confirm si está disponible
  const modal = document.getElementById('modal-confirm');
  if (modal) {
    // Reutilizar la función confirmar solo para mostrar, sin botón cancelar
    confirmar({
      icon:     '❌',
      titulo:   titulo,
      msg:      mensaje,
      okLabel:  'Entendido',
      okClass:  'modal-confirm-btn-danger',
      hideCancelBtn: true,
    }).catch(() => {});
    return;
  }
  // Fallback
  alert(`❌ ${titulo}\n\n${mensaje}`);
}

function resetearVista() {
  estado = { archivo: null, tipo: null, headers: [], filas: [], preview: null, fase: 'idle' };

  const rutaEl = document.getElementById('import-ruta-sugerida');
  if (rutaEl) rutaEl.style.display = 'none';

  setFase('idle');
}