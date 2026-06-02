import { executeQuery, executeRun } from '../../../db/sqlite.js';

export async function insertarDespachoCab(id, empresaId, numeroSecuencial, numeroCompleto, nroDespacho, fechaDespacho, placa, chofer, observaciones) {
  await executeRun(
    `INSERT INTO aserradero_despacho_cab (id, empresa_id, numero_secuencial, numero_completo, nro_despacho, fecha_despacho, placa, chofer, observaciones)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, empresaId, numeroSecuencial, numeroCompleto, nroDespacho, fechaDespacho, placa, chofer, observaciones]
  );
}

export async function insertarDespachoDetalle(despachoId, rodeoDetalleId, especie, faja, nroArbol, seccion, diamayor, diamenor, largo, volumen) {
  await executeRun(
    `INSERT INTO aserradero_despacho_detalle (despacho_id, rodeo_detalle_id, especie, faja, nro_arbol, seccion, diamayor, diamenor, largo, volumen)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [despachoId, rodeoDetalleId, especie, faja, nroArbol, seccion, diamayor, diamenor, largo, volumen]
  );
}

export async function marcarDetalleDespachado(rodeoDetalleId) {
  await executeRun(
    "UPDATE rodeo_detalle SET estado_uso = 'DESPACHO_ASERRADERO' WHERE id = ?",
    [rodeoDetalleId]
  );
}

export async function desmarcarDetalleDespachado(rodeoDetalleId) {
  await executeRun(
    "UPDATE rodeo_detalle SET estado_uso = 'DISPONIBLE' WHERE id = ?",
    [rodeoDetalleId]
  );
}

export async function listarDespachos(empresaId) {
  return executeQuery(
    `SELECT d.id, d.numero_completo, d.nro_despacho, d.fecha_despacho, d.placa, d.chofer,
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
    `SELECT id, numero_completo, nro_despacho, fecha_despacho, placa, chofer, observaciones, created_at
     FROM aserradero_despacho_cab WHERE id = ?`,
    [id]
  );
  if (!cab[0]) return null;

  const det = await executeQuery(
    `SELECT
       dd.id,
       dd.rodeo_detalle_id,
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
     FROM aserradero_despacho_detalle dd
     LEFT JOIN rodeo_detalle rdt ON rdt.id = dd.rodeo_detalle_id
     LEFT JOIN rodeo_cab rc ON rc.id = rdt.rodeo_cab_id
     WHERE dd.despacho_id = ?
     ORDER BY dd.id`,
    [id]
  );

  return { cabecera: cab[0], detalle: det };
}

export async function eliminarDespacho(id) {
  const detalles = await executeQuery(
    'SELECT rodeo_detalle_id FROM aserradero_despacho_detalle WHERE despacho_id = ?',
    [id]
  );
  for (const d of detalles) {
    if (d.rodeo_detalle_id) {
      await desmarcarDetalleDespachado(d.rodeo_detalle_id);
    }
  }
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

export async function eliminarDespachoDetalle(despachoDetalleId, rodeoDetalleId) {
  await executeRun(
    'DELETE FROM aserradero_despacho_detalle WHERE id = ?',
    [despachoDetalleId]
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
