/* ===============================
   IMPORTS
================================ */
import { borrarBaseDeDatos } from './db/sqlite.js';
import { setEmpresaActiva, getEmpresaActiva, listarEmpresas, restaurarEmpresaActiva } from './services/empresas.service.js';

import { initSidebar, renderMenuModulo } from './ui/sidebar.js';
import { initSchema } from './db/schema.js';

import {
  seedEmpresas,
  seedEspecies,
} from './db/seed.js';

// ── Maestros compartidos ──────────────────────────────────
import { cargarEmpresas } from './views/empresas.view.js';
import { initEspeciesView, cargarEspecies } from './views/especies.view.js';

// ── Módulo: Combustible ───────────────────────────────────
import { initRegistrosCombustibleView, cargarRegistrosCombustible } from './modules/combustible/views/registros.view.js';
import { initNuevaAsignacionCombustibleView, cargarNuevaAsignacion, cargarEdicionAsignacion, cargarDetalleCombustible } from './modules/combustible/views/nuevaAsignacion.view.js';

// ── Módulo: Control Rodeo ─────────────────────────────────
import { initRegistrosControlRodeoView, cargarRegistrosCefo } from './modules/controlRodeo/views/registros.view.js';
import { initNuevaCefoView } from './modules/controlRodeo/views/nueva.view.js';
import { initDetalleControlRodeoView, cargarDetalleCefo } from './modules/controlRodeo/views/detalle.view.js';
import { initRegistrosSalidaView, cargarRegistrosSalida } from './modules/controlRodeo/views/registrosSalida.view.js';
import { initNuevaSalidaView } from './modules/controlRodeo/views/nuevaSalida.view.js';
import { initDetalleSalidaView, cargarDetalleSalida } from './modules/controlRodeo/views/detalleSalida.view.js';
import { initRodeoRegistrosView, cargarRodeoRegistros } from './modules/controlRodeo/views/rodeoRegistros.view.js';
import { initRodeoNuevoView, cargarRodeoNuevoSectores } from './modules/controlRodeo/views/rodeoNuevo.view.js';
import { initRodeoDetalleView, cargarRodeoDetalle } from './modules/controlRodeo/views/rodeoDetalle.view.js';
import { initRodeoSectoresView, cargarRodeoSectores } from './modules/controlRodeo/views/rodeoSectores.view.js';

// ── Módulo: Aserradero (dentro de Control Rodeo) ──────────
import { initAserraderoRecepcionRegistrosView, cargarAserraderoRecepcionRegistros } from './modules/aserradero/views/aserraderoRecepcionRegistros.view.js';
import { initAserraderoRecepcionNuevoView } from './modules/aserradero/views/aserraderoRecepcionNuevo.view.js';
import { initAserraderoRecepcionDetalleView, cargarAserraderoRecepcionDetalle } from './modules/aserradero/views/aserraderoRecepcionDetalle.view.js';
import { initAserraderoDespachoRegistrosView, cargarAserraderoDespachoRegistros } from './modules/aserradero/views/aserraderoDespachoRegistros.view.js';
import { initAserraderoDespachoNuevoView } from './modules/aserradero/views/aserraderoDespachoNuevo.view.js';
import { initAserraderoDespachoDetalleView, cargarAserraderoDespachoDetalle } from './modules/aserradero/views/aserraderoDespachoDetalle.view.js';

/* ===============================
   SPLASH
================================ */
function ocultarSplash() {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;
  splash.classList.add('splash-hide');
  splash.addEventListener('transitionend', () => splash.remove(), { once: true });
}

/* ===============================
   TIPOS DE USO
================================ */
const TIPOS_USO = [
  {
    id: 'combustible',
    nombre: 'Uso de Combustible',
    icono: '\u26FD',
    sub: 'Asignaciones de combustible',
    disponible: true,
  },
];

const TIPOS_USO_EXTRAS = [
  {
    id: 'control-rodeo',
    nombre: 'Control Rodeo',
    icono: '🐄',
    sub: 'Registro de animales',
    disponible: true,
  },
];

let tipoUsoActivo = null;

function getTipoUsoActivo() { return tipoUsoActivo; }
window.getTipoUsoActivo = getTipoUsoActivo;

function guardarTipoUsoActivo(uso) {
  tipoUsoActivo = uso;
  if (uso) {
    localStorage.setItem('tipoUsoActivo', uso.id);
  } else {
    localStorage.removeItem('tipoUsoActivo');
  }
}

