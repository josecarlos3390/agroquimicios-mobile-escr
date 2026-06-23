import { executeQuery, executeRun } from '../../../db/sqlite.js';

export async function insertarRecepcionCab(id, empresaId, numeroSecuencial, numeroCompleto, nroRecepcion, fechaRecepcion, placa, chofer, observaciones) {
  await executeRun(
    `INSERT INTO aserradero_recepcion_cab (id, empresa_id, numero_secuencial, numero_completo, nro_recepcion, fecha_recepcion, placa, chofer, observaciones)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, empresaId, numeroSecuencial, numeroCompleto, nroRecepcion, fechaRecepcion, placa, chofer, observaciones]
  );
}

export async function insertarRecepcionDetalle(recepcionId, rodeoDetalleId, especie, faja, nroArbol, seccion, diamayor, diamenor, largo, volumen) {
  await executeRun(
    `INSERT INTO aserradero_recepcion_detalle (recepcion_id, rodeo_detalle_id, especie, faja, nro_arbol, seccion, diamayor, diamenor, largo, volumen)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [recepcionId, rodeoDetalleId, especie, faja, nroArbol, seccion, diamayor, diamenor, largo, volumen]
  );
}

export async function marcarDetalleDespachado(rodeoDetalleId) {
  await executeRun(
    "UPDATE rodeo_detalle SET estado_uso = 'RECEPCIONADO' WHERE id = ?",
    [rodeoDetalleId]
  );
}

export async function desmarcarDetalleDespachado(rodeoDetalleId) {
  await executeRun(
    "UPDATE rodeo_detalle SET estado_uso = 'DISPONIBLE' WHERE id = ?",
    [rodeoDetalleId]
  );
}

export async function listarRecepciones(empresaId) {
  return executeQuery(
    `SELECT r.id, r.numero_completo, r.nro_recepcion, r.fecha_recepcion, r.placa, r.chofer,
            COUNT(d.id) as cantidad_arboles
     FROM aserradero_recepcion_cab r
     LEFT JOIN aserradero_recepcion_detalle d ON d.recepcion_id = r.id
     WHERE r.empresa_id = ?
     GROUP BY r.id
     ORDER BY r.fecha_recepcion DESC, r.numero_completo`,
    [empresaId]
  );
}

export async function obtenerRecepcionPorId(id) {
  const cab = await executeQuery(
    `SELECT id, numero_completo, nro_recepcion, fecha_recepcion, placa, chofer, observaciones, created_at
     FROM aserradero_recepcion_cab WHERE id = ?`,
    [id]
  );
  if (!cab[0]) return null;

  const det = await executeQuery(
    `SELECT
       rd.id,
       rd.rodeo_detalle_id,
       rd.despachado,
       rdt.nro_rodeo,
       rdt.especie,
       rdt.faja,
       rdt.nro_arbol,
       rdt.seccion,
       rdt.d1 AS diamayor,
       rdt.d2 AS diamenor,
       rdt.largo,
       rdt.volumen,
       rdt.para_transporte,
       rc.numero_completo AS rodeo_numero
     FROM aserradero_recepcion_detalle rd
     LEFT JOIN rodeo_detalle rdt ON rdt.id = rd.rodeo_detalle_id
     LEFT JOIN rodeo_cab rc ON rc.id = rdt.rodeo_cab_id
     WHERE rd.recepcion_id = ?
     ORDER BY rd.id`,
    [id]
  );

  return { cabecera: cab[0], detalle: det };
}

export async function eliminarRecepcion(id) {
  const detalles = await executeQuery(
    'SELECT rodeo_detalle_id FROM aserradero_recepcion_detalle WHERE recepcion_id = ?',
    [id]
  );
  for (const d of detalles) {
    if (d.rodeo_detalle_id) {
      await desmarcarDetalleDespachado(d.rodeo_detalle_id);
    }
  }
  return executeRun(
    'DELETE FROM aserradero_recepcion_cab WHERE id = ?',
    [id]
  );
}

export async function actualizarRecepcionCab(id, nroRecepcion, fechaRecepcion, placa, chofer, observaciones) {
  await executeRun(
    `UPDATE aserradero_recepcion_cab
     SET nro_recepcion = ?, fecha_recepcion = ?, placa = ?, chofer = ?, observaciones = ?
     WHERE id = ?`,
    [nroRecepcion, fechaRecepcion, placa, chofer, observaciones, id]
  );
}

export async function eliminarRecepcionDetalle(recepcionDetalleId, rodeoDetalleId) {
  await executeRun(
    'DELETE FROM aserradero_recepcion_detalle WHERE id = ?',
    [recepcionDetalleId]
  );
  if (rodeoDetalleId) {
    await desmarcarDetalleDespachado(rodeoDetalleId);
  }
}

export async function buscarArbolesDisponibles(empresaId, filtros) {
  const conditions = [
    'c.empresa_id = ?',
    "d.estado_uso = 'DISPONIBLE'"
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


export async function marcarRecepcionDetalleDespachado(id) {
  await executeRun(
    'UPDATE aserradero_recepcion_detalle SET despachado = 1 WHERE id = ?',
    [id]
  );
}

export async function desmarcarRecepcionDetalleDespachado(id) {
  await executeRun(
    'UPDATE aserradero_recepcion_detalle SET despachado = 0 WHERE id = ?',
    [id]
  );
}

export async function buscarArbolesRecepcionDisponibles(empresaId, filtros) {
  const conditions = [
    'rc.empresa_id = ?',
    'rd.despachado = 0'
  ];
  const params = [empresaId];

  if (filtros.termino) {
    conditions.push('(rd.especie LIKE ? OR rd.nro_arbol LIKE ? OR rc.nro_recepcion LIKE ?)');
    const t = `%${filtros.termino}%`;
    params.push(t, t, t);
  }

  if (filtros.faja) {
    conditions.push('rd.faja = ?');
    params.push(filtros.faja);
  }

  if (filtros.nroArbol) {
    conditions.push('rd.nro_arbol LIKE ?');
    params.push(`%${filtros.nroArbol}%`);
  }

  const where = conditions.join(' AND ');

  return executeQuery(
    `SELECT
       rd.id,
       rd.recepcion_id,
       rd.rodeo_detalle_id,
       rd.especie,
       rd.faja,
       rd.nro_arbol,
       rd.seccion,
       rd.diamayor,
       rd.diamenor,
       rd.largo,
       rd.volumen,
       rd.despachado,
       rc.nro_recepcion,
       rc.fecha_recepcion,
       rc.numero_completo AS recepcion_numero
     FROM aserradero_recepcion_detalle rd
     JOIN aserradero_recepcion_cab rc ON rc.id = rd.recepcion_id
     WHERE ${where}
     ORDER BY rc.fecha_recepcion DESC, rd.id
     LIMIT 50`,
    params
  );
}
