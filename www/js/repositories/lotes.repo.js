import { executeQuery, executeRun } from '../db/sqlite.js';

/* =========================
   LISTAR LOTES POR SECTOR
========================= */
export async function getLotesBySector(sectorId) {
  const sql = `
    SELECT
      l.*,
      c.nombre AS cultivo_nombre,
      v.nombre AS variedad_nombre,
      s.nombre AS sector_nombre
    FROM lotes l
    LEFT JOIN cultivos c ON c.id = l.cultivo_id
    LEFT JOIN variedades v ON v.id = l.variedad_id
    LEFT JOIN sectores s ON s.id = l.sector_id
    WHERE l.sector_id = ?
    ORDER BY l.nombre
  `;
  return await executeQuery(sql, [sectorId]);
}

/* =========================
   LISTAR LOTES DE MÚLTIPLES SECTORES
   Devuelve lotes ordenados por sector, luego nombre
========================= */
export async function getLotesBySectores(sectorIds) {
  if (!sectorIds || sectorIds.length === 0) return [];
  const placeholders = sectorIds.map(() => '?').join(', ');
  const sql = `
    SELECT
      l.*,
      c.nombre AS cultivo_nombre,
      v.nombre AS variedad_nombre,
      s.nombre AS sector_nombre,
      s.id     AS sector_id_ref
    FROM lotes l
    LEFT JOIN cultivos c  ON c.id = l.cultivo_id
    LEFT JOIN variedades v ON v.id = l.variedad_id
    JOIN  sectores s      ON s.id = l.sector_id
    WHERE l.sector_id IN (${placeholders})
    ORDER BY s.nombre, l.nombre
  `;
  return await executeQuery(sql, sectorIds);
}

/* =========================
   INSERTAR
========================= */
export async function insertLote(lote) {
  const sql = `
    INSERT INTO lotes (
      codigo,
      sector_id,
      nombre,
      cultivo_id,
      variedad_id,
      hectareas,
      fecha_siembra
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  return await executeRun(sql, [
    lote.codigo ?? null,
    lote.sector_id,
    lote.nombre,
    lote.cultivo_id,
    lote.variedad_id,
    lote.hectareas,
    lote.fecha_siembra
  ]);
}

/* =========================
   ACTUALIZAR
========================= */
export async function updateLote(lote) {
  const sql = `
    UPDATE lotes
    SET codigo = ?,
        nombre = ?,
        cultivo_id = ?,
        variedad_id = ?,
        hectareas = ?,
        fecha_siembra = ?
    WHERE id = ?
  `;
  return await executeRun(sql, [
    lote.codigo ?? null,
    lote.nombre,
    lote.cultivo_id,
    lote.variedad_id,
    lote.hectareas,
    lote.fecha_siembra,
    lote.id
  ]);
}

/* =========================
   ELIMINAR
========================= */
export async function deleteLote(id) {
  const sql = `DELETE FROM lotes WHERE id = ?`;
  return await executeRun(sql, [id]);
}