function obtenerTipoUsoActivo() {
  const id = localStorage.getItem('tipoUsoActivo');
  if (!id) return null;
  return TIPOS_USO.find(t => t.id === id) ?? TIPOS_USO_EXTRAS.find(t => t.id === id);
}

/* ===============================
   SELECCIÓN DE PROPIEDAD
================================ */
async function mostrarSelectorPropiedad(empresas) {
  return new Promise(resolve => {
    const screen = document.getElementById('propiedad-screen');
    const cards  = document.getElementById('propiedad-cards');

    function obtenerLogoEmpresa(nombre) {
      const n = nombre.toUpperCase();
      if (n.includes('CURICHI')) return 'logos/CURICHI.png';
      if (n.includes('NUEVA ERA') || n.includes('GRANORTE')) return 'logos/GRANORTE.png';
      return null;
    }

    cards.innerHTML = empresas.map(e => {
      const logo = obtenerLogoEmpresa(e.nombre);
      const icono = logo
        ? `<img src="${logo}" class="propiedad-card-logo" alt="${e.nombre}">`
        : '🏡';
      return `
        <div class="propiedad-card" data-id="${e.id}">
          <div class="propiedad-card-icon">${icono}</div>
          <div class="propiedad-card-info">
            <div class="propiedad-card-nombre">${e.nombre}</div>
            <div class="propiedad-card-sub">Propiedad</div>
          </div>
          <div class="propiedad-card-arrow">›</div>
        </div>
      `;
    }).join('');

    screen.classList.remove('hidden');

    cards.querySelectorAll('.propiedad-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        const empresa = empresas.find(e => String(e.id) === String(id));
        setEmpresaActiva(empresa);

        screen.classList.add('propiedad-hide');
        screen.addEventListener('transitionend', () => {
          screen.remove();
          actualizarHeaderPropiedad(empresa.nombre);
          resolve(empresa);
        }, { once: true });
      });
    });
  });
}

async function initApp() {
  try {

    //await borrarBaseDeDatos();

    // Ocultar header y sidebar hasta que el usuario elija el tipo de uso
    document.body.classList.add('app-inactiva');

    await initSchema();

    await seedEmpresas();
    await seedEspecies();

    initSidebar();

    // ── Intentar restaurar sesión previa ──
    const empresaRestaurada = await restaurarEmpresaActiva();
    const usoRestaurado     = obtenerTipoUsoActivo();

    if (empresaRestaurada && usoRestaurado) {
      tipoUsoActivo = usoRestaurado;
      actualizarHeaderPropiedad(empresaRestaurada.nombre);
      actualizarHeaderUso(usoRestaurado);
      renderMenuModulo(usoRestaurado.id);
      document.body.classList.remove('app-inactiva');
      ocultarSplash();

      if (usoRestaurado.id === 'combustible') {
        window.showView('combustible-registros');
      } else if (usoRestaurado.id === 'control-rodeo') {
        window.showView('control-rodeo-registros');
      }
      return;
    }

    // ── Flujo normal (primera vez o sin sesión guardada) ──
    setTimeout(async () => {
      ocultarSplash();

      const empresas = await listarEmpresas();

      if (empresas.length === 1) {
        setEmpresaActiva(empresas[0]);
        actualizarHeaderPropiedad(empresas[0].nombre);
        await mostrarSelectorUso(empresas[0]);
        return;
      }

      const empresa = await mostrarSelectorPropiedad(empresas);
      await mostrarSelectorUso(empresa);

    }, 1800);

  } catch (e) {
    console.error('[APP] ❌ Error fatal:', e);
    ocultarSplash();
    alert(e.message);
  }
}

/* ===============================
   SELECCIÓN DE TIPO DE USO
================================ */
function crearUsoScreen() {
  let screen = document.getElementById('uso-screen');
  if (screen) screen.remove();
  screen = document.createElement('div');
  screen.id = 'uso-screen';
  screen.innerHTML = `
    <div class="splash-bg-ring splash-ring-1"></div>
    <div class="splash-bg-ring splash-ring-2"></div>
    <div class="splash-bg-ring splash-ring-3"></div>
    <div class="propiedad-content">
      <div class="uso-propiedad-badge" id="uso-propiedad-badge">🏡</div>
      <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem; width:100%; box-sizing:border-box; padding:0 0.25rem; margin-bottom:0.25rem">
        <div class="splash-texts" style="margin-bottom:0; align-items:flex-start; flex:1; min-width:0">
          <div class="splash-name" style="font-size:1.5rem; text-align:left; white-space:normal; line-height:1.2">¿Qué vas a hacer?</div>
          <div class="splash-tagline" style="text-align:left">Seleccioná el tipo de uso</div>
        </div>
        <button id="btn-uso-extras" style="background:rgba(255,255,255,0.15); border:1.5px solid rgba(255,255,255,0.3); color:#fff; font-size:1.4rem; font-weight:700; cursor:pointer; width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:background 0.18s, transform 0.12s; box-shadow:0 2px 8px rgba(0,0,0,0.2);">+</button>
      </div>
      <div class="propiedad-cards" id="uso-cards"></div>
    </div>
  `;
  document.body.prepend(screen);
  return screen;
}

async function mostrarSelectorUso(empresa) {
  return new Promise(resolve => {
    const screen = crearUsoScreen();
    const cards  = document.getElementById('uso-cards');

    const badge = document.getElementById('uso-propiedad-badge');
    if (badge) badge.textContent = `🏡 ${empresa.nombre}`;

    cards.innerHTML = TIPOS_USO.map(t => `
      <div class="propiedad-card ${!t.disponible ? 'propiedad-card--disabled' : ''}" data-id="${t.id}" ${!t.disponible ? 'aria-disabled="true"' : ''}>
        <div class="propiedad-card-icon">${t.icono}</div>
        <div class="propiedad-card-info">
          <div class="propiedad-card-nombre">${t.nombre}</div>
          <div class="propiedad-card-sub">${t.sub}</div>
        </div>
        <div class="propiedad-card-arrow">${t.disponible ? '›' : '🔒'}</div>
      </div>
    `).join('');

    screen.classList.remove('hidden', 'propiedad-hide');

    cards.querySelectorAll('.propiedad-card:not(.propiedad-card--disabled):not(.propiedad-card--extras)').forEach(card => {
      card.addEventListener('click', () => {
        const uso = TIPOS_USO.find(t => t.id === card.dataset.id);
        tipoUsoActivo = uso;
        guardarTipoUsoActivo(uso);

        screen.classList.add('propiedad-hide');
        screen.addEventListener('transitionend', () => {
          screen.remove();
          document.body.classList.remove('app-inactiva');

          // Renderizar el menú correcto según el módulo elegido
          renderMenuModulo(uso.id);

          actualizarHeaderUso(uso);

          // Navegar a la vista de inicio del módulo
          if (uso.id === 'combustible') {
            window.showView('combustible-registros');
          }

          resolve(uso);
        }, { once: true });
      });
    });

    document.getElementById('btn-uso-extras')?.addEventListener('click', () => {
      screen.classList.add('propiedad-hide');
      screen.addEventListener('transitionend', () => {
        screen.classList.add('hidden');
        mostrarSelectorExtras();
      }, { once: true });
    });

  });
}

async function cambiarUso() {
  const empresa = getEmpresaActiva();
  if (!empresa) return;

  const screen = crearUsoScreen();
  screen.classList.remove('hidden', 'propiedad-hide');

  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('overlay')?.classList.remove('active');

  await mostrarSelectorUso(empresa);
}

window.cambiarUso = cambiarUso;

/* ===============================
   SELECCIÓN DE MÓDULOS EXTRAS
================================ */
function crearExtrasScreen() {
  let screen = document.getElementById('extras-screen');
  if (!screen) {
    screen = document.createElement('div');
    screen.id = 'extras-screen';
    screen.innerHTML = `
      <div class="splash-bg-ring splash-ring-1"></div>
      <div class="splash-bg-ring splash-ring-2"></div>
      <div class="splash-bg-ring splash-ring-3"></div>
      <div class="propiedad-content">
        <div class="splash-texts">
          <div class="splash-name">Módulos adicionales</div>
          <div class="splash-tagline">Seleccioná una opción</div>
        </div>
        <div class="propiedad-cards" id="extras-cards"></div>
      </div>
    `;
    document.body.prepend(screen);
  }
  return screen;
}

