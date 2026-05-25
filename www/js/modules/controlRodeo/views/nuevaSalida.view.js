import { crearSalidaCabecera } from '../../../services/cefoSalida.service.js';

let inicializado = false;

export function initNuevaSalidaView() {
  if (inicializado) return;
  inicializado = true;

  const form = document.getElementById('form-salida-nuevo');

  document.getElementById('btn-salida-nuevo-volver')
    ?.addEventListener('click', () => {
      window.showView('control-rodeo-salida-registros');
    });

  form?.addEventListener('submit', async e => {
    e.preventDefault();

    const btn = document.getElementById('btn-salida-guardar');
    btn.disabled = true;
    btn.textContent = '⏳ Guardando...';

    try {
      const resultado = await crearSalidaCabecera({
        nroCfoDespacho: document.getElementById('salida-nro-cfo').value,
        fechaDespacho: document.getElementById('salida-fecha').value,
        placa: document.getElementById('salida-placa').value,
        chofer: document.getElementById('salida-chofer').value,
        observaciones: document.getElementById('salida-observaciones').value,
      });

      form.reset();
      window.showView('control-rodeo-salida-detalle', resultado.id);

    } catch (err) {
      alert('❌ ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '💾 Guardar y continuar';
    }
  });
}
