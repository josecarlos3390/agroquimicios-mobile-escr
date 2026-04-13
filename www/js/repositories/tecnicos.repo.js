// repositories/tecnicos.repo.js
import { executeQuery, executeRun } from '../db/sqlite.js';

export async function getTecnicos(empresaId) {
  return await executeQuery(
    'SELECT * FROM tecnicos WHERE empresa_id = ? ORDER BY created_at DESC',
    [empresaId]
  );
}

export async function createTecnico(tecnico) {
  const result = await executeRun(
    `INSERT INTO tecnicos (empresa_id, nombre)
     VALUES (?, ?)`,
    [tecnico.empresa_id, tecnico.nombre]
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
