import { executeQuery, executeRun } from '../db/sqlite.js';

export async function getTiposAplicacion(empresaId) {
  return await executeQuery(
    'SELECT id, nombre FROM tipos_aplicacion WHERE empresa_id = ? ORDER BY nombre',
    [empresaId]
  );
}

export async function createTipoAplicacion(nombre, empresaId) {
  return await executeRun(
    'INSERT INTO tipos_aplicacion (empresa_id, nombre) VALUES (?, ?)',
    [empresaId, nombre]
  );
}

export async function updateTipoAplicacion(id, nombre) {
  return await executeRun(
    'UPDATE tipos_aplicacion SET nombre = ? WHERE id = ?',
    [nombre, id]
  );
}

export async function deleteTipoAplicacion(id) {
  return await executeRun('DELETE FROM tipos_aplicacion WHERE id = ?', [id]);
}