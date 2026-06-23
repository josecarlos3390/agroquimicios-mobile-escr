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

export async function getDetalleByHojaId(hojaId) {
  return await executeQuery(
    `SELECT
       hd.id, hd.linea, hd.cantidad, hd.dosis,
       hd.producto_id, hd.producto_codigo, hd.producto_nombre,
       hd.unidad_medida_id,
       um.codigo AS unidad_medida_codigo,
       um.nombre AS unidad_medida_nombre
     FROM hojas_detalle hd
     LEFT JOIN unidades_medida um ON um.id = hd.unidad_medida_id
     WHERE hd.hoja_id = ?
     ORDER BY hd.linea`,
    [hojaId]
  );
}

export async function updateDetalleCantidadDosis(id, cantidad, dosis) {
  await executeRun(
    `UPDATE hojas_detalle SET cantidad = ?, dosis = ? WHERE id = ?`,
    [cantidad, dosis, id]
  );
}

/* Recalcula dosis de todas las líneas de una hoja dado nuevas hectáreas totales */
export async function recalcularDosisHoja(hojaId, nuevasHectareas) {
  if (!nuevasHectareas || nuevasHectareas <= 0) return;
  await executeRun(
    `UPDATE hojas_detalle
     SET dosis = cantidad / ?
     WHERE hoja_id = ?`,
    [nuevasHectareas, hojaId]
  );
}