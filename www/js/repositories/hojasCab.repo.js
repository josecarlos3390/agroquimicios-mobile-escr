import { executeRun, executeQuery, reservarNumeroSecuencial } from '../db/sqlite.js';

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
      tipo_aplicacion_id,
      variedad_id,
      caudal_id,
      caudal_descripcion,
      mes,
      fecha_inicio,
      fecha_fin,
      cantidad_hectareas,
      cantidad_hectareas_lotes,
      observaciones,
      estado
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BORRADOR')
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
      hoja.tipo_aplicacion_id,
      hoja.variedad_id ?? null,
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
      tipo_aplicacion_id = ?,
      variedad_id = ?,
      caudal_id = ?,
      caudal_descripcion = ?,
      mes = ?,
      fecha_inicio = ?,
      fecha_fin = ?,
      cantidad_hectareas = ?,
      cantidad_hectareas_lotes = ?,
      observaciones = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [
      data.empresa_id,
      data.campana,
      data.cultivo_id,
      data.tecnico_id,
      data.tipo_aplicacion_id,
      data.variedad_id ?? null,
      data.caudal_id,
      data.caudal_descripcion ?? null,
      data.mes,
      data.fecha_inicio,
      data.fecha_fin,
      data.cantidad_hectareas,
      data.cantidad_hectareas_lotes ?? data.cantidad_hectareas,
      data.observaciones,
      id
    ]
  );
}


export async function getHojaCabById(id) {
  const result = await executeQuery(
    `SELECT
       h.*,
       e.nombre AS empresa_nombre,
       c.nombre AS cultivo_nombre,
       t.nombre AS tecnico_nombre,
       ta.nombre AS tipo_aplicacion_nombre,
       v.nombre AS variedad_nombre
     FROM hojas_cab h
     LEFT JOIN empresas e ON e.id = h.empresa_id
     LEFT JOIN cultivos c ON c.id = h.cultivo_id
     LEFT JOIN tecnicos t ON t.id = h.tecnico_id
     LEFT JOIN tipos_aplicacion ta ON ta.id = h.tipo_aplicacion_id
     LEFT JOIN variedades v ON v.id = h.variedad_id
     WHERE h.id = ?`,
    [id]
  );

  return result[0] || null;
}


export async function getNextNumeroSecuencial() {
  return await reservarNumeroSecuencial('hojas_cab');
}

export async function getHojas(estado = null) {
  const whereClause = estado ? `WHERE h.estado = ?` : '';
  const values = estado ? [estado] : [];
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
      COUNT(DISTINCT hd.id) AS total_productos,
      GROUP_CONCAT(DISTINCT s.nombre ORDER BY s.nombre) AS sectores_nombres
    FROM hojas_cab h
    LEFT JOIN empresas e ON e.id = h.empresa_id
    LEFT JOIN cultivos c ON c.id = h.cultivo_id
    LEFT JOIN tecnicos t ON t.id = h.tecnico_id
    LEFT JOIN hojas_detalle hd ON hd.hoja_id = h.id
    LEFT JOIN hojas_sectores hs ON hs.hoja_id = h.id
    LEFT JOIN sectores s ON s.id = hs.sector_id
    ${whereClause}
    GROUP BY h.id
    ORDER BY h.numero_secuencial DESC
  `, values);
}

export async function updateEstadoHoja(id, nuevoEstado) {
  await executeRun(
    `UPDATE hojas_cab SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [nuevoEstado, id]
  );
}

export async function getHectareasHoja(id) {
  const result = await executeQuery(
    'SELECT cantidad_hectareas FROM hojas_cab WHERE id = ?',
    [id]
  );
  return result[0] ?? null;
}

export async function deleteHojaCab(id) {
    // Primero eliminar registros relacionados
  await executeRun('DELETE FROM hojas_sectores WHERE hoja_id = ?', [id]);
  await executeRun('DELETE FROM hojas_lotes WHERE hoja_id = ?', [id]);
  await executeRun('DELETE FROM hojas_detalle WHERE hoja_id = ?', [id]);
  // Luego eliminar la cabecera
  await executeRun('DELETE FROM hojas_cab WHERE id = ?', [id]);
}