import { executeQuery, executeRun } from '../../../db/sqlite.js';

export async function getRodeoSectores(empresaId) {
  const sql = empresaId
    ? `SELECT * FROM rodeo_sectores WHERE empresa_id = ? ORDER BY nombre`
    : `SELECT * FROM rodeo_sectores ORDER BY nombre`;
  const params = empresaId ? [empresaId] : [];
  return await executeQuery(sql, params);
}

export async function insertRodeoSector(sector) {
  const sql = `INSERT INTO rodeo_sectores (empresa_id, nombre) VALUES (?, ?)`;
  return await executeRun(sql, [sector.empresa_id, sector.nombre]);
}

export async function updateRodeoSector(sector) {
  const sql = `UPDATE rodeo_sectores SET nombre = ? WHERE id = ?`;
  return await executeRun(sql, [sector.nombre, sector.id]);
}

export async function deleteRodeoSector(id) {
  const sql = `DELETE FROM rodeo_sectores WHERE id = ?`;
  return await executeRun(sql, [id]);
}
