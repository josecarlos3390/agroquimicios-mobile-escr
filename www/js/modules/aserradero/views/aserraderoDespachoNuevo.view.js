import { crearDespachoCabecera } from '../services/aserraderoDespacho.service.js';

let inicializado = false;

export function initAserraderoDespachoNuevoView() {
  if (inicializado) return;
  inicializado = true;

  const form = document.getElementById('form-aserradero-despacho-nuevo');

  document.getElementById('btn-aserradero-despacho-nuevo-volver')
    ?.addEventListener('click', () => {
      window.showView('aserradero-despacho-registros');
    });

  form?.addEventListener('submit', async e => {
    e.preventDefault();

    const btn = document.getElementById('btn-aserradero-despacho-guardar');
    btn.disabled = true;
    btn.textContent = '⏳ Guardando...';

    try {
      const resultado = await crearDespachoCabecera({
        nroDespacho: document.getElementById('aserradero-despacho-nro').value,
        fechaDespacho: document.getElementById('aserradero-despacho-fecha').value,
        placa: document.getElementById('aserradero-despacho-placa').value,
        chofer: document.getElementById('aserradero-despacho-chofer').value,
        observaciones: document.getElementById('aserradero-despacho-observaciones').value,
      });

      form.reset();
      window.showView('aserradero-despacho-detalle', resultado.id);

    } catch (err) {
      alert('❌ ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '💾 Guardar y continuar';
    }
  });
}
