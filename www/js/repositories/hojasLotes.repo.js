import { executeRun, executeQuery } from '../db/sqlite.js';

/* Inserción de un lote con hectáreas aplicadas opcionales */
export async function addLoteToHoja(hojaId, loteId, hectareasAplicadas = null) {
  await executeRun(
    `INSERT INTO hojas_lotes (hoja_id, lote_id, hectareas_aplicadas) VALUES (?, ?, ?)`,
    [hojaId, loteId, hectareasAplicadas]
  );
  return true;
}

/* Inserción batch — loteIds puede ser array de IDs o array de {loteId, hectareas} */
export async function addLotesToHoja(hojaId, lotes) {
  if (!lotes || lotes.length === 0) return;

  const placeholders = lotes.map(() => `(?, ?, ?)`).join(', ');
  const values = lotes.flatMap(l => {
    if (typeof l === 'object' && l.loteId) {
      return [hojaId, l.loteId, l.hectareasAplicadas ?? null];
    }
    return [hojaId, l, null]; // compatibilidad: array de IDs simples
  });

  await executeRun(
    `INSERT INTO hojas_lotes (hoja_id, lote_id, hectareas_aplicadas) VALUES ${placeholders}`,
    values
  );
}

/* Obtener lotes de una hoja con hectáreas efectivas:
   si hectareas_aplicadas es NULL, usa el 100% del lote */
export async function getLotesByHojaId(hojaId) {
  return await executeQuery(
    `SELECT
       l.id,
       l.nombre,
       l.hectareas                                        AS hectareas_lote,
       COALESCE(hl.hectareas_aplicadas, l.hectareas)      AS hectareas_aplicadas,
       hl.hectareas_aplicadas                             AS hectareas_parcial,
       l.cultivo_id,
       l.sector_id,
       s.nombre                                           AS sector_nombre,
       c.nombre                                           AS cultivo_nombre,
       v.nombre                                           AS variedad_nombre
     FROM lotes l
     JOIN hojas_lotes hl ON hl.lote_id = l.id
     LEFT JOIN sectores s   ON s.id = l.sector_id
     LEFT JOIN cultivos c   ON c.id = l.cultivo_id
     LEFT JOIN variedades v ON v.id = l.variedad_id
     WHERE hl.hoja_id = ?
     ORDER BY s.nombre, l.nombre`,
    [hojaId]
  );
}

/* Actualizar hectáreas aplicadas de un lote en una hoja */
export async function updateHectareasLote(hojaId, loteId, hectareasAplicadas) {
  await executeRun(
    `UPDATE hojas_lotes SET hectareas_aplicadas = ? WHERE hoja_id = ? AND lote_id = ?`,
    [hectareasAplicadas, hojaId, loteId]
  );
}

export async function deleteLotesByHojaId(hojaId) {
  await executeRun(`DELETE FROM hojas_lotes WHERE hoja_id = ?`, [hojaId]);
}

/* Replace con soporte de hectáreas parciales
   nuevoLotes: array de { loteId, hectareasAplicadas } o IDs simples */
export async function replaceLotesHoja(hojaId, nuevoLotes) {
  await deleteLotesByHojaId(hojaId);
  await addLotesToHoja(hojaId, nuevoLotes);
}