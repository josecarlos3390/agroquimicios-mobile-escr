// repositories/caudales.repo.js
import { executeQuery, executeRun } from '../db/sqlite.js';

export async function getCaudales() {
  return await executeQuery(
    'SELECT * FROM caudales ORDER BY nombre'
  );
}

export async function createCaudal(caudal) {
  const result = await executeRun(
    `INSERT INTO caudales (nombre, valor, unidad)
     VALUES (?, ?, ?)`,
    [caudal.nombre, caudal.valor || null, caudal.unidad || null]
  );
  return result.lastId;
}

export async function updateCaudal(id, caudal) {
  await executeRun(
    `UPDATE caudales
     SET nombre = ?, valor = ?, unidad = ?
     WHERE id = ?`,
    [caudal.nombre, caudal.valor || null, caudal.unidad || null, id]
  );
}

export async function deleteCaudal(id) {
  await executeRun(
    'DELETE FROM caudales WHERE id = ?',
    [id]
  );
}