import { crearCefoCabecera } from '../../../services/cefo.service.js';

let inicializado = false;

export function initNuevaCefoView() {
  if (inicializado) return;
  inicializado = true;

  const form = document.getElementById('form-cefo-nuevo');

  document.getElementById('btn-cefo-nuevo-volver')
    ?.addEventListener('click', () => {
      window.showView('control-rodeo-registros');
    });

  form?.addEventListener('submit', async e => {
    e.preventDefault();

    const btn = document.getElementById('btn-cefo-guardar');
    btn.disabled = true;
    btn.textContent = '⏳ Guardando...';

    try {
      const resultado = await crearCefoCabecera({
        nroCfoRecib: document.getElementById('cefo-nro-cfo').value,
        fechaRecep: document.getElementById('cefo-fecha').value,
        placa: document.getElementById('cefo-placa').value,
        chofer: document.getElementById('cefo-chofer').value,
        observaciones: document.getElementById('cefo-observaciones').value,
      });

      form.reset();
      window.showView('control-rodeo-detalle', resultado.id);

    } catch (err) {
      alert('❌ ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '💾 Guardar y continuar';
    }
  });
}
