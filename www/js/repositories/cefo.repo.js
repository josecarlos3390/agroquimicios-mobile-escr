import { executeQuery, executeRun } from '../db/sqlite.js';

export async function insertarCefoCab(id, empresaId, nroCfo, fechaRecep, placa, chofer) {
  await executeRun(
    `INSERT INTO cefo_cab (id, empresa_id, nro_cfo_recib, fecha_recep, placa, chofer)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, empresaId, nroCfo, fechaRecep, placa, chofer]
  );
}

export async function insertarCefoDetalle(cefoId, especie, faja, nroArbol, seccion, diamayor, diamenor, largo, volumen) {
  await executeRun(
    `INSERT INTO cefo_detalle (cefo_id, especie, faja, nro_arbol, seccion, diamayor, diamenor, largo, volumen)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [cefoId, especie, faja, nroArbol, seccion, diamayor, diamenor, largo, volumen]
  );
}

export async function listarCefos(empresaId) {
  return executeQuery(
    `SELECT c.id, c.nro_cfo_recib, c.fecha_recep, c.placa, c.chofer,
            COUNT(d.id) as cantidad_arboles
     FROM cefo_cab c
     LEFT JOIN cefo_detalle d ON d.cefo_id = c.id
     WHERE c.empresa_id = ?
     GROUP BY c.id
     ORDER BY c.fecha_recep DESC, c.nro_cfo_recib`,
    [empresaId]
  );
}

export async function obtenerCefoPorId(id) {
  const cab = await executeQuery(
    `SELECT id, nro_cfo_recib, fecha_recep, placa, chofer, created_at
     FROM cefo_cab WHERE id = ?`,
    [id]
  );
  if (!cab[0]) return null;

  const det = await executeQuery(
    `SELECT id, especie, faja, nro_arbol, seccion, diamayor, diamenor, largo, volumen
     FROM cefo_detalle WHERE cefo_id = ? ORDER BY id`,
    [id]
  );

  return { cabecera: cab[0], detalle: det };
}

export async function eliminarCefo(id) {
  return executeRun(
    'DELETE FROM cefo_cab WHERE id = ?',
    [id]
  );
}
