import { executeQuery, executeRun } from '../../../db/sqlite.js';

export async function insertarDespachoCab(id, empresaId, numeroSecuencial, numeroCompleto, nroDespacho, fechaDespacho, placa, chofer, observaciones) {
  await executeRun(
    `INSERT INTO aserradero_despacho_cab (id, empresa_id, numero_secuencial, numero_completo, nro_despacho, fecha_despacho, placa, chofer, observaciones)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, empresaId, numeroSecuencial, numeroCompleto, nroDespacho, fechaDespacho, placa, chofer, observaciones]
  );
}

export async function insertarDespachoDetalle(despachoId, recepcionDetalleId, rodeoDetalleId, especie, faja, nroArbol, seccion, diamayor, diamenor, largo, volumen) {
  await executeRun(
    `INSERT INTO aserradero_despacho_detalle (despacho_id, recepcion_detalle_id, rodeo_detalle_id, especie, faja, nro_arbol, seccion, diamayor, diamenor, largo, volumen)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [despachoId, recepcionDetalleId, rodeoDetalleId, especie, faja, nroArbol, seccion, diamayor, diamenor, largo, volumen]
  );
}

export async function listarDespachos(empresaId) {
  return executeQuery(
    `SELECT d.id, d.numero_completo, d.nro_despacho, d.fecha_despacho, d.placa, d.chofer, d.estado,
            COUNT(dt.id) as cantidad_arboles
     FROM aserradero_despacho_cab d
     LEFT JOIN aserradero_despacho_detalle dt ON dt.despacho_id = d.id
     WHERE d.empresa_id = ?
     GROUP BY d.id
     ORDER BY d.fecha_despacho DESC, d.numero_completo`,
    [empresaId]
  );
}

export async function obtenerDespachoPorId(id) {
  const cab = await executeQuery(
    `SELECT id, numero_completo, nro_despacho, fecha_despacho, placa, chofer, observaciones, estado, created_at
     FROM aserradero_despacho_cab WHERE id = ?`,
    [id]
  );
  if (!cab[0]) return null;

  const det = await executeQuery(
    `SELECT
       dd.id,
       dd.recepcion_detalle_id,
       dd.rodeo_detalle_id,
       rd.especie,
       rd.faja,
       rd.nro_arbol,
       rd.seccion,
       rd.diamayor,
       rd.diamenor,
       rd.largo,
       rd.volumen,
       rc.nro_recepcion,
       rc.numero_completo AS recepcion_numero
     FROM aserradero_despacho_detalle dd
     LEFT JOIN aserradero_recepcion_detalle rd ON rd.id = dd.recepcion_detalle_id
     LEFT JOIN aserradero_recepcion_cab rc ON rc.id = rd.recepcion_id
     WHERE dd.despacho_id = ?
     ORDER BY dd.id`,
    [id]
  );

  return { cabecera: cab[0], detalle: det };
}

export async function eliminarDespacho(id) {
  const detalles = await executeQuery(
    'SELECT recepcion_detalle_id FROM aserradero_despacho_detalle WHERE despacho_id = ?',
    [id]
  );
  return executeRun(
    'DELETE FROM aserradero_despacho_cab WHERE id = ?',
    [id]
  );
}

export async function actualizarDespachoCab(id, nroDespacho, fechaDespacho, placa, chofer, observaciones) {
  await executeRun(
    `UPDATE aserradero_despacho_cab
     SET nro_despacho = ?, fecha_despacho = ?, placa = ?, chofer = ?, observaciones = ?
     WHERE id = ?`,
    [nroDespacho, fechaDespacho, placa, chofer, observaciones, id]
  );
}

export async function confirmarDespacho(id) {
  await executeRun(
    "UPDATE aserradero_despacho_cab SET estado = 'CONFIRMADO' WHERE id = ?",
    [id]
  );
}

export async function eliminarDespachoDetalle(despachoDetalleId) {
  await executeRun(
    'DELETE FROM aserradero_despacho_detalle WHERE id = ?',
    [despachoDetalleId]
  );
}

export async function marcarRecepcionDetallesDespachados(despachoId) {
  await executeRun(`
    UPDATE aserradero_recepcion_detalle
    SET despachado = 1
    WHERE id IN (SELECT recepcion_detalle_id FROM aserradero_despacho_detalle WHERE despacho_id = ?)
  `, [despachoId]);
}

export async function desmarcarRecepcionDetallesDespachados(despachoId) {
  await executeRun(`
    UPDATE aserradero_recepcion_detalle
    SET despachado = 0
    WHERE id IN (SELECT recepcion_detalle_id FROM aserradero_despacho_detalle WHERE despacho_id = ?)
  `, [despachoId]);
}
