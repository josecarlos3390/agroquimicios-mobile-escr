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

  // Botón hamburguesa
  menuBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleMenu();
  });

  // Cerrar al tocar el overlay
  overlay.addEventListener('click', () => closeMenu());

  // Cerrar con ESC (teclado físico en Android)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) closeMenu();
  });

  // FIX #9: cerrar sidebar al navegar Y activar el item seleccionado
  document.querySelectorAll('.sidebar-menu a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.dataset.view;

      // Marcar el item activo visualmente
      document.querySelectorAll('.sidebar-menu a').forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      closeMenu();
      window.showView(view);  // navegar después de cerrar
    });
  });

  // Mostrar sidebar desplegado al iniciar
  openMenu();

}