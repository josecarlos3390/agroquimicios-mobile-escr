import { crearRecepcionCabecera } from '../services/aserraderoRecepcion.service.js';

let inicializado = false;

export function initAserraderoRecepcionNuevoView() {
  if (inicializado) return;
  inicializado = true;

  const form = document.getElementById('form-aserradero-recepcion-nuevo');

  document.getElementById('btn-aserradero-recepcion-nuevo-volver')
    ?.addEventListener('click', () => {
      window.showView('aserradero-recepcion-registros');
    });

  form?.addEventListener('submit', async e => {
    e.preventDefault();

    const btn = document.getElementById('btn-aserradero-recepcion-guardar');
    btn.disabled = true;
    btn.textContent = '⏳ Guardando...';

    try {
      const resultado = await crearRecepcionCabecera({
        nroRecepcion: document.getElementById('aserradero-recepcion-nro').value,
        fechaRecepcion: document.getElementById('aserradero-recepcion-fecha').value,
        placa: document.getElementById('aserradero-recepcion-placa').value,
        chofer: document.getElementById('aserradero-recepcion-chofer').value,
        observaciones: document.getElementById('aserradero-recepcion-observaciones').value,
      });

      form.reset();
      window.showView('aserradero-recepcion-detalle', resultado.id);

    } catch (err) {
      alert('❌ ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '💾 Guardar y continuar';
    }
  });
}
