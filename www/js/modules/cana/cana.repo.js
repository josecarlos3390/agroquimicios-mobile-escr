import { executeRun, executeQuery } from '../../db/sqlite.js';

/* =========================================================
   CABECERA
========================================================= */
export async function createCanaCab(cab) {
  await executeRun(
    `INSERT INTO cana_cab (
      id, numero_secuencial, numero_completo, dispositivo_id,
      campana, empresa_id, tecnico_id,
      fecha_inicio, fecha_fin, mes, observaciones, estado
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BORRADOR')`,
    [
      cab.id, cab.numero_secuencial, cab.numero_completo, cab.dispositivo_id,
      cab.campana, cab.empresa_id, cab.tecnico_id,
      cab.fecha_inicio, cab.fecha_fin, cab.mes, cab.observaciones ?? null,
    ]
  );
  return cab.id;
}

export async function getNextNumeroSecuencialCana() {
  const r = await executeQuery(
    'SELECT COALESCE(MAX(numero_secuencial), 0) + 1 AS next FROM cana_cab'
  );
  return r[0].next;
}

export async function getCanaCabs(estado = null) {
  const where  = estado ? 'WHERE c.estado = ?' : '';
  const values = estado ? [estado] : [];
  return await executeQuery(`
    SELECT
      c.id, c.numero_completo, c.campana, c.mes,
      c.fecha_inicio, c.fecha_fin, c.estado,
      e.nombre AS empresa_nombre,
      t.nombre AS tecnico_nombre,
      COUNT(DISTINCT p.id) AS total_plantaciones
    FROM cana_cab c
    LEFT JOIN empresas e ON e.id = c.empresa_id
    LEFT JOIN tecnicos t ON t.id = c.tecnico_id
    LEFT JOIN cana_plantacion p ON p.cab_id = c.id
    ${where}
    GROUP BY c.id
    ORDER BY c.numero_secuencial DESC
  `, values);
}

export async function getCanaCabById(id) {
  const r = await executeQuery('SELECT * FROM cana_cab WHERE id = ?', [id]);
  return r[0] ?? null;
}

export async function deleteCanaCab(id) {
  // ON DELETE CASCADE elimina plantaciones → cortes e insumos automáticamente
  await executeRun('DELETE FROM cana_cab WHERE id = ?', [id]);
}

export async function updateEstadoCanaCab(id, estado) {
  await executeRun(
    'UPDATE cana_cab SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [estado, id]
  );
}

/* =========================================================
   PLANTACIONES
========================================================= */
export async function insertPlantacion(p) {
  const r = await executeRun(
    `INSERT INTO cana_plantacion
      (cab_id, lote_id, variedad_id, ha_manual, ha_mecanizada, ha_total,
       cantidad_sembradora_grupos, personas_por_grupo, orden)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      p.cab_id, p.lote_id, p.variedad_id ?? null,
      p.ha_manual ?? 0, p.ha_mecanizada ?? 0, p.ha_total ?? 0,
      p.cantidad_sembradora_grupos ?? null, p.personas_por_grupo ?? null,
      p.orden ?? 0,
    ]
  );
  return r.insertId ?? r.lastInsertRowid;
}

export async function getPlantacionesByCab(cab_id) {
  return await executeQuery(`
    SELECT
      p.*,
      l.nombre  AS lote_nombre,
      l.hectareas AS lote_hectareas,
      v.nombre  AS variedad_nombre
    FROM cana_plantacion p
    LEFT JOIN lotes     l ON l.id = p.lote_id
    LEFT JOIN variedades v ON v.id = p.variedad_id
    WHERE p.cab_id = ?
    ORDER BY p.orden, p.id
  `, [cab_id]);
}

export async function deletePlantacion(id) {
  await executeRun('DELETE FROM cana_plantacion WHERE id = ?', [id]);
}

/* =========================================================
   CORTES DE SEMILLA
========================================================= */
export async function insertCorte(c) {
  const r = await executeRun(
    `INSERT INTO cana_corte_semilla
      (plantacion_id, lote_semilla_id, variedad_id,
       sup_corte_ha, rendimiento_tn_ha,
       tn_cortadas_manual, tn_cortadas_mecanizada,
       consumo_semilla_tn_ha, orden)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      c.plantacion_id, c.lote_semilla_id ?? null, c.variedad_id ?? null,
      c.sup_corte_ha ?? null, c.rendimiento_tn_ha ?? null,
      c.tn_cortadas_manual ?? 0, c.tn_cortadas_mecanizada ?? 0,
      c.consumo_semilla_tn_ha ?? null, c.orden ?? 0,
    ]
  );
  return r.insertId ?? r.lastInsertRowid;
}

export async function getCortesByPlantacion(plantacion_id) {
  return await executeQuery(`
    SELECT
      cs.*,
      l.nombre AS lote_semilla_nombre,
      v.nombre AS variedad_nombre
    FROM cana_corte_semilla cs
    LEFT JOIN lotes      l ON l.id = cs.lote_semilla_id
    LEFT JOIN variedades v ON v.id = cs.variedad_id
    WHERE cs.plantacion_id = ?
    ORDER BY cs.orden, cs.id
  `, [plantacion_id]);
}

export async function deleteCorte(id) {
  await executeRun('DELETE FROM cana_corte_semilla WHERE id = ?', [id]);
}

/* =========================================================
   INSUMOS
========================================================= */
export async function insertInsumo(ins) {
  const r = await executeRun(
    `INSERT INTO cana_insumos
      (cab_id, tipo, producto_id, producto_nombre, cantidad, unidad, orden)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      ins.cab_id, ins.tipo ?? 'AGROQUIMICO',
      ins.producto_id ?? null, ins.producto_nombre,
      ins.cantidad ?? null, ins.unidad ?? null, ins.orden ?? 0,
    ]
  );
  return r.insertId ?? r.lastInsertRowid;
}

export async function getInsumosByCab(cab_id) {
  return await executeQuery(
    `SELECT i.*, p.codigo AS producto_codigo
     FROM cana_insumos i
     LEFT JOIN productos p ON p.id = i.producto_id
     WHERE i.cab_id = ?
     ORDER BY i.tipo, i.orden, i.id`,
    [cab_id]
  );
}

export async function deleteInsumosByCab(cab_id) {
  await executeRun('DELETE FROM cana_insumos WHERE cab_id = ?', [cab_id]);
}
