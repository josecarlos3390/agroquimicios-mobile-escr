import { executeQuery, executeRun } from '../db/sqlite.js';

export async function listarEspecies(empresaId) {
  return executeQuery(
    'SELECT id, codigo, nombre_comun FROM especies WHERE empresa_id = ? ORDER BY nombre_comun',
    [empresaId]
  );
}

export async function obtenerEspeciePorId(id) {
  const result = await executeQuery(
    'SELECT id, empresa_id, codigo, nombre_comun FROM especies WHERE id = ?',
    [id]
  );
  return result[0] || null;
}

export async function buscarEspeciesPorNombre(empresaId, termino) {
  return executeQuery(
    `SELECT id, codigo, nombre_comun
     FROM especies
     WHERE empresa_id = ? AND nombre_comun LIKE ?
     ORDER BY nombre_comun
     LIMIT 50`,
    [empresaId, `%${termino}%`]
  );
}

export async function insertarEspecie(empresaId, codigo, nombreComun) {
  const result = await executeRun(
    'INSERT INTO especies (empresa_id, codigo, nombre_comun) VALUES (?, ?, ?)',
    [empresaId, codigo, nombreComun]
  );
  return { lastId: result.lastId };
}

export async function actualizarEspecie(id, nombreComun) {
  return executeRun(
    'UPDATE especies SET nombre_comun = ? WHERE id = ?',
    [nombreComun, id]
  );
}

export async function eliminarEspecie(id) {
  return executeRun(
    'DELETE FROM especies WHERE id = ?',
    [id]
  );
}

export async function obtenerUltimoCodigoEspecie(empresaId) {
  const result = await executeQuery(
    "SELECT codigo FROM especies WHERE empresa_id = ? AND codigo LIKE 'ESP-%' ORDER BY CAST(SUBSTR(codigo, 5) AS INTEGER) DESC LIMIT 1",
    [empresaId]
  );
  return result[0]?.codigo || null;
}

export async function obtenerEspeciePorNombre(empresaId, nombreComun) {
  const result = await executeQuery(
    'SELECT id FROM especies WHERE empresa_id = ? AND nombre_comun = ?',
    [empresaId, nombreComun]
  );
  return result[0] || null;
}
