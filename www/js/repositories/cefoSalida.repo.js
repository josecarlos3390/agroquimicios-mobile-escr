import { executeQuery, executeRun } from '../db/sqlite.js';

export async function insertarSalidaCab(id, empresaId, nroCfoDespacho, fechaDespacho, placa, chofer) {
  await executeRun(
    `INSERT INTO cefo_salida_cab (id, empresa_id, nro_cfo_despacho, fecha_despacho, placa, chofer)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, empresaId, nroCfoDespacho, fechaDespacho, placa, chofer]
  );
}

export async function insertarSalidaDetalle(salidaId, cefoDetalleId, especie, faja, nroArbol, seccion, diamayor, diamenor, largo, volumen) {
  await executeRun(
    `INSERT INTO cefo_salida_detalle (salida_id, cefo_detalle_id, especie, faja, nro_arbol, seccion, diamayor, diamenor, largo, volumen)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [salidaId, cefoDetalleId, especie, faja, nroArbol, seccion, diamayor, diamenor, largo, volumen]
  );
}

export async function marcarDetalleDespachado(cefoDetalleId) {
  await executeRun(
    'UPDATE cefo_detalle SET despachado = 1 WHERE id = ?',
    [cefoDetalleId]
  );
}

export async function listarSalidas(empresaId) {
  return executeQuery(
    `SELECT s.id, s.nro_cfo_despacho, s.fecha_despacho, s.placa, s.chofer,
            COUNT(d.id) as cantidad_arboles
     FROM cefo_salida_cab s
     LEFT JOIN cefo_salida_detalle d ON d.salida_id = s.id
     WHERE s.empresa_id = ?
     GROUP BY s.id
     ORDER BY s.fecha_despacho DESC, s.nro_cfo_despacho`,
    [empresaId]
  );
}

export async function obtenerSalidaPorId(id) {
  const cab = await executeQuery(
    `SELECT id, nro_cfo_despacho, fecha_despacho, placa, chofer, created_at
     FROM cefo_salida_cab WHERE id = ?`,
    [id]
  );
  if (!cab[0]) return null;

  const det = await executeQuery(
    `SELECT id, especie, faja, nro_arbol, seccion, diamayor, diamenor, largo, volumen
     FROM cefo_salida_detalle WHERE salida_id = ? ORDER BY id`,
    [id]
  );

  return { cabecera: cab[0], detalle: det };
}

export async function eliminarSalida(id) {
  // Primero desmarcar los detalles como despachados
  const detalles = await executeQuery(
    'SELECT cefo_detalle_id FROM cefo_salida_detalle WHERE salida_id = ?',
    [id]
  );
  for (const d of detalles) {
    await executeRun(
      'UPDATE cefo_detalle SET despachado = 0 WHERE id = ?',
      [d.cefo_detalle_id]
    );
  }
  return executeRun(
    'DELETE FROM cefo_salida_cab WHERE id = ?',
    [id]
  );
}

export async function buscarArbolesDisponibles(empresaId, termino) {
  return executeQuery(
    `SELECT d.id, d.especie, d.faja, d.nro_arbol, d.seccion, d.diamayor, d.diamenor, d.largo, d.volumen,
            c.nro_cfo_recib
     FROM cefo_detalle d
     JOIN cefo_cab c ON c.id = d.cefo_id
     WHERE c.empresa_id = ? AND d.despachado = 0
       AND (d.especie LIKE ? OR d.nro_arbol LIKE ? OR c.nro_cfo_recib LIKE ?)
     ORDER BY d.especie, d.faja, d.nro_arbol
     LIMIT 50`,
    [empresaId, `%${termino}%`, `%${termino}%`, `%${termino}%`]
  );
}
