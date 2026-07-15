import { executeQuery, executeRun } from '../db/sqlite.js';

export async function insertarSalidaCab(id, empresaId, numeroSecuencial, numeroCompleto, nroCfoDespacho, fechaDespacho, placa, chofer, observaciones) {
  await executeRun(
    `INSERT INTO cefo_salida_cab (id, empresa_id, numero_secuencial, numero_completo, nro_cfo_despacho, fecha_despacho, placa, chofer, observaciones)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, empresaId, numeroSecuencial, numeroCompleto, nroCfoDespacho, fechaDespacho, placa, chofer, observaciones]
  );
}

export async function insertarSalidaDetalle(salidaId, rodeoDetalleId, especie, faja, nroArbol, seccion, diamayor, diamenor, largo, volumen) {
  await executeRun(
    `INSERT INTO cefo_salida_detalle (salida_id, rodeo_detalle_id, especie, faja, nro_arbol, seccion, diamayor, diamenor, largo, volumen)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [salidaId, rodeoDetalleId, especie, faja, nroArbol, seccion, diamayor, diamenor, largo, volumen]
  );
}

export async function marcarDetalleDespachado(rodeoDetalleId) {
  await executeRun(
    "UPDATE rodeo_detalle SET estado_uso = 'DESPACHADO' WHERE id = ?",
    [rodeoDetalleId]
  );
}

export async function desmarcarDetalleDespachado(rodeoDetalleId) {
  await executeRun(
    "UPDATE rodeo_detalle SET estado_uso = 'DISPONIBLE' WHERE id = ?",
    [rodeoDetalleId]
  );
}

export async function marcarArbolesDespachadosPorSalida(salidaId) {
  await executeRun(`
    UPDATE rodeo_detalle
    SET estado_uso = 'DESPACHADO'
    WHERE id IN (SELECT rodeo_detalle_id FROM cefo_salida_detalle WHERE salida_id = ?)
  `, [salidaId]);
}

export async function desmarcarArbolesDespachadosPorSalida(salidaId) {
  await executeRun(`
    UPDATE rodeo_detalle
    SET estado_uso = 'DISPONIBLE'
    WHERE id IN (SELECT rodeo_detalle_id FROM cefo_salida_detalle WHERE salida_id = ?)
  `, [salidaId]);
}

export async function listarSalidas(empresaId) {
  return executeQuery(
    `SELECT s.id, s.numero_completo, s.nro_cfo_despacho, s.fecha_despacho, s.placa, s.chofer, s.estado,
            COUNT(d.id) as cantidad_arboles
     FROM cefo_salida_cab s
     LEFT JOIN cefo_salida_detalle d ON d.salida_id = s.id
     WHERE s.empresa_id = ?
     GROUP BY s.id
     ORDER BY s.fecha_despacho DESC, s.numero_completo`,
    [empresaId]
  );
}

export async function obtenerSalidaPorId(id) {
  const cab = await executeQuery(
    `SELECT id, numero_completo, nro_cfo_despacho, fecha_despacho, placa, chofer, observaciones, estado, created_at
     FROM cefo_salida_cab WHERE id = ?`,
    [id]
  );
  if (!cab[0]) return null;

  const det = await executeQuery(
    `SELECT
       sd.id,
       sd.rodeo_detalle_id,
       rd.nro_rodeo,
       rd.especie,
       rd.faja,
       rd.nro_arbol,
       rd.seccion,
       rd.d1 AS diamayor,
       rd.d2 AS diamenor,
       rd.largo,
       rd.volumen,
       rd.para_transporte,
       rc.numero_completo AS rodeo_numero
     FROM cefo_salida_detalle sd
     LEFT JOIN rodeo_detalle rd ON rd.id = sd.rodeo_detalle_id
     LEFT JOIN rodeo_cab rc ON rc.id = rd.rodeo_cab_id
     WHERE sd.salida_id = ?
     ORDER BY sd.id`,
    [id]
  );

  return { cabecera: cab[0], detalle: det };
}

export async function eliminarSalida(id) {
  return executeRun(
    'DELETE FROM cefo_salida_cab WHERE id = ?',
    [id]
  );
}

export async function actualizarSalidaCab(id, nroCfoDespacho, fechaDespacho, placa, chofer, observaciones) {
  await executeRun(
    `UPDATE cefo_salida_cab
     SET nro_cfo_despacho = ?, fecha_despacho = ?, placa = ?, chofer = ?, observaciones = ?
     WHERE id = ?`,
    [nroCfoDespacho, fechaDespacho, placa, chofer, observaciones, id]
  );
}

export async function confirmarSalida(id) {
  await executeRun(
    "UPDATE cefo_salida_cab SET estado = 'CONFIRMADO' WHERE id = ?",
    [id]
  );
}

export async function eliminarSalidaDetalle(salidaDetalleId, rodeoDetalleId) {
  await executeRun(
    'DELETE FROM cefo_salida_detalle WHERE id = ?',
    [salidaDetalleId]
  );
  if (rodeoDetalleId) {
    await desmarcarDetalleDespachado(rodeoDetalleId);
  }
}

export async function buscarArbolesDisponibles(empresaId, filtros) {
  const conditions = [
    'c.empresa_id = ?',
    "d.estado_uso = 'DISPONIBLE'",
    "d.id NOT IN (SELECT sd.rodeo_detalle_id FROM cefo_salida_detalle sd JOIN cefo_salida_cab sc ON sc.id = sd.salida_id WHERE sc.estado = 'BORRADOR')"
  ];
  const params = [empresaId];

  if (filtros.termino) {
    conditions.push('(d.nro_rodeo LIKE ? OR d.especie LIKE ? OR d.nro_arbol LIKE ?)');
    const t = `%${filtros.termino}%`;
    params.push(t, t, t);
  }

  if (filtros.faja) {
    conditions.push('d.faja = ?');
    params.push(filtros.faja);
  }

  if (filtros.nroArbol) {
    conditions.push('d.nro_arbol LIKE ?');
    params.push(`%${filtros.nroArbol}%`);
  }

  const where = conditions.join(' AND ');

  return executeQuery(
    `SELECT
       d.id,
       d.nro_rodeo,
       d.x_coord,
       d.y_coord,
       d.especie,
       d.faja,
       d.nro_arbol,
       d.seccion,
       d.d1,
       d.d2,
       d.largo,
       d.volumen,
       d.para_transporte,
       d.estado_uso,
       c.numero_completo AS rodeo_numero,
       c.sector_id,
       s.nombre AS sector_nombre
     FROM rodeo_detalle d
     JOIN rodeo_cab c ON c.id = d.rodeo_cab_id
     LEFT JOIN rodeo_sectores s ON s.id = c.sector_id
     WHERE ${where}
     ORDER BY c.numero_completo, d.nro_rodeo, d.faja, d.nro_arbol
     LIMIT 50`,
    params
  );
}
