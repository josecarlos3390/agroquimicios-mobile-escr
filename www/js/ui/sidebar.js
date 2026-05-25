/* =========================================================
   DARK MODE — persiste en localStorage
========================================================= */
function initDarkMode() {
  const saved = localStorage.getItem('darkMode');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = saved !== null ? saved === 'true' : prefersDark;

  if (isDark) applyDark(true, false);

  document.getElementById('dark-mode-toggle')?.addEventListener('click', () => {
    const nowDark = document.body.classList.toggle('dark');
    localStorage.setItem('darkMode', nowDark);
    applyDark(nowDark, true);
  });
}

function applyDark(isDark, animate) {
  document.body.classList.toggle('dark', isDark);
  const icon  = document.getElementById('dark-mode-icon');
  const label = document.getElementById('dark-mode-label');
  if (icon)  icon.textContent  = isDark ? '☀️' : '🌙';
  if (label) label.textContent = isDark ? 'Modo claro' : 'Modo oscuro';

  if (animate) {
    document.body.style.transition = 'background 0.3s, color 0.3s';
    setTimeout(() => document.body.style.transition = '', 400);
  }
}

/* =========================================================
   MENÚS POR MÓDULO
========================================================= */
const MENUS = {
  agroquimicos: `
    <p class="menu-title">📋 Operación</p>
    <a href="#" data-view="hojas">📝 Hojas de trabajo</a>
    <a href="#" data-view="nueva-hoja">➕ Nueva hoja</a>

    <div class="menu-divider"></div>

    <p class="menu-title">🌱 Maestros</p>
    <a href="#" data-view="empresas">🏢 Empresas</a>
    <a href="#" data-view="sectores">🗺️ Sectores</a>
    <a href="#" data-view="lotes">🌿 Lotes</a>
    <a href="#" data-view="cultivos">🌾 Cultivos</a>
    <a href="#" data-view="variedades">🌱 Variedades</a>
    <a href="#" data-view="tecnicos">👨‍🌾 Técnicos</a>
    <a href="#" data-view="productos">🧪 Productos</a>

    <div class="menu-divider"></div>

    <p class="menu-title">⚙️ Configuración</p>
    <a href="#" data-view="tipos-producto">🏷️ Tipos de producto</a>
    <a href="#" data-view="tipos-aplicacion">🚜 Tipos de aplicación</a>
    <a href="#" data-view="unidades">📏 Unidades de medida</a>
    <a href="#" data-view="importacion">📥 Actualizar datos</a>
  `,

  cana: `
    <p class="menu-title">🌾 Operación</p>
    <a href="#" data-view="cana-registros">📋 Registros</a>
    <a href="#" data-view="cana-nuevo">➕ Nuevo registro</a>

    <div class="menu-divider"></div>

    <p class="menu-title">📂 Maestros compartidos</p>
    <a href="#" data-view="sectores">🗺️ Sectores</a>
    <a href="#" data-view="lotes">🌿 Lotes y variedades</a>
    <a href="#" data-view="cultivos">🌾 Cultivos</a>
    <a href="#" data-view="variedades">🌱 Variedades</a>
    <a href="#" data-view="tecnicos">👨‍🌾 Técnicos</a>

    <div class="menu-divider"></div>

    <p class="menu-title">⚙️ Configuración</p>
    <a href="#" data-view="importacion">📥 Actualizar datos</a>
  `,

  combustible: `
    <p class="menu-title">\u26FD Operación</p>
    <a href="#" data-view="combustible-registros">\uD83D\uDCCB Asignaciones</a>
    <a href="#" data-view="combustible-nuevo">\u2795 Nueva asignación</a>

    <div class="menu-divider"></div>

    <p class="menu-title">\uD83D\uDCC2 Maestros compartidos</p>
    <a href="#" data-view="sectores">\uD83D\uDDFA\uFE0F Sectores</a>
    <a href="#" data-view="lotes">\uD83C\uDF3F Lotes</a>
    <a href="#" data-view="cultivos">\uD83C\uDF3E Cultivos</a>
    <a href="#" data-view="variedades">\uD83C\uDF31 Variedades</a>
    <a href="#" data-view="tecnicos">\uD83D\uDC68\u200D\uD83C\uDF3E Técnicos</a>

    <div class="menu-divider"></div>

    <p class="menu-title">\u2699\uFE0F Configuración</p>
    <a href="#" data-view="importacion">\uD83D\uDCE5 Actualizar datos</a>
  `,

  'corte-semilla': `
    <p class="menu-title">\u2702\uFE0F Operación</p>
    <a href="#" data-view="corte-semilla-registros">\uD83D\uDCCB Registros</a>
    <a href="#" data-view="corte-semilla-nuevo">\u2795 Nuevo corte</a>

    <div class="menu-divider"></div>

    <p class="menu-title">\uD83D\uDCC2 Maestros compartidos</p>
    <a href="#" data-view="sectores">\uD83D\uDDFA\uFE0F Sectores</a>
    <a href="#" data-view="lotes">\uD83C\uDF3F Lotes</a>
    <a href="#" data-view="cultivos">\uD83C\uDF3E Cultivos</a>
    <a href="#" data-view="variedades">\uD83C\uDF31 Variedades</a>
    <a href="#" data-view="tecnicos">\uD83D\uDC68\u200D\uD83C\uDF3E Técnicos</a>

    <div class="menu-divider"></div>

    <p class="menu-title">\u2699\uFE0F Configuración</p>
    <a href="#" data-view="importacion">\uD83D\uDCE5 Actualizar datos</a>
  `,

  'guia-transporte-cana': `
    <p class="menu-title">\uD83D\uDCDC Operación</p>
    <a href="#" data-view="guia-transporte-registros">\uD83D\uDCCB Guías</a>
    <a href="#" data-view="guia-transporte-nuevo">\u2795 Nueva guía</a>

    <div class="menu-divider"></div>

    <p class="menu-title">\uD83D\uDCC2 Maestros compartidos</p>
    <a href="#" data-view="sectores">\uD83D\uDDFA\uFE0F Sectores</a>
    <a href="#" data-view="lotes">\uD83C\uDF3F Lotes</a>
    <a href="#" data-view="cultivos">\uD83C\uDF3E Cultivos</a>
    <a href="#" data-view="variedades">\uD83C\uDF31 Variedades</a>
    <a href="#" data-view="tecnicos">\uD83D\uDC68\u200D\uD83C\uDF3E Técnicos</a>

    <div class="menu-divider"></div>

    <p class="menu-title">\u2699\uFE0F Configuración</p>
    <a href="#" data-view="importacion">\uD83D\uDCE5 Actualizar datos</a>
  `,

  'control-rodeo': `
    <p class="menu-title">🐄 Entradas</p>
    <a href="#" data-view="control-rodeo-registros">📋 Registros CFO</a>

    <div class="menu-divider"></div>

    <p class="menu-title">📦 Salidas</p>
    <a href="#" data-view="control-rodeo-salida-registros">📦 Despachos</a>

    <div class="menu-divider"></div>

    <p class="menu-title">🌿 Maestros</p>
    <a href="#" data-view="especies">🌿 Especies</a>

    <div class="menu-divider"></div>

    <p class="menu-title">⚙️ Configuración</p>
    <a href="#" data-view="importacion">📥 Actualizar datos</a>
  `,
};

