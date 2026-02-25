import { executeQuery, executeRun } from '../db/sqlite.js';

export async function getProductos() {
  return await executeQuery(`
    SELECT 
      p.id,
      p.codigo,
      p.nombre,
      p.activo,
      tp.id AS tipo_producto_id,
      tp.nombre AS tipo_producto,
      tp.cuenta_contable
    FROM productos p
    JOIN tipos_producto tp ON tp.id = p.tipo_producto_id
    ORDER BY p.nombre
  `);
}

export async function getProductosActivos() {
  return await executeQuery(`
    SELECT 
      p.id,
      p.codigo,
      p.nombre,
      tp.nombre AS tipo_producto,
      tp.cuenta_contable
    FROM productos p
    JOIN tipos_producto tp ON tp.id = p.tipo_producto_id
    WHERE p.activo = 1
    ORDER BY p.nombre
  `);
}

export async function getProductoById(id) {
  const result = await executeQuery(
    `SELECT * FROM productos WHERE id = ?`,
    [id]
  );
  return result[0] || null;
}

export async function createProducto(producto) {
  await executeRun(
    `INSERT INTO productos (
      id, codigo, nombre, tipo_producto_id, activo
    ) VALUES (?, ?, ?, ?, ?)`,
    [
      producto.id,
      producto.codigo,
      producto.nombre,
      producto.tipo_producto_id,
      producto.activo ?? 1
    ]
  );

  return true;
}

export async function desactivarProducto(id) {
  await executeRun(
    `UPDATE productos SET activo = 0 WHERE id = ?`,
    [id]
  );
  return true;
}

export async function updateProducto(id, data) {
  await executeRun(
    `UPDATE productos SET
      codigo = ?,
      nombre = ?,
      tipo_producto_id = ?
    WHERE id = ?`,
    [data.codigo, data.nombre, data.tipo_producto_id, id]
  );
}
