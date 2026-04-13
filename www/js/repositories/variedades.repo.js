import { executeQuery, executeRun } from '../db/sqlite.js';

export async function obtenerVariedadesPorCultivo(cultivoId) {
  return await executeQuery(
    `SELECT * FROM variedades
     WHERE cultivo_id = ?
     ORDER BY nombre`,
    [cultivoId]
  );
}

export async function obtenerVariedadesPorEmpresa(empresaId) {
  return await executeQuery(
    `SELECT * FROM variedades
     WHERE empresa_id = ?
     ORDER BY nombre`,
    [empresaId]
  );
}

export async function insertarVariedad(data) {
  return executeRun(
    `INSERT INTO variedades (empresa_id, cultivo_id, nombre)
     VALUES (?, ?, ?)`,
    [data.empresa_id, data.cultivo_id, data.nombre]
  );
}

export async function actualizarVariedad(data) {
  return executeRun(
    `UPDATE variedades
     SET nombre = ?
     WHERE id = ?`,
    [data.nombre, data.id]
  );
}

export async function eliminarVariedad(id) {
  return executeRun(
    `DELETE FROM variedades WHERE id = ?`,
    [id]
  );
}
