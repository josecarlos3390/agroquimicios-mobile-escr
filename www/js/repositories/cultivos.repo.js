import { executeQuery, executeRun } from '../db/sqlite.js';

/* Por empresa */
export async function getCultivosByLotes(loteIds) {
  if (loteIds.length === 0) return [];

  const placeholders = loteIds.map(() => '?').join(',');

  return executeQuery(
    `
    SELECT DISTINCT c.id, c.nombre
    FROM cultivos c
    JOIN lotes l ON l.cultivo_id = c.id
    WHERE l.id IN (${placeholders})
    ORDER BY c.nombre
    `,
    loteIds
  );
}

export async function getCultivos(empresaId) {
  return await executeQuery(
    'SELECT * FROM cultivos WHERE empresa_id = ? ORDER BY nombre',
    [empresaId]
  );
}

export async function saveCultivo(c) {
  if (c.id) {
    await executeRun(
      'UPDATE cultivos SET nombre = ? WHERE id = ?',
      [c.nombre, c.id]
    );
  } else {
    await executeRun(
      'INSERT INTO cultivos (empresa_id, nombre) VALUES (?, ?)',
      [c.empresa_id, c.nombre]
    );
  }
}

export async function deleteCultivo(id) {
  await executeRun('DELETE FROM cultivos WHERE id = ?', [id]);
}
