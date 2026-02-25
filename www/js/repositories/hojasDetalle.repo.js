import { executeQuery, executeRun } from '../db/sqlite.js';

export async function getNextLineaByHoja(hojaId) {
  const result = await executeQuery(
    `SELECT COALESCE(MAX(linea), 0) + 1 AS next
     FROM hojas_detalle
     WHERE hoja_id = ?`,
    [hojaId]
  );

  return result[0].next;
}

export async function createHojaDetalle(detalle) {
  await executeRun(
    `INSERT INTO hojas_detalle (
      id,
      hoja_id,
      linea,
      producto_id,
      producto_codigo,
      producto_nombre,
      cantidad,
      unidad_medida_id,
      dosis
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      detalle.id,
      detalle.hoja_id,
      detalle.linea,
      detalle.producto_id,
      detalle.producto_codigo,
      detalle.producto_nombre,
      detalle.cantidad,
      detalle.unidad_medida_id,
      detalle.dosis
    ]
  );

  return true;
}

export async function updateDetalleLinea(id, data) {
  await executeRun(
    `
    UPDATE hojas_detalle SET
      producto_id = ?,
      unidad_medida_id = ?,
      cantidad = ?,
      dosis = ?
    WHERE id = ?
    `,
    [
      data.producto_id,
      data.unidad_medida_id,
      data.cantidad,
      data.dosis,
      id
    ]
  );
}

export async function deleteDetalleLinea(id) {
  await executeRun(
    'DELETE FROM hojas_detalle WHERE id = ?',
    [id]
  );
}
