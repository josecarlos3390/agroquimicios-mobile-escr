import { executeQuery } from '../db/sqlite.js';

export async function getCaudales() {
  const caudales = await executeQuery(
    'SELECT id, nombre FROM caudales ORDER BY nombre'
  );
  
  return caudales;
}