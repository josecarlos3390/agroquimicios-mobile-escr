import { executeQuery, executeRun } from '../db/sqlite.js';

export async function getTiposProducto() {
  return await executeQuery(
    `SELECT * FROM tipos_producto ORDER BY nombre`
  );
}

export async function getTipoProductoById(id) {
  const result = await executeQuery(
    `SELECT * FROM tipos_producto WHERE id = ?`,
    [id]
  );
  return result[0] || null;
}

export async function createTipoProducto(data) {
  const result = await executeRun(
    `INSERT INTO tipos_producto (nombre, cuenta_contable)
     VALUES (?, ?)`,
    [data.nombre, data.cuenta_contable]
  );

  return result.lastId;
}
