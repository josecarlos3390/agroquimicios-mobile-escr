import { executeQuery, executeRun } from '../db/sqlite.js';

export async function getTiposAplicacion() {
  return await executeQuery('SELECT id, nombre FROM tipos_aplicacion ORDER BY nombre');
}

export async function createTipoAplicacion(nombre) {
  return await executeRun(
    'INSERT INTO tipos_aplicacion (nombre) VALUES (?)',
    [nombre]
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