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
  } catch (e) {
    console.error('[APP] ❌ Error fatal:', e);
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
   START
================================ */
initApp();
