// repositories/tecnicos.repo.js
import { executeQuery, executeRun } from '../db/sqlite.js';

export async function getTecnicos() {
  return await executeQuery(
    'SELECT * FROM tecnicos ORDER BY created_at DESC'
  );
}

export async function createTecnico(tecnico) {
  const result = await executeRun(
    `INSERT INTO tecnicos (nombre)
     VALUES (?)`,
    [tecnico.nombre]
  );
  return result.lastId;
}

export async function updateTecnico(id, tecnico) {
  await executeRun(
    `UPDATE tecnicos
     SET nombre = ?
     WHERE id = ?`,
    [tecnico.nombre, id]
  );
}

export async function deleteTecnico(id) {
  await executeRun(
    'DELETE FROM tecnicos WHERE id = ?',
    [id]
  );
}
