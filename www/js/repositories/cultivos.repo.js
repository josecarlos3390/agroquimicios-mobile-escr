import { executeQuery, executeRun } from '../db/sqlite.js';

/* EXISTENTE */
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

/* 🔥 AGREGAR ESTO */
export async function getCultivos() {
  return await executeQuery('SELECT * FROM cultivos ORDER BY nombre');
}

export async function saveCultivo(c) {
  if (c.id) {
    await executeRun(
      'UPDATE cultivos SET nombre = ? WHERE id = ?',
      [c.nombre, c.id]
    );
  } else {
    await executeRun(
      'INSERT INTO cultivos (nombre) VALUES (?)',
      [c.nombre]
    );
  }
}

export async function deleteCultivo(id) {
  await executeRun('DELETE FROM cultivos WHERE id = ?', [id]);
}
