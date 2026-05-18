import { uuid } from '../../../utils/uuid.js';
import { getModeloDispositivo } from '../../../utils/device.js';
import { MESES } from '../../../utils/fecha.js';
import {
  createCanaCab, getNextNumeroSecuencialCana, getCanaCabs, getCanaCabById,
  deleteCanaCab, updateEstadoCanaCab, updateCanaCab,
  insertPlantacion, deletePlantacionesByCab, getPlantacionesByCab,
  getLineasExportacionCana,
} from '../repositories/cana.repo.js';

/* =========================================================
   CREAR NOTA DE CAÑA
   data = {
     empresa_id, tecnico_id, campana, fecha_inicio, fecha_fin,
     observaciones,
     plantaciones: [{
       lote_id, variedad_id, ha_manual, ha_mecanizada,
       cantidad_sembradora_grupos, personas_por_grupo,
     }],
   }
======================================================== */
export async function crearNotaCana(data) {
  if (!data.fecha) throw new Error('Fecha requerida');
  if (!data.plantaciones || data.plantaciones.length === 0)
    throw new Error('Debe agregar al menos un lote de plantación');

  const cabId    = uuid();
  const secuencial = await getNextNumeroSecuencialCana();

  const ahora  = new Date();
  const diames = String(ahora.getDate()).padStart(2, '0');
  const corr   = String(secuencial).padStart(3, '0');
  const modelo = await getModeloDispositivo();

  const mes = MESES[new Date(data.fecha + 'T00:00:00').getMonth()];

  await createCanaCab({
    id:               cabId,
    numero_secuencial: secuencial,
    numero_completo:  `CANA-${mes.substr(0,3)}${diames}-${corr}`,
    dispositivo_id:   modelo,
    campana:          data.campana ?? String(ahora.getFullYear()),
    empresa_id:       data.empresa_id,
    tecnico_id:       data.tecnico_id ?? null,
    fecha:            data.fecha,
    fecha_inicio:     data.fecha,
    fecha_fin:        data.fecha,
    mes,
    observaciones:    data.observaciones ?? null,
  });

  for (let i = 0; i < data.plantaciones.length; i++) {
    const p = data.plantaciones[i];
    await insertPlantacion({
      cab_id:     cabId,
      lote_id:    p.lote_id,
      variedad_id: p.variedad_id ?? null,
      ha_manual:  p.ha_manual ?? 0,
      ha_mecanizada: p.ha_mecanizada ?? 0,
      ha_total:   (parseFloat(p.ha_manual || 0) + parseFloat(p.ha_mecanizada || 0)),
      cantidad_sembradora_grupos: p.cantidad_sembradora_grupos ?? null,
      fecha_inicio: p.fecha_inicio ?? null,
      fecha_fin:    p.fecha_fin ?? null,
      orden: i,
    });
  }

  return cabId;
}

/* =========================================================
   OBTENER NOTA COMPLETA
======================================================== */
export async function obtenerNotaCana(id) {
  const cab = await getCanaCabById(id);
  if (!cab) return null;

  const plantaciones = await getPlantacionesByCab(id);

  return { cab, plantaciones };
}

/* =========================================================
   ACTUALIZAR CABECERA
========================================================= */
export async function actualizarNotaCana(id, data) {
  await updateCanaCab(id, data);
}

/* =========================================================
   ACTUALIZAR NOTA COMPLETA (cabecera + plantaciones)
======================================================== */
export async function actualizarNotaCanaCompleta(id, data) {
  const cabActual = await getCanaCabById(id);
  const estado = cabActual?.estado ?? 'BORRADOR';

  const mes = MESES[new Date(data.fecha + 'T00:00:00').getMonth()];

  await updateCanaCab(id, {
    empresa_id:    data.empresa_id,
    tecnico_id:    data.tecnico_id ?? null,
    campana:       data.campana,
    fecha:         data.fecha,
    fecha_inicio:  data.fecha,
    fecha_fin:     data.fecha,
    mes,
    observaciones: data.observaciones ?? null,
    estado,
  });

  await deletePlantacionesByCab(id);

  for (let i = 0; i < data.plantaciones.length; i++) {
    const p = data.plantaciones[i];
    await insertPlantacion({
      cab_id:     id,
      lote_id:    p.lote_id,
      variedad_id: p.variedad_id ?? null,
      ha_manual:  p.ha_manual ?? 0,
      ha_mecanizada: p.ha_mecanizada ?? 0,
      ha_total:   (parseFloat(p.ha_manual || 0) + parseFloat(p.ha_mecanizada || 0)),
      cantidad_sembradora_grupos: p.cantidad_sembradora_grupos ?? null,
      fecha_inicio: p.fecha_inicio ?? null,
      fecha_fin:    p.fecha_fin ?? null,
      orden: i,
    });
  }

  return id;
}

/* =========================================================
   LISTAR NOTAS
========================================================= */
export async function listarNotasCana(estado = null) {
  return await getCanaCabs(estado);
}

/* =========================================================
   ELIMINAR NOTA
========================================================= */
export async function eliminarNotaCana(id) {
  return await deleteCanaCab(id);
}

/* =========================================================
   EXPORTACIÓN A EXCEL
========================================================= */
export async function prepararExcelCana(cabId) {
  const lineas = await getLineasExportacionCana(cabId);

  const filas = lineas.map(row => ({
    'Fecha Inicio':    row.fecha_inicio ?? '',
    'Fecha Fin':       row.fecha_fin ?? '',
    'Código Sector':   row.sector_codigo ?? '',
    'Nombre Sector':   row.sector_nombre ?? '',
    'Lote':            row.lote_nombre ?? '',
    'Variedad':        row.variedad_nombre ?? '',
    'HA Manual':       row.ha_manual ?? 0,
    'HA Mecanizada':   row.ha_mecanizada ?? 0,
    'HA Total':        row.ha_total ?? 0,
  }));

  const headers = [
    'Fecha Inicio', 'Fecha Fin', 'Código Sector', 'Nombre Sector', 'Lote',
    'Variedad', 'HA Manual', 'HA Mecanizada', 'HA Total',
  ];

  const ws = XLSX.utils.json_to_sheet(filas, { header: headers });

  const wscols = headers.map(h => ({ wch: Math.max(h.length, 12) + 2 }));
  ws['!cols'] = wscols;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plantación');

  const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
  const fecha = new Date().toISOString().slice(0, 10);
  const hora = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
  const nombre = `cana_plantacion_${fecha}_${hora}.xlsx`;

  return { base64, nombre };
}