import { executeRun, executeQuery } from '../db/sqlite.js';

export async function createHojaCab(hoja) {
  await executeRun(
    `
    INSERT INTO hojas_cab (
      id,
      numero_secuencial,
      numero_completo,
      dispositivo_id,
      campana,
      empresa_id,
      cultivo_id,
      tecnico_id,
      sector_id,
      tipo_aplicacion_id,
      caudal_id,
      caudal_descripcion,
      mes,
      fecha_inicio,
      fecha_fin,
      cantidad_hectareas,
      cantidad_hectareas_lotes,
      observaciones,
      estado
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BORRADOR')
    `,
    [
      hoja.id,
      hoja.numero_secuencial,
      hoja.numero_completo,
      hoja.dispositivo_id,
      hoja.campana,
      hoja.empresa_id,
      hoja.cultivo_id,
      hoja.tecnico_id,
      hoja.sector_id,
      hoja.tipo_aplicacion_id,
      hoja.caudal_id,
      hoja.caudal_descripcion ?? null,
      hoja.mes,
      hoja.fecha_inicio,
      hoja.fecha_fin,
      hoja.cantidad_hectareas,
      hoja.cantidad_hectareas_lotes,
      hoja.observaciones ?? null
    ]
  );

  return hoja.id;
}

export async function updateHojaCab(id, data) {
  await executeRun(
    `
    UPDATE hojas_cab SET
      empresa_id = ?,
      campana = ?,
      cultivo_id = ?,
      tecnico_id = ?,
      sector_id = ?,
      tipo_aplicacion_id = ?,
      caudal_id = ?,
      caudal_descripcion = ?,
      mes = ?,
      fecha_inicio = ?,
      fecha_fin = ?,
      cantidad_hectareas = ?,
      observaciones = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [
      data.empresa_id,
      data.campana,
      data.cultivo_id,
      data.tecnico_id,
      data.sector_id,
      data.tipo_aplicacion_id,
      data.caudal_id,
      data.caudal_descripcion ?? null,
      data.mes,
      data.fecha_inicio,
      data.fecha_fin,
      data.cantidad_hectareas,
      data.observaciones,
      id
    ]
  );
}


export async function getHojaCabById(id) {
  const result = await executeQuery(
    'SELECT * FROM hojas_cab WHERE id = ?',
    [id]
  );

  return result[0] || null;
}


export async function getNextNumeroSecuencial() {
  const result = await executeQuery(
    'SELECT COALESCE(MAX(numero_secuencial), 0) + 1 AS next FROM hojas_cab'
  );

  return result[0].next;
}

export async function getHojas(estado = null) {
  const whereClause = estado ? `WHERE h.estado = '${estado}'` : '';
  return await executeQuery(`
    SELECT 
      h.id,
      h.numero_completo,
      h.campana,
      h.mes,
      h.fecha_inicio,
      h.fecha_fin,
      h.cantidad_hectareas,
      h.estado,
      h.sync_status,
      e.nombre AS empresa_nombre,
      c.nombre AS cultivo_nombre,
      t.nombre AS tecnico_nombre,
      COUNT(hd.id) AS total_productos
    FROM hojas_cab h
    LEFT JOIN empresas e ON e.id = h.empresa_id
    LEFT JOIN cultivos c ON c.id = h.cultivo_id
    LEFT JOIN tecnicos t ON t.id = h.tecnico_id
    LEFT JOIN hojas_detalle hd ON hd.hoja_id = h.id
    ${whereClause}
    GROUP BY h.id
    ORDER BY h.numero_secuencial DESC
  `);
}

export async function updateEstadoHoja(id, nuevoEstado) {
  await executeRun(
    `UPDATE hojas_cab SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [nuevoEstado, id]
  );
}

export async function deleteHojaCab(id) {
    // Primero eliminar registros relacionados
  await executeRun('DELETE FROM hojas_lotes WHERE hoja_id = ?', [id]);
  await executeRun('DELETE FROM hojas_detalle WHERE hoja_id = ?', [id]);
  // Luego eliminar la cabecera
  await executeRun('DELETE FROM hojas_cab WHERE id = ?', [id]);
}