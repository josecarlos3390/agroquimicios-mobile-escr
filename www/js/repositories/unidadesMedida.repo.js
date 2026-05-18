import { executeQuery, executeRun } from '../db/sqlite.js';

export async function getUnidadesMedida() {
  return await executeQuery('SELECT * FROM unidades_medida ORDER BY nombre');
}

export async function createUnidadMedida(data) {
  return await executeRun(
    'INSERT INTO unidades_medida (codigo, nombre, factor) VALUES (?, ?, ?)',
    [data.codigo, data.nombre, data.factor ?? 1]
  );
}

export async function updateUnidadMedida(id, data) {
  return await executeRun(
    'UPDATE unidades_medida SET codigo = ?, nombre = ?, factor = ? WHERE id = ?',
    [data.codigo, data.nombre, data.factor ?? 1, id]
  );
}

export async function deleteUnidadMedida(id) {
  return await executeRun('DELETE FROM unidades_medida WHERE id = ?', [id]);
}