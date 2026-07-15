import { executeQuery, executeRun, reservarNumeroSecuencial } from '../../../db/sqlite.js';

export async function getNextNumeroSecuencial() {
  return await reservarNumeroSecuencial('rodeo_cab');
}

export async function createRodeoCab(data) {
  await executeRun(`
    INSERT INTO rodeo_cab (
      id, empresa_id, numero_secuencial, numero_completo,
      fecha, sector_id, placa, chofer, observaciones, estado
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'BORRADOR')`,
    [
      data.id, data.empresa_id, data.numero_secuencial, data.numero_completo,
      data.fecha, data.sector_id ?? null,
      data.placa ?? null, data.chofer ?? null, data.observaciones ?? null,
    ]
  );
  return data.id;
}

export async function createRodeoDetalle(rodeoCabId, items) {
  for (const item of items) {
    await executeRun(`
      INSERT INTO rodeo_detalle (
        rodeo_cab_id, nro_rodeo, x_coord, y_coord, especie,
        faja, nro_arbol, seccion, d1, d2, largo, volumen, para_transporte
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rodeoCabId, item.nro_rodeo ?? null, item.x_coord ?? null, item.y_coord ?? null,
        item.especie ?? null, item.faja ?? null, item.nro_arbol ?? null, item.seccion ?? null,
        item.d1 ?? null, item.d2 ?? null, item.largo ?? null, item.volumen ?? null,
        item.para_transporte ?? null,
      ]
    );
  }
}

export async function getRodeos(empresaId) {
  const conditions = [];
  const params = [];
  if (empresaId) { conditions.push('r.empresa_id = ?'); params.push(empresaId); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return await executeQuery(`
    SELECT
      r.id, r.numero_completo, r.numero_secuencial,
      r.fecha, r.placa, r.chofer, r.observaciones, r.estado,
      s.nombre AS sector_nombre,
      COUNT(d.id) AS cantidad_arboles
    FROM rodeo_cab r
    LEFT JOIN rodeo_sectores s ON s.id = r.sector_id
    LEFT JOIN rodeo_detalle d ON d.rodeo_cab_id = r.id
    ${where}
    GROUP BY r.id
    ORDER BY r.numero_secuencial DESC
  `, params);
}

export async function getRodeoById(id) {
  const r = await executeQuery(`
    SELECT r.*, s.nombre AS sector_nombre
    FROM rodeo_cab r
    LEFT JOIN rodeo_sectores s ON s.id = r.sector_id
    WHERE r.id = ?`, [id]
  );
  return r[0] ?? null;
}

export async function getRodeoDetalleByCabId(cabId) {
  return await executeQuery(`
    SELECT * FROM rodeo_detalle WHERE rodeo_cab_id = ? ORDER BY id ASC
  `, [cabId]);
}

export async function deleteRodeo(id) {
  await executeRun('DELETE FROM rodeo_cab WHERE id = ?', [id]);
}

export async function updateEstadoRodeo(id, estado) {
  await executeRun(`UPDATE rodeo_cab SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [estado, id]);
}
