/**
 * confirmar(opciones) — modal custom que reemplaza confirm() nativo
 * Retorna Promise<boolean>
 *
 * Opciones:
 *   titulo        — texto principal
 *   msg           — texto secundario
 *   icon          — emoji del encabezado (default '⚠️')
 *   okLabel       — texto botón confirmar
 *   okClass       — clase CSS del botón ok
 *   hideCancelBtn — si true, oculta el botón cancelar (modo alerta)
 */
export function confirmar({
  titulo        = '¿Estás seguro?',
  msg           = '',
  icon          = '⚠️',
  okLabel       = 'Eliminar',
  okClass       = 'modal-confirm-btn-danger',
  hideCancelBtn = false,
} = {}) {
  return new Promise((resolve) => {
    const modal     = document.getElementById('modal-confirm');
    const elIcon    = document.getElementById('modal-confirm-icon');
    const elTitulo  = document.getElementById('modal-confirm-title');
    const elMsg     = document.getElementById('modal-confirm-msg');
    const btnOk     = document.getElementById('modal-confirm-ok');
    const btnCancel = document.getElementById('modal-confirm-cancel');

    elIcon.textContent   = icon;
    elTitulo.textContent = titulo;
    // Preservar saltos de línea en el mensaje
    elMsg.style.whiteSpace = 'pre-wrap';
    elMsg.textContent    = msg;
    btnOk.textContent    = okLabel;
    btnOk.className      = okClass;

    // Modo alerta: sin botón cancelar
    btnCancel.style.display = hideCancelBtn ? 'none' : '';

    modal.classList.remove('hidden');

    function onOk() { cleanup(); resolve(true); }
    function onCancel() { cleanup(); resolve(false); }
    function onBackdrop(e) {
      if (e.target === modal) { cleanup(); resolve(false); }
    }
    function cleanup() {
      modal.classList.add('hidden');
      btnCancel.style.display = '';
      btnOk.removeEventListener('click', onOk);
      btnCancel.removeEventListener('click', onCancel);
      modal.removeEventListener('click', onBackdrop);
    }

    btnOk.addEventListener('click', onOk);
    btnCancel.addEventListener('click', onCancel);
    modal.addEventListener('click', onBackdrop);
  });
}