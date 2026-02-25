// www/js/repositories/sectores.repo.js
import { executeQuery, executeRun } from '../db/sqlite.js';

export async function getSectoresByEmpresa(empresaId) {
  return await executeQuery(
    'SELECT * FROM sectores WHERE empresa_id = ? ORDER BY nombre',
    [empresaId]
  );
}

export async function createSector(sector) {
  const result = await executeRun(
    `INSERT INTO sectores (empresa_id, nombre, hectareas)
     VALUES (?, ?, ?)`,
    [sector.empresa_id, sector.nombre, sector.hectareas]
  );
  return result.lastId;
}

export async function updateSector(id, sector) {
  await executeRun(
    `UPDATE sectores
     SET nombre = ?, hectareas = ?
     WHERE id = ?`,
    [sector.nombre, sector.hectareas, id]
  );
}

export async function deleteSector(id) {
  await executeRun('DELETE FROM sectores WHERE id = ?', [id]);
}
