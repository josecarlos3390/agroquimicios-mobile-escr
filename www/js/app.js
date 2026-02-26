  /* ===============================
   IMPORTS
================================ */
import { borrarBaseDeDatos } from './db/sqlite.js';


import { initSidebar } from './ui/sidebar.js';
import { initSchema } from './db/schema.js';

import {
  seedEmpresas,
  seedCultivos,
  seedTecnicos,
  seedTiposAplicacion,
  seedCaudales,
  seedTiposProducto,
  seedUnidadesMedida,
} from './db/seed.js';

// Views
import { cargarEmpresas } from './views/empresas.view.js';
import { initCultivosView, cargarCultivos } from './views/cultivos.view.js';
import { initTecnicosView, cargarTecnicos } from './views/tecnicos.view.js';
import { initCaudalesView, cargarCaudales } from './views/caudales.view.js';
import { initSectoresView } from './views/sectores.view.js';
import { initLotesView, cargarVistaLotes } from './views/lotes.view.js';
import { initVariedadesView, cargarVistaVariedades } from './views/variedades.view.js';
import { initProductosView, cargarProductos } from './views/productos.view.js';
import { initTiposProductoView, cargarTiposProducto } from './views/tiposProducto.view.js';
import { initTiposAplicacionView, cargarTiposAplicacion } from './views/tiposAplicacion.view.js';
import { initUnidadesMedidaView, cargarUnidadesMedida } from './views/unidadesMedida.view.js';
import { initNuevaHojaView, cargarNuevaHoja } from './views/hojaNueva.view.js';
import { initHojaDetalleView, cargarHojaDetalle } from './views/hojaDetalle.view.js';
import { initHojasView, cargarHojas } from './views/hojas.view.js';
import { initHojaEditarView, cargarHojaEditar } from './views/hojaEditar.view.js';
import { initImportacionView, cargarImportacion } from './views/importacion.view.js';

function ocultarSplash() {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;
  // Lanzar animación de salida (encoge + desvanece)
  splash.classList.add('splash-hide');
  // Remover del DOM al terminar la transición
  splash.addEventListener('transitionend', () => splash.remove(), { once: true });
}

async function initApp() {
  try {
  
    //await borrarBaseDeDatos();
    
    await initSchema();

    await seedEmpresas();
    await seedCultivos();
    await seedTiposAplicacion();
    await seedCaudales();
    await seedTiposProducto();
    await seedUnidadesMedida();
    await seedTecnicos();
    //await seedVariedades();
    //await seedSectoresDemo();
    //await seedLotesDemo();
    //await seedProductos();
    //await seedProductosUnidades();

    initSidebar();
    
    initHojasView();
    
    await cargarHojas();

    // Mínimo 1.8 s de splash para que la animación se vea completa,
    // luego desvanece con la animación de salida.
    setTimeout(ocultarSplash, 1800);

  } catch (e) {
    console.error('[APP] ❌ Error fatal:', e);
    ocultarSplash();
    alert(e.message);
  }
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
    case 'empresas':
      cargarEmpresas();
      break;

    case 'cultivos':
      initCultivosView();
      cargarCultivos();
      break;

    case 'tecnicos':
      initTecnicosView();
      cargarTecnicos();
      break;

    case 'caudales':
      initCaudalesView();
      cargarCaudales();
      break;
    
    case 'sectores':
      initSectoresView();
      break;
    
    case 'lotes':
      initLotesView();
      cargarVistaLotes();
      break;
    
    case 'variedades':
      initVariedadesView();  // 👈 faltaba esto
      cargarVistaVariedades();
      break;

    case 'productos':
      initProductosView();
      cargarProductos();
      break;  

    case 'tipos-producto':
      initTiposProductoView();
      cargarTiposProducto();
      break;

    case 'tipos-aplicacion':
      initTiposAplicacionView();
      cargarTiposAplicacion();
      break;

    case 'unidades':
      initUnidadesMedidaView();
      cargarUnidadesMedida();
      break;

    case 'hoja-detalle':
      initHojaDetalleView();
      if (param) cargarHojaDetalle(param);
      break;

    case 'hojas':
      initHojasView();
      cargarHojas();
      break;

    case 'nueva-hoja':
      initNuevaHojaView();
      cargarNuevaHoja();
      break; 
    
    case 'editar-hoja':
      initHojaEditarView();
      if (param) cargarHojaEditar(param);
      break;

    case 'importacion':
      initImportacionView();
      cargarImportacion();
      break;
  }
}

// 👇 DEBE IR AQUÍ, después de definir showView
window.showView = showView;

document.querySelectorAll('[data-view]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    showView(link.dataset.view);
  });
});

/* ===============================
   NAVEGACIÓN CON HISTORIAL (BACK)
================================ */
const _historial = [];
let _vistaActual = 'hojas';
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
  
  console.log('[BACK] modales abiertos:', modales.map(m => m.id));
  console.log('[BACK] historial:', _historial.length);
  console.log('[BACK] backPresionado:', _backPresionado);

  if (modales.length > 0) {
    modales[0].classList.add('hidden');
    return;
  }

  if (_historial.length > 0) {
    const anterior = _historial.pop();
    _vistaActual = anterior.view || 'hojas';
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

// Solo un listener — MainActivity.java llama window._manejarBack() directamente
// Los eventos de abajo son solo fallback para desarrollo en navegador
if (!window.Capacitor?.isNativePlatform?.()) {
  document.addEventListener('backbutton', _manejarBack, false);
}

/* ===============================
   START
================================ */
initApp();
