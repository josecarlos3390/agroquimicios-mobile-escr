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
  combustible: `
    <p class="menu-title">\u26FD Operación</p>
    <a href="#" data-view="combustible-registros">\uD83D\uDCCB Asignaciones</a>
    <a href="#" data-view="combustible-nuevo">\u2795 Nueva asignación</a>

    <div class="menu-divider"></div>

    <p class="menu-title">\uD83D\uDCC2 Maestros</p>
    <a href="#" data-view="empresas">\uD83C\uDFE0 Propiedades</a>
  `,

  'control-rodeo': `
    <p class="menu-title">🌲 Entradas</p>
    <a href="#" data-view="rodeo-registros">📋 Registros Rodeo</a>

    <div class="menu-divider"></div>

    <p class="menu-title">🌲 Monte</p>
    <a href="#" data-view="control-rodeo-salida-registros">🌲 Despachos</a>

    <div class="menu-divider"></div>

    <p class="menu-title">🪵 Aserradero</p>
    <a href="#" data-view="aserradero-recepcion-registros">📥 Recepción</a>
    <a href="#" data-view="aserradero-despacho-registros">📦 Despacho</a>

    <div class="menu-divider"></div>

    <p class="menu-title">🌿 Maestros</p>
    <a href="#" data-view="empresas">🏢 Propiedades</a>
    <a href="#" data-view="especies">🌿 Especies</a>
    <a href="#" data-view="rodeo-sectores">🗺️ Sectores de Rodeo</a>
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

  const html = MENUS[moduloId] ?? MENUS['combustible'];
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
    combustible: 'Uso de Combustible',
    'control-rodeo': 'Control Rodeo',
  };
  const subtitle = document.querySelector('.sidebar-header-subtitle');
  if (subtitle) subtitle.textContent = subtitles[moduloId] ?? '';
}
