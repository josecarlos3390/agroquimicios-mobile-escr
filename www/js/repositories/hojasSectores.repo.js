import { executeRun, executeQuery } from '../db/sqlite.js';

/* Inserción batch de sectores para una hoja */
export async function addSectoresToHoja(hojaId, sectorIds) {
  if (!sectorIds || sectorIds.length === 0) return;

  const placeholders = sectorIds.map(() => `(?, ?)`).join(', ');
  const values = sectorIds.flatMap(sectorId => [hojaId, sectorId]);

  await executeRun(
    `INSERT OR IGNORE INTO hojas_sectores (hoja_id, sector_id) VALUES ${placeholders}`,
    values
  );
}

/* Obtener sectores (con detalle) asociados a una hoja */
export async function getSectoresByHojaId(hojaId) {
  return await executeQuery(
    `SELECT s.id, s.nombre, s.hectareas
     FROM sectores s
     JOIN hojas_sectores hs ON hs.sector_id = s.id
     WHERE hs.hoja_id = ?
     ORDER BY s.nombre`,
    [hojaId]
  );
}

/* Eliminar todos los sectores de una hoja */
export async function deleteSectoresByHojaId(hojaId) {
  await executeRun(
    `DELETE FROM hojas_sectores WHERE hoja_id = ?`,
    [hojaId]
  );
}

/* Reemplazar sectores de una hoja (usado al editar) */
export async function replaceSectoresHoja(hojaId, nuevosSectorIds) {
  await deleteSectoresByHojaId(hojaId);
  await addSectoresToHoja(hojaId, nuevosSectorIds);
}
