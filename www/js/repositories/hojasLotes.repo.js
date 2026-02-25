import { executeRun, executeQuery } from '../db/sqlite.js';

export async function addLoteToHoja(hojaId, loteId) {
  await executeRun(
    `INSERT INTO hojas_lotes (hoja_id, lote_id) VALUES (?, ?)`,
    [hojaId, loteId]
  );
  return true;
}

// Inserción masiva en una sola query — mucho más rápido que N inserts secuenciales
export async function addLotesToHoja(hojaId, loteIds) {
  if (!loteIds || loteIds.length === 0) return;

  const placeholders = loteIds.map(() => `(?, ?)`).join(', ');
  const values = loteIds.flatMap(loteId => [hojaId, loteId]);

  await executeRun(
    `INSERT INTO hojas_lotes (hoja_id, lote_id) VALUES ${placeholders}`,
    values
  );
}

export async function getLotesByHojaId(hojaId) {
  return await executeQuery(
    `SELECT l.id, l.nombre, l.hectareas, l.cultivo_id
     FROM lotes l
     JOIN hojas_lotes hl ON hl.lote_id = l.id
     WHERE hl.hoja_id = ?`,
    [hojaId]
  );
}

export async function deleteLotesByHojaId(hojaId) {
  await executeRun(
    `DELETE FROM hojas_lotes WHERE hoja_id = ?`,
    [hojaId]
  );
}

export async function replaceLotesHoja(hojaId, nuevosLoteIds) {
  await deleteLotesByHojaId(hojaId);
  for (const loteId of nuevosLoteIds) {
    await addLoteToHoja(hojaId, loteId);
  }
}