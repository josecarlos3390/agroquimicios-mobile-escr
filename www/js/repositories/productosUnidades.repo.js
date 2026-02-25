import { executeQuery, executeRun } from '../db/sqlite.js';

export async function getUnidadesByProducto(productoId) {
  return await executeQuery(
    `SELECT 
      pu.id,
      pu.unidad_medida_id,   -- 👈 agregar este campo explícitamente
      um.codigo,
      um.nombre,
      pu.es_default
     FROM productos_unidades pu
     JOIN unidades_medida um ON um.id = pu.unidad_medida_id
     WHERE pu.producto_id = ?
     ORDER BY pu.es_default DESC, um.nombre`,
    [productoId]
  );
}

export async function addUnidadToProducto(productoId, unidadId, esDefault = 0) {
  await executeRun(
    `INSERT OR IGNORE INTO productos_unidades 
      (producto_id, unidad_medida_id, es_default)
     VALUES (?, ?, ?)`,
    [productoId, unidadId, esDefault]
  );
}

// 👇 AGREGAR ESTOS DOS
export async function deleteUnidadesByProducto(productoId) {
  await executeRun(
    `DELETE FROM productos_unidades WHERE producto_id = ?`,
    [productoId]
  );
}

export async function replaceUnidadesProducto(productoId, unidades) {
  await deleteUnidadesByProducto(productoId);
  for (const u of unidades) {
    await addUnidadToProducto(productoId, u.unidad_medida_id, u.es_default ? 1 : 0);
  }
}