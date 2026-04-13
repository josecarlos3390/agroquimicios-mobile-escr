import {
  createCanaCab, getNextNumeroSecuencialCana, getCanaCabs,
  deleteCanaCab, updateEstadoCanaCab,
  insertPlantacion, deletePlantacionesByCab, getPlantacionesByCab,
  insertCorteSemilla, getCorteSemillaByPlantacion,
  insertInsumo, getInsumosByCab, deleteInsumosByCab,
} from '../repositories/cana.repo.js';
import { executeQuery } from '../../../db/sqlite.js';

/* =========================================================
   HELPERS
========================================================= */
async function getModeloDispositivo() {
  try {
    if (window.Capacitor?.Plugins?.Device) {
      const info = await window.Capacitor.Plugins.Device.getInfo();
      return info.model.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
    }
    const match = navigator.userAgent.match(/\(.*?;\s*([^;)]+)\s*Build/);
    if (match?.[1]) return match[1].trim().toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
    return 'LOCAL';
  } catch { return 'LOCAL'; }
}

function uuid() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
}

/* =========================================================
   CREAR NOTA DE CAÑA
   data = {
     empresa_id, tecnico_id, campana, fecha_inicio, fecha_fin,
     observaciones,
     plantaciones: [{
       lote_id, variedad_id, ha_manual, ha_mecanizada,
       cantidad_sembradora_grupos, personas_por_grupo,
       cortes: [{
         lote_semilla_id, variedad_id, sup_corte_ha,
         rendimiento_tn_ha, tn_cortadas_manual,
         tn_cortadas_mecanizada, consumo_semilla_tn_ha
       }]
     }],
     insumos: [{
       tipo, producto_id, producto_nombre, cantidad, unidad
     }]
   }
========================================================= */
export async function crearNotaCana(data) {
  if (!data.fecha_inicio) throw new Error('Fecha de inicio requerida');
  if (!data.plantaciones || data.plantaciones.length === 0)
    throw new Error('Debe agregar al menos un lote de plantación');

  const cabId    = uuid();
  const secuencial = await getNextNumeroSecuencialCana();

  const ahora  = new Date();
  const fecha  = ahora.toISOString().slice(0, 10).replace(/-/g, '');
  const hora   = String(ahora.getHours()).padStart(2, '0');
  const minuto = String(ahora.getMinutes()).padStart(2, '0');
  const corr   = String(secuencial).padStart(5, '0');
  const modelo = await getModeloDispositivo();

  const MESES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
                 'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  const mes = MESES[new Date(data.fecha_inicio + 'T00:00:00').getMonth()];

  await createCanaCab({
    id:               cabId,
    numero_secuencial: secuencial,
    numero_completo:  `CANA-${modelo}-${fecha}${hora}${minuto}${corr}`,
    dispositivo_id:   modelo,
    campana:          data.campana ?? String(ahora.getFullYear()),
    empresa_id:       data.empresa_id,
    tecnico_id:       data.tecnico_id ?? null,
    fecha_inicio:     data.fecha_inicio,
    fecha_fin:        data.fecha_fin ?? data.fecha_inicio,
    mes,
    observaciones:    data.observaciones ?? null,
  });

  // Plantaciones + cortes de semilla
  for (let i = 0; i < data.plantaciones.length; i++) {
    const p = data.plantaciones[i];
    const plantacionId = await insertPlantacion({
      cab_id:     cabId,
      lote_id:    p.lote_id,
      variedad_id: p.variedad_id ?? null,
      ha_manual:  p.ha_manual ?? 0,
      ha_mecanizada: p.ha_mecanizada ?? 0,
      ha_total:   (parseFloat(p.ha_manual || 0) + parseFloat(p.ha_mecanizada || 0)),
      cantidad_sembradora_grupos: p.cantidad_sembradora_grupos ?? null,
      personas_por_grupo: p.personas_por_grupo ?? null,
      orden: i,
    });

    if (p.cortes?.length) {
      for (let j = 0; j < p.cortes.length; j++) {
        const c = p.cortes[j];
        await insertCorteSemilla({
          plantacion_id:         plantacionId,
          lote_semilla_id:       c.lote_semilla_id ?? null,
          variedad_id:           c.variedad_id ?? null,
          sup_corte_ha:          c.sup_corte_ha ?? null,
          rendimiento_tn_ha:     c.rendimiento_tn_ha ?? null,
          tn_cortadas_manual:    c.tn_cortadas_manual ?? 0,
          tn_cortadas_mecanizada: c.tn_cortadas_mecanizada ?? 0,
          consumo_semilla_tn_ha: c.consumo_semilla_tn_ha ?? null,
          orden: j,
        });
      }
    }
  }

  // Insumos
  if (data.insumos?.length) {
    for (let i = 0; i < data.insumos.length; i++) {
      const ins = data.insumos[i];
      if (!ins.producto_nombre) continue;
      await insertInsumo({ ...ins, cab_id: cabId, orden: i });
    }
  }

  return cabId;
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
   OBTENER PRODUCTOS CAÑA POR TIPO (para pre-llenar insumos)
   Devuelve los que tienen código CANA- en el orden definido
========================================================= */
export async function getProductosCana() {
  return await executeQuery(`
    SELECT p.id, p.codigo, p.nombre,
           tp.nombre AS tipo_nombre,
           um.codigo AS unidad_default
    FROM productos p
    JOIN tipos_producto tp ON tp.id = p.tipo_producto_id
    LEFT JOIN productos_unidades pu ON pu.producto_id = p.id AND pu.es_default = 1
    LEFT JOIN unidades_medida um ON um.id = pu.unidad_medida_id
    WHERE p.codigo LIKE 'CANA-%' AND p.activo = 1
    ORDER BY
      CASE WHEN tp.nombre = 'FERTILIZANTES' THEN 0
           WHEN tp.nombre = 'AGROQUIMICOS'  THEN 1
           ELSE 2 END,
      p.nombre
  `);
}
