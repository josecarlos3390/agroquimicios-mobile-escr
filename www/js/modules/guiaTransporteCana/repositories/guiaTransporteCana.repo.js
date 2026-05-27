import { executeRun, executeQuery, reservarNumeroSecuencial } from '../../../db/sqlite.js';

export async function getNextNumeroSecuencial() {
  return await reservarNumeroSecuencial('guia_transporte_cab');
}

export async function createGuia(data) {
  await executeRun(`
    INSERT INTO guia_transporte_cab (
      id, numero_secuencial, numero_completo, dispositivo_id,
      empresa_id, fecha, hora_llegada, hora_salida, hora_llegada_cola,
      boletario, turno, frente, propiedad, lote, variedad, cultivo, hectareas, observaciones,
      cod_liberacion,
      cod_chofer, nombre_chofer, cod_camion, placa, cod_chata, transportista, foto_camion_base64,
      cod_cargadora, cod_operadora, cod_tractor_chata, cod_tractorista, foto_semi_base64,
      estado
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BORRADOR')`,
    [
      data.id, data.numero_secuencial, data.numero_completo, data.dispositivo_id,
      data.empresa_id, data.fecha, data.hora_llegada ?? null, data.hora_salida ?? null, data.hora_llegada_cola ?? null,
      data.boletario ?? null, data.turno ?? null, data.frente ?? null, data.propiedad ?? null,
      data.lote ?? null, data.variedad ?? null, data.cultivo ?? null, data.hectareas ?? null, data.observaciones ?? null,
      data.cod_liberacion ?? null,
      data.cod_chofer ?? null, data.nombre_chofer ?? null, data.cod_camion ?? null, data.placa ?? null,
      data.cod_chata ?? null, data.transportista ?? null, data.foto_camion_base64 ?? null,
      data.cod_cargadora ?? null, data.cod_operadora ?? null, data.cod_tractor_chata ?? null,
      data.cod_tractorista ?? null, data.foto_semi_base64 ?? null,
    ]
  );
  return data.id;
}

export async function createCosechaMecanizada(guiaId, items) {
  for (const item of items) {
    await executeRun(`
      INSERT INTO guia_transporte_cosecha_mec
        (guia_id, numero_cosechadora, grilla_seleccion, cod_cosechadora, cod_operador, cod_tractor_transbordo, cod_tractorista)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        guiaId, item.numero_cosechadora, item.grilla_seleccion ?? null,
        item.cod_cosechadora ?? null, item.cod_operador ?? null,
        item.cod_tractor_transbordo ?? null, item.cod_tractorista ?? null,
      ]
    );
  }
}

export async function getGuias(empresaId = null) {
  const conditions = [];
  const params = [];
  if (empresaId) { conditions.push('g.empresa_id = ?'); params.push(empresaId); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return await executeQuery(`
    SELECT
      g.id, g.numero_completo, g.numero_secuencial,
      g.fecha, g.hora_llegada, g.hora_salida,
      g.boletario, g.turno, g.frente, g.propiedad,
      g.estado, g.cod_liberacion, g.placa, g.nombre_chofer,
      e.nombre AS empresa_nombre
    FROM guia_transporte_cab g
    LEFT JOIN empresas e ON e.id = g.empresa_id
    ${where}
    ORDER BY g.numero_secuencial DESC
  `, params);
}

export async function getGuiaById(id) {
  const r = await executeQuery(`
    SELECT g.*, e.nombre AS empresa_nombre
    FROM guia_transporte_cab g
    LEFT JOIN empresas e ON e.id = g.empresa_id
    WHERE g.id = ?`, [id]
  );
  return r[0] ?? null;
}

export async function getCosechaMecanizadaByGuiaId(guiaId) {
  return await executeQuery(`
    SELECT * FROM guia_transporte_cosecha_mec
    WHERE guia_id = ?
    ORDER BY numero_cosechadora ASC
  `, [guiaId]);
}

export async function deleteGuia(id) {
  await executeRun('DELETE FROM guia_transporte_cab WHERE id = ?', [id]);
}

export async function updateGuia(id, data) {
  await executeRun(`
    UPDATE guia_transporte_cab SET
      empresa_id           = ?,
      fecha                = ?,
      hora_llegada         = ?,
      hora_salida          = ?,
      hora_llegada_cola    = ?,
      boletario            = ?,
      turno                = ?,
      frente               = ?,
      propiedad            = ?,
      lote                 = ?,
      variedad             = ?,
      cultivo              = ?,
      hectareas            = ?,
      observaciones        = ?,
      cod_liberacion       = ?,
      cod_chofer           = ?,
      nombre_chofer        = ?,
      cod_camion           = ?,
      placa                = ?,
      cod_chata            = ?,
      transportista        = ?,
      foto_camion_base64   = ?,
      cod_cargadora        = ?,
      cod_operadora        = ?,
      cod_tractor_chata    = ?,
      cod_tractorista      = ?,
      foto_semi_base64     = ?,
      updated_at           = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      data.empresa_id ?? null,
      data.fecha,
      data.hora_llegada ?? null,
      data.hora_salida ?? null,
      data.hora_llegada_cola ?? null,
      data.boletario ?? null,
      data.turno ?? null,
      data.frente ?? null,
      data.propiedad ?? null,
      data.lote ?? null,
      data.variedad ?? null,
      data.cultivo ?? null,
      data.hectareas ?? null,
      data.observaciones ?? null,
      data.cod_liberacion ?? null,
      data.cod_chofer ?? null,
      data.nombre_chofer ?? null,
      data.cod_camion ?? null,
      data.placa ?? null,
      data.cod_chata ?? null,
      data.transportista ?? null,
      data.foto_camion_base64 ?? null,
      data.cod_cargadora ?? null,
      data.cod_operadora ?? null,
      data.cod_tractor_chata ?? null,
      data.cod_tractorista ?? null,
      data.foto_semi_base64 ?? null,
      id,
    ]
  );
}

export async function updateEstadoGuia(id, estado) {
  await executeRun(`UPDATE guia_transporte_cab SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [estado, id]);
}

export async function deleteCosechaMecanizadaByGuiaId(guiaId) {
  await executeRun('DELETE FROM guia_transporte_cosecha_mec WHERE guia_id = ?', [guiaId]);
}
