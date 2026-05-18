import { uuid } from '../../../utils/uuid.js';
import { getModeloDispositivo } from '../../../utils/device.js';
import { MESES } from '../../../utils/fecha.js';
import {
  createCorteSemillaCab, getNextNumeroSecuencialCorteSemilla,
  getCorteSemillaCabs, getCorteSemillaCabById,
  deleteCorteSemillaCab, updateCorteSemillaCab,
  insertCorteSemillaDetalle, getCortesByCab, deleteCortesByCab,
  getLineasExportacionCorteSemilla,
} from '../repositories/corteSemilla.repo.js';

export async function crearCorteSemilla(data) {
  if (!data.fecha) throw new Error('Fecha requerida');
  if (!data.cortes || data.cortes.length === 0)
    throw new Error('Debe agregar al menos un corte de semilla');

  const cabId = uuid();
  const secuencial = await getNextNumeroSecuencialCorteSemilla();

  const ahora = new Date();
  const diames = String(ahora.getDate()).padStart(2, '0');
  const corr = String(secuencial).padStart(3, '0');
  const modelo = await getModeloDispositivo();

  const mes = MESES[new Date(data.fecha + 'T00:00:00').getMonth()];

  await createCorteSemillaCab({
    id: cabId,
    numero_secuencial: secuencial,
    numero_completo: `CSEM-${mes.substr(0,3)}${diames}-${corr}`,
    dispositivo_id: modelo,
    campana: data.campana ?? String(ahora.getFullYear()),
    empresa_id: data.empresa_id,
    tecnico_id: data.tecnico_id ?? null,
    fecha: data.fecha,
    mes,
    observaciones: data.observaciones ?? null,
  });

  for (let i = 0; i < data.cortes.length; i++) {
    const c = data.cortes[i];
    const supCorte = parseFloat(c.sup_corte_ha) || 0;
    const tnManual = parseFloat(c.tn_cortadas_manual) || 0;
    const totalGen = parseFloat(c.total_general_ha) || 0;

    await insertCorteSemillaDetalle({
      cab_id: cabId,
      lote_semilla_id: c.lote_semilla_id ?? null,
      variedad_id: c.variedad_id ?? null,
      fecha_corte: c.fecha_corte ?? null,
      sup_corte_ha: c.sup_corte_ha ?? null,
      rendimiento_tn_ha: supCorte > 0 ? tnManual / supCorte : null,
      tn_cortadas_manual: tnManual,
      tn_cortadas_mecanizada: c.tn_cortadas_mecanizada ?? 0,
      consumo_semilla_tn_ha: totalGen > 0 ? tnManual / totalGen : null,
      lote_plantado_id: c.lote_plantado_id ?? null,
      total_general_ha: c.total_general_ha ?? null,
      sup_plantada_mec_ha: c.sup_plantada_mec_ha ?? null,
      orden: i,
    });
  }

  return cabId;
}

export async function obtenerCorteSemilla(id) {
  const cab = await getCorteSemillaCabById(id);
  if (!cab) return null;
  const cortes = await getCortesByCab(id);
  return { cab, cortes };
}

export async function listarCorteSemilla(estado = null) {
  return await getCorteSemillaCabs(estado);
}

export async function eliminarCorteSemilla(id) {
  return await deleteCorteSemillaCab(id);
}

export async function actualizarCorteSemillaCompleta(id, data) {
  const cabActual = await getCorteSemillaCabById(id);
  const estado = cabActual?.estado ?? 'BORRADOR';

  const mes = MESES[new Date(data.fecha + 'T00:00:00').getMonth()];

  await updateCorteSemillaCab(id, {
    empresa_id: data.empresa_id,
    tecnico_id: data.tecnico_id ?? null,
    campana: data.campana,
    fecha: data.fecha,
    mes,
    observaciones: data.observaciones ?? null,
    estado,
  });

  await deleteCortesByCab(id);

  for (let i = 0; i < data.cortes.length; i++) {
    const c = data.cortes[i];
    const supCorte = parseFloat(c.sup_corte_ha) || 0;
    const tnManual = parseFloat(c.tn_cortadas_manual) || 0;
    const totalGen = parseFloat(c.total_general_ha) || 0;

    await insertCorteSemillaDetalle({
      cab_id: id,
      lote_semilla_id: c.lote_semilla_id ?? null,
      variedad_id: c.variedad_id ?? null,
      fecha_corte: c.fecha_corte ?? null,
      sup_corte_ha: c.sup_corte_ha ?? null,
      rendimiento_tn_ha: supCorte > 0 ? tnManual / supCorte : null,
      tn_cortadas_manual: tnManual,
      tn_cortadas_mecanizada: c.tn_cortadas_mecanizada ?? 0,
      consumo_semilla_tn_ha: totalGen > 0 ? tnManual / totalGen : null,
      lote_plantado_id: c.lote_plantado_id ?? null,
      total_general_ha: c.total_general_ha ?? null,
      sup_plantada_mec_ha: c.sup_plantada_mec_ha ?? null,
      orden: i,
    });
  }

  return id;
}

/* =========================================================
   EXPORTACIÓN A EXCEL
======================================================== */
export async function prepararExcelCorteSemilla(cabId) {
  const lineas = await getLineasExportacionCorteSemilla(cabId);

  const filas = lineas.map(row => {
    const tnManual = parseFloat(row.tn_cortadas_manual) || 0;
    const tnMecanizada = parseFloat(row.tn_cortadas_mecanizada) || 0;
    const supCorte = parseFloat(row.sup_corte_ha) || 0;
    const supPlantadaManual = parseFloat(row.total_general_ha) || 0;
    const total = tnManual + tnMecanizada;
    const tnHa = supPlantadaManual > 0 ? tnManual / supPlantadaManual : 0;
    const productividad = supCorte > 0 ? total / supCorte : 0;

    return {
      'Fecha Corte':                row.fecha_corte ?? '',
      'Código Sector (Corte)':      row.corte_sector_codigo ?? '',
      'Nombre Sector (Corte)':      row.corte_sector_nombre ?? '',
      'Lote Semilla (Origen)':      row.lote_semilla_nombre ?? '',
      'Variedad (Corte)':           row.variedad_nombre ?? '',
      'Sup. Corte (HA)':            row.sup_corte_ha ?? 0,
      'TN/HA':                      parseFloat(tnHa.toFixed(4)),
      'Productividad TN/HA':        parseFloat(productividad.toFixed(4)),
      'TN Cortadas Manual':         tnManual,
      'TN Cortadas Mecanizada':     tnMecanizada,
      'Total (t)':                  parseFloat(total.toFixed(4)),
      'Prop. Sembrada':             row.lote_plantado_sector_nombre ?? '',
      'Lote Sembrado':              row.lote_plantado_nombre ?? '',
    };
  });

  const headers = [
    'Fecha Corte', 'Código Sector (Corte)', 'Nombre Sector (Corte)',
    'Lote Semilla (Origen)', 'Variedad (Corte)', 'Sup. Corte (HA)',
    'TN/HA', 'Productividad TN/HA', 'TN Cortadas Manual',
    'TN Cortadas Mecanizada', 'Total (t)', 'Prop. Sembrada', 'Lote Sembrado',
  ];

  const ws = XLSX.utils.json_to_sheet(filas, { header: headers });
  const wscols = headers.map(h => ({ wch: Math.max(h.length, 12) + 2 }));
  ws['!cols'] = wscols;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Corte Semilla');

  const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
  const fecha = new Date().toISOString().slice(0, 10);
  const hora = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
  const nombre = `corte_semilla_${fecha}_${hora}.xlsx`;

  return { base64, nombre };
}
