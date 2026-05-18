import { obtenerNotaCana, prepararExcelCana } from '../services/cana.service.js';
import { formatFecha } from '../../../utils/fecha.js';

let inicializado = false;
let notaActual = null;

export function initCanaDetalleView() {
  if (inicializado) return;
  inicializado = true;

  document.getElementById('btn-cana-detalle-volver').onclick = () =>
    window.showView('cana-registros');

  document.getElementById('btn-cana-detalle-editar').onclick = () => {
    if (notaActual) window.showView('cana-editar', notaActual.cab.id);
  };

  document.getElementById('btn-cana-detalle-exportar').onclick = async () => {
    if (!notaActual) return;
    const btn = document.getElementById('btn-cana-detalle-exportar');
    btn.disabled = true; btn.textContent = '⏳ Exportando...';
    try {
      const { base64, nombre } = await prepararExcelCana(notaActual.cab.id);
      const { Filesystem, Share } = window.Capacitor.Plugins;
      const base64Limpio = base64.includes(',') ? base64.split(',')[1] : base64;
      const dataUri = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64Limpio}`;
      const resultado = await Filesystem.writeFile({ path: nombre, data: dataUri, directory: 'CACHE', recursive: true });
      await Share.share({
        title: 'Plantación de Caña - AgroApp',
        text: `Exportación: ${notaActual.cab.numero_completo}`,
        files: [resultado.uri],
        dialogTitle: '¿Dónde querés enviar el Excel?'
      });
    } catch (err) {
      if (err.message?.includes('cancel') || err.message?.includes('dismiss')) { /* usuario canceló */ }
      else { alert('❌ No se pudo exportar:\n' + err.message); }
    } finally {
      btn.disabled = false; btn.textContent = '📤 Exportar';
    }
  };
}

export async function cargarCanaDetalle(id) {
  const data = await obtenerNotaCana(id);
  if (!data) {
    alert('No se encontró la nota');
    window.showView('cana-registros');
    return;
  }

  notaActual = data;
  const c = data.cab;

  // Cabecera
  document.getElementById('cd-numero').textContent = c.numero_completo ?? '—';
  document.getElementById('cd-empresa').textContent = c.empresa_nombre ?? '—';
  document.getElementById('cd-tecnico').textContent = c.tecnico_nombre ?? '—';
  document.getElementById('cd-campana').textContent = c.campana ?? '—';
  document.getElementById('cd-fecha').textContent = formatFecha(c.fecha);
  document.getElementById('cd-mes').textContent = c.mes ?? '—';
  document.getElementById('cd-estado').textContent = c.estado ?? '—';
  document.getElementById('cd-obs').textContent = c.observaciones ?? '—';

  // Plantaciones
  const contPlant = document.getElementById('cd-plantaciones');
  if (!data.plantaciones?.length) {
    contPlant.innerHTML = '<p style="color:var(--text-muted);font-size:0.88rem">Sin plantaciones registradas.</p>';
  } else {
    contPlant.innerHTML = data.plantaciones.map(p => `
      <div class="detalle-bloque">
        <div class="detalle-bloque-header">
          <strong>🌿 ${p.lote_nombre ?? 'Lote sin nombre'}</strong>
          <span class="hoja-pill">${p.ha_total ?? 0} ha</span>
        </div>
        <div class="detalle-bloque-body">
          <div class="detalle-grid">
            <span>📅 ${formatFecha(p.fecha_inicio)}${p.fecha_fin && p.fecha_fin !== p.fecha_inicio ? ' → ' + formatFecha(p.fecha_fin) : ''}</span>
            <span>🌱 ${p.variedad_nombre ?? 'Sin variedad'}</span>
            <span>✋ Manual: ${p.ha_manual ?? 0} ha</span>
            <span>🚜 Mecanizada: ${p.ha_mecanizada ?? 0} ha</span>
            ${p.cantidad_sembradora_grupos ? `<span>⚙️ ${p.cantidad_sembradora_grupos}</span>` : ''}
          </div>
        </div>
      </div>
    `).join('');
  }
}
