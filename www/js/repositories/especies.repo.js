import { executeQuery, executeRun } from '../db/sqlite.js';

export async function listarEspecies() {
  return executeQuery(
    'SELECT id, codigo, nombre_comun, nombre_cientifico FROM especies ORDER BY nombre_comun'
  );
}

export async function obtenerEspeciePorId(id) {
  const result = await executeQuery(
    'SELECT id, codigo, nombre_comun, nombre_cientifico FROM especies WHERE id = ?',
    [id]
  );
  return result[0] || null;
}

export async function buscarEspeciesPorNombre(termino) {
  return executeQuery(
    `SELECT id, codigo, nombre_comun, nombre_cientifico
     FROM especies
     WHERE nombre_comun LIKE ? OR nombre_cientifico LIKE ?
     ORDER BY nombre_comun
     LIMIT 50`,
    [`%${termino}%`, `%${termino}%`]
  );
}

export async function insertarEspecie(codigo, nombreComun, nombreCientifico) {
  const result = await executeRun(
    'INSERT INTO especies (codigo, nombre_comun, nombre_cientifico) VALUES (?, ?, ?)',
    [codigo, nombreComun, nombreCientifico]
  );
  return { lastId: result.lastId };
}

export async function actualizarEspecie(id, nombreComun, nombreCientifico) {
  return executeRun(
    'UPDATE especies SET nombre_comun = ?, nombre_cientifico = ? WHERE id = ?',
    [nombreComun, nombreCientifico, id]
  );
}

export async function eliminarEspecie(id) {
  return executeRun(
    'DELETE FROM especies WHERE id = ?',
    [id]
  );
}

export async function obtenerUltimoCodigoEspecie() {
  const result = await executeQuery(
    "SELECT codigo FROM especies WHERE codigo LIKE 'ESP-%' ORDER BY CAST(SUBSTR(codigo, 5) AS INTEGER) DESC LIMIT 1"
  );
  return result[0]?.codigo || null;
}