async function mostrarSelectorExtras() {
  return new Promise(resolve => {
    const screen = crearExtrasScreen();
    const cards = document.getElementById('extras-cards');

    cards.innerHTML = TIPOS_USO_EXTRAS.map(t => `
      <div class="propiedad-card ${!t.disponible ? 'propiedad-card--disabled' : ''}" data-id="${t.id}" ${!t.disponible ? 'aria-disabled="true"' : ''}>
        <div class="propiedad-card-icon">${t.icono}</div>
        <div class="propiedad-card-info">
          <div class="propiedad-card-nombre">${t.nombre}</div>
          <div class="propiedad-card-sub">${t.sub}</div>
        </div>
        <div class="propiedad-card-arrow">${t.disponible ? '›' : '🔒'}</div>
      </div>
    `).join('');

    screen.classList.remove('hidden', 'propiedad-hide');

    cards.querySelectorAll('.propiedad-card:not(.propiedad-card--disabled)').forEach(card => {
      card.addEventListener('click', () => {
        const uso = TIPOS_USO_EXTRAS.find(t => t.id === card.dataset.id);
        tipoUsoActivo = uso;
        guardarTipoUsoActivo(uso);

        screen.classList.add('propiedad-hide');
        screen.addEventListener('transitionend', () => {
          screen.classList.add('hidden');
          document.body.classList.remove('app-inactiva');
          renderMenuModulo(uso.id);
          actualizarHeaderUso(uso);
          window.showView('control-rodeo-registros');
          resolve(uso);
        }, { once: true });
      });
    });
  });
}

window.mostrarSelectorExtras = mostrarSelectorExtras;

function actualizarHeaderUso(uso) {
  const header = document.querySelector('.header-title');
  const empresa = getEmpresaActiva();
  if (header && empresa) {
    header.textContent = `${uso.icono} ${empresa.nombre} · ${uso.nombre}`;
  }
  const sidebarUso = document.getElementById('sidebar-uso-nombre');
  if (sidebarUso) sidebarUso.textContent = uso.nombre;
}

async function cambiarPropiedad() {
  const empresas = await listarEmpresas();
  if (empresas.length <= 1) return;

  let screen = document.getElementById('propiedad-screen');
  if (!screen) {
    screen = document.createElement('div');
    screen.id = 'propiedad-screen';
    screen.innerHTML = `
      <div class="splash-bg-ring splash-ring-1"></div>
      <div class="splash-bg-ring splash-ring-2"></div>
      <div class="splash-bg-ring splash-ring-3"></div>
      <div class="propiedad-content">
        <div class="splash-logo-wrap"><div class="splash-logo">🌱</div></div>
        <div class="splash-texts">
          <div class="splash-name">AgroApp</div>
          <div class="splash-tagline">Seleccioná tu propiedad</div>
        </div>
        <div class="propiedad-cards" id="propiedad-cards"></div>
      </div>
    `;
    document.body.prepend(screen);
  }
  screen.classList.remove('hidden', 'propiedad-hide');

  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('overlay')?.classList.remove('active');

  const empresa = await mostrarSelectorPropiedad(empresas);
  await mostrarSelectorUso(empresa);

  // Navegar a la vista correspondiente al tipo de uso activo
  if (tipoUsoActivo?.id === 'combustible') {
    window.showView('combustible-registros');
  } else if (tipoUsoActivo?.id === 'control-rodeo') {
    window.showView('control-rodeo-registros');
  }
}

window.cambiarPropiedad = cambiarPropiedad;

function actualizarHeaderPropiedad(nombre) {
  const header = document.querySelector('.header-title');
  if (header) header.textContent = `🌱 ${nombre}`;
  const sidebarBtn = document.getElementById('sidebar-propiedad-nombre');
  if (sidebarBtn) sidebarBtn.textContent = nombre;
}

/* ===============================
   NAVEGACIÓN
================================ */
function showView(view, param = null) {
  document
    .querySelectorAll('section[id^="view-"]')
    .forEach(v => v.classList.add('hidden'));

  const section = document.getElementById(`view-${view}`);
  if (section) section.classList.remove('hidden');

  switch (view) {

    // ── Vistas compartidas (maestros) ──
    case 'empresas':          cargarEmpresas(); break;
    case 'especies':          initEspeciesView(); cargarEspecies(); break;

    // ── Módulo Combustible ──
    case 'combustible-registros': initRegistrosCombustibleView(); cargarRegistrosCombustible(); break;
    case 'combustible-nuevo':     initNuevaAsignacionCombustibleView(); cargarNuevaAsignacion(); break;
    case 'combustible-editar': {
      document.getElementById('view-combustible-nuevo').classList.remove('hidden');
      initNuevaAsignacionCombustibleView();
      if (param) cargarEdicionAsignacion(param);
      break;
    }
    case 'combustible-detalle': {
      initNuevaAsignacionCombustibleView();
      if (param) cargarDetalleCombustible(param);
      break;
    }

    // ── Módulo Control Rodeo ──
    case 'control-rodeo-registros': initRegistrosControlRodeoView(); cargarRegistrosCefo(); break;
    case 'control-rodeo-nuevo': initNuevaCefoView(); break;
    case 'control-rodeo-detalle': {
      initDetalleControlRodeoView();
      if (param) cargarDetalleCefo(param);
      break;
    }
    case 'control-rodeo-salida-registros': initRegistrosSalidaView(); cargarRegistrosSalida(); break;
    case 'control-rodeo-salida-nuevo': initNuevaSalidaView(); break;
    case 'control-rodeo-salida-detalle': {
      initDetalleSalidaView();
      if (param) cargarDetalleSalida(param);
      break;
    }

    // ── Módulo Aserradero ──
    case 'aserradero-recepcion-registros': initAserraderoRecepcionRegistrosView(); cargarAserraderoRecepcionRegistros(); break;
    case 'aserradero-recepcion-nuevo': initAserraderoRecepcionNuevoView(); break;
    case 'aserradero-recepcion-detalle': {
      initAserraderoRecepcionDetalleView();
      if (param) cargarAserraderoRecepcionDetalle(param);
      break;
    }
    case 'aserradero-despacho-registros': initAserraderoDespachoRegistrosView(); cargarAserraderoDespachoRegistros(); break;
    case 'aserradero-despacho-nuevo': initAserraderoDespachoNuevoView(); break;
    case 'aserradero-despacho-detalle': {
      initAserraderoDespachoDetalleView();
      if (param) cargarAserraderoDespachoDetalle(param);
      break;
    }

    // ── Módulo Rodeo ──
    case 'rodeo-registros': initRodeoRegistrosView(); cargarRodeoRegistros(); break;
    case 'rodeo-nuevo': initRodeoNuevoView(); cargarRodeoNuevoSectores(); break;
    case 'rodeo-detalle': {
      initRodeoDetalleView();
      if (param) cargarRodeoDetalle(param);
      break;
    }
    case 'rodeo-sectores': initRodeoSectoresView(); cargarRodeoSectores(); break;
  }
}

window.showView = showView;

/* ===============================
   NAVEGACIÓN CON HISTORIAL (BACK)
================================ */
const _historial = [];
let _vistaActual = 'combustible-registros';
let _paramActual = null;
window._backPresionado = false;

const _showViewOriginal = showView;
window.showView = function(view, param = null) {
  if (view !== _vistaActual) {
    _historial.push({ view: _vistaActual, param: _paramActual });
  }
  _vistaActual = view;
  _paramActual = param;
  _showViewOriginal(view, param);
};

function _manejarBack() {
  const modales = [...document.querySelectorAll('.modal')]
    .filter(m => !m.classList.contains('hidden') && m.offsetParent !== null);

  if (modales.length > 0) {
    modales[0].classList.add('hidden');
    return;
  }

  if (_historial.length > 0) {
    const anterior = _historial.pop();
    _vistaActual = anterior.view || 'combustible-registros';
    _paramActual = anterior.param;
    _showViewOriginal(_vistaActual, _paramActual);
    return;
  }

  if (_backPresionado) {
    try { window.Capacitor.Plugins.App.exitApp(); } catch(e) {}
    try { navigator.app.exitApp(); } catch(e) {}
    try { window.close(); } catch(e) {}
    return;
  }

  window._backPresionado = true;
  const toast = document.createElement('div');
  toast.textContent = 'Presioná atrás de nuevo para salir';
  toast.style.cssText = `
    position:fixed; bottom:5rem; left:50%; transform:translateX(-50%);
    background:rgba(30,61,30,0.92); color:#fff; padding:0.6rem 1.2rem;
    border-radius:2rem; font-size:0.85rem; z-index:9999;
    box-shadow:0 4px 16px rgba(0,0,0,0.3);
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    window._backPresionado = false;
    toast.remove();
  }, 2500);
}

window._manejarBack = _manejarBack;

if (!window.Capacitor?.isNativePlatform?.()) {
  document.addEventListener('backbutton', _manejarBack, false);
}

/* ===============================
   START
================================ */
initApp();
