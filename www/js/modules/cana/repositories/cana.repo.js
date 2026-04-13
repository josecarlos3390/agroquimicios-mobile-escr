import { executeRun, executeQuery } from '../../../db/sqlite.js';

/* =========================================================
   CABECERA
========================================================= */
export async function createCanaCab(data) {
  await executeRun(`
    INSERT INTO cana_cab (
      id, numero_secuencial, numero_completo, dispositivo_id,
      campana, empresa_id, tecnico_id,
      fecha_inicio, fecha_fin, mes, observaciones, estado
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BORRADOR')`,
    [
      data.id, data.numero_secuencial, data.numero_completo, data.dispositivo_id,
      data.campana, data.empresa_id, data.tecnico_id,
      data.fecha_inicio, data.fecha_fin, data.mes, data.observaciones ?? null,
    ]
  );
  return data.id;
}

export async function getNextNumeroSecuencialCana() {
  const r = await executeQuery(
    'SELECT COALESCE(MAX(numero_secuencial), 0) + 1 AS next FROM cana_cab'
  );
  return r[0].next;
}

export async function getCanaCabs(estado = null) {
  const where  = estado ? 'WHERE c.estado = ?' : '';
  const params = estado ? [estado] : [];
  return await executeQuery(`
    SELECT
      c.id, c.numero_completo, c.campana, c.mes,
      c.fecha_inicio, c.fecha_fin, c.estado,
      e.nombre AS empresa_nombre,
      t.nombre AS tecnico_nombre,
      COUNT(DISTINCT cp.id) AS total_lotes
    FROM cana_cab c
    LEFT JOIN empresas e ON e.id = c.empresa_id
    LEFT JOIN tecnicos t ON t.id = c.tecnico_id
    LEFT JOIN cana_plantacion cp ON cp.cab_id = c.id
    ${where}
    GROUP BY c.id
    ORDER BY c.numero_secuencial DESC
  `, params);
}

export async function deleteCanaCab(id) {
  // ON DELETE CASCADE se encarga de plantacion, corte e insumos
  await executeRun('DELETE FROM cana_cab WHERE id = ?', [id]);
}

export async function updateEstadoCanaCab(id, estado) {
  await executeRun(
    'UPDATE cana_cab SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [estado, id]
  );
}

/* =========================================================
   PLANTACIÓN
========================================================= */
export async function insertPlantacion(data) {
  const r = await executeRun(`
    INSERT INTO cana_plantacion
      (cab_id, lote_id, variedad_id, ha_manual, ha_mecanizada, ha_total,
       cantidad_sembradora_grupos, personas_por_grupo, orden)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.cab_id, data.lote_id, data.variedad_id ?? null,
      data.ha_manual ?? 0, data.ha_mecanizada ?? 0, data.ha_total ?? 0,
      data.cantidad_sembradora_grupos ?? null, data.personas_por_grupo ?? null,
      data.orden ?? 0,
    ]
  );
  return r.insertId ?? r.lastInsertRowid;
}

export async function getPlantacionesByCab(cab_id) {
  return await executeQuery(`
    SELECT
      cp.id, cp.lote_id, cp.variedad_id,
      cp.ha_manual, cp.ha_mecanizada, cp.ha_total,
      cp.cantidad_sembradora_grupos, cp.personas_por_grupo, cp.orden,
      l.nombre  AS lote_nombre,
      v.nombre  AS variedad_nombre
    FROM cana_plantacion cp
    LEFT JOIN lotes l ON l.id = cp.lote_id
    LEFT JOIN variedades v ON v.id = cp.variedad_id
    WHERE cp.cab_id = ?
    ORDER BY cp.orden`, [cab_id]
  );
}

export async function deletePlantacionesByCab(cab_id) {
  await executeRun('DELETE FROM cana_plantacion WHERE cab_id = ?', [cab_id]);
}

/* =========================================================
   CORTE DE SEMILLA
========================================================= */
export async function insertCorteSemilla(data) {
  await executeRun(`
    INSERT INTO cana_corte_semilla
      (plantacion_id, lote_semilla_id, variedad_id,
       sup_corte_ha, rendimiento_tn_ha,
       tn_cortadas_manual, tn_cortadas_mecanizada,
       consumo_semilla_tn_ha, orden)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.plantacion_id, data.lote_semilla_id ?? null, data.variedad_id ?? null,
      data.sup_corte_ha ?? null, data.rendimiento_tn_ha ?? null,
      data.tn_cortadas_manual ?? 0, data.tn_cortadas_mecanizada ?? 0,
      data.consumo_semilla_tn_ha ?? null, data.orden ?? 0,
    ]
  );
}

export async function getCorteSemillaByPlantacion(plantacion_id) {
  return await executeQuery(`
    SELECT
      cs.*, l.nombre AS lote_semilla_nombre, v.nombre AS variedad_nombre
    FROM cana_corte_semilla cs
    LEFT JOIN lotes l ON l.id = cs.lote_semilla_id
    LEFT JOIN variedades v ON v.id = cs.variedad_id
    WHERE cs.plantacion_id = ?
    ORDER BY cs.orden`, [plantacion_id]
  );
}

/* =========================================================
   INSUMOS
========================================================= */
export async function insertInsumo(data) {
  await executeRun(`
    INSERT INTO cana_insumos
      (cab_id, tipo, producto_id, producto_nombre, cantidad, unidad, orden)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.cab_id, data.tipo, data.producto_id ?? null,
      data.producto_nombre, data.cantidad ?? null,
      data.unidad ?? null, data.orden ?? 0,
    ]
  );
}

export async function getInsumosByCab(cab_id) {
  return await executeQuery(
    `SELECT * FROM cana_insumos WHERE cab_id = ? ORDER BY tipo, orden`,
    [cab_id]
  );
}

export async function deleteInsumosByCab(cab_id) {
  await executeRun('DELETE FROM cana_insumos WHERE cab_id = ?', [cab_id]);
}
