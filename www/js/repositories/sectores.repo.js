// www/js/repositories/sectores.repo.js
import { executeQuery, executeRun } from '../db/sqlite.js';

export async function getSectoresByEmpresa(empresaId) {
  return await executeQuery(
    `SELECT s.*, COALESCE(SUM(l.hectareas), 0) AS hectareas_total
     FROM sectores s
     LEFT JOIN lotes l ON l.sector_id = s.id
     WHERE s.empresa_id = ?
     GROUP BY s.id
     ORDER BY s.nombre`,
    [empresaId]
  );
}

export async function createSector(sector) {
  const result = await executeRun(
    `INSERT INTO sectores (empresa_id, nombre)
     VALUES (?, ?)`,
    [sector.empresa_id, sector.nombre]
  );
  return result.lastId;
}

export async function updateSector(id, sector) {
  await executeRun(
    `UPDATE sectores
     SET nombre = ?
     WHERE id = ?`,
    [sector.nombre, id]
  );
}

export async function deleteSector(id) {
  await executeRun('DELETE FROM sectores WHERE id = ?', [id]);
}