/* =========================================================
   INIT SIDEBAR
========================================================= */
export function initSidebar() {
  initDarkMode();

  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const menuBtn = document.getElementById('menu-btn');

  if (!sidebar || !overlay || !menuBtn) {
    console.error('❌ Sidebar: elementos no encontrados');
    return;
  }

  function openMenu() {
    sidebar.classList.add('open');
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
    document.body.style.overflow = '';
  }

  function toggleMenu() {
    sidebar.classList.contains('open') ? closeMenu() : openMenu();
  }

  menuBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleMenu();
  });

  overlay.addEventListener('click', () => closeMenu());

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) closeMenu();
  });

  openMenu();
}

/* =========================================================
   RENDER DINÁMICO SEGÚN MÓDULO
========================================================= */
export function renderMenuModulo(moduloId) {
  const nav = document.querySelector('#sidebar .sidebar-menu');
  if (!nav) return;

  const html = MENUS[moduloId] ?? MENUS['agroquimicos'];
  nav.innerHTML = html;

  // Re-registrar listeners en los nuevos links
  nav.querySelectorAll('a[data-view]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      nav.querySelectorAll('a').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.getElementById('sidebar')?.classList.remove('open');
      document.getElementById('overlay')?.classList.remove('show');
      document.body.style.overflow = '';
      window.showView(link.dataset.view);
    });
  });

  // Actualizar subtítulo del header del sidebar
  const subtitles = {
    agroquimicos: 'Gestión Agroquímica',
    cana: 'Plantación de Caña',
    combustible: 'Uso de Combustible',
    'corte-semilla': 'Corte de Semilla',
    'guia-transporte-cana': 'Guía de Transporte de Caña',
    'control-rodeo': 'Control Rodeo',
  };
  const subtitle = document.querySelector('.sidebar-header-subtitle');
  if (subtitle) subtitle.textContent = subtitles[moduloId] ?? '';
}