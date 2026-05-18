import { executeRun, executeQuery, reservarNumeroSecuencial } from '../../../db/sqlite.js';

/* =========================================================
   CABECERA
======================================================== */
export async function createCorteSemillaCab(data) {
  await executeRun(`
    INSERT INTO corte_semilla_cab (
      id, numero_secuencial, numero_completo, dispositivo_id,
      campana, empresa_id, tecnico_id,
      fecha, mes, observaciones, estado
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BORRADOR')`,
    [
      data.id, data.numero_secuencial, data.numero_completo, data.dispositivo_id,
      data.campana, data.empresa_id, data.tecnico_id,
      data.fecha, data.mes, data.observaciones ?? null,
    ]
  );
  return data.id;
}

export async function getNextNumeroSecuencialCorteSemilla() {
  return await reservarNumeroSecuencial('corte_semilla_cab');
}

export async function getCorteSemillaCabs(estado = null, empresaId = null) {
  const conditions = [];
  const params = [];
  if (estado)    { conditions.push('cs.estado = ?');     params.push(estado); }
  if (empresaId) { conditions.push('cs.empresa_id = ?'); params.push(empresaId); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return await executeQuery(`
    SELECT
      cs.id, cs.numero_completo, cs.campana, cs.mes,
      cs.fecha, cs.estado,
      e.nombre AS empresa_nombre,
      t.nombre AS tecnico_nombre,
      COUNT(DISTINCT csd.id) AS total_cortes
    FROM corte_semilla_cab cs
    LEFT JOIN empresas e ON e.id = cs.empresa_id
    LEFT JOIN tecnicos t ON t.id = cs.tecnico_id
    LEFT JOIN corte_semilla_detalle csd ON csd.cab_id = cs.id
    ${where}
    GROUP BY cs.id
    ORDER BY cs.numero_secuencial DESC
  `, params);
}

export async function deleteCorteSemillaCab(id) {
  await executeRun('DELETE FROM corte_semilla_cab WHERE id = ?', [id]);
}

export async function getCorteSemillaCabById(id) {
  const r = await executeQuery(`
    SELECT cs.*, e.nombre AS empresa_nombre, t.nombre AS tecnico_nombre
    FROM corte_semilla_cab cs
    LEFT JOIN empresas e ON e.id = cs.empresa_id
    LEFT JOIN tecnicos t ON t.id = cs.tecnico_id
    WHERE cs.id = ?`, [id]
  );
  return r[0] ?? null;
}

export async function updateCorteSemillaCab(id, data) {
  await executeRun(`
    UPDATE corte_semilla_cab SET
      empresa_id    = ?,
      tecnico_id    = ?,
      campana       = ?,
      fecha         = ?,
      mes           = ?,
      observaciones = ?,
      estado        = ?,
      updated_at    = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      data.empresa_id ?? null, data.tecnico_id ?? null,
      data.campana ?? null, data.fecha ?? null, data.mes ?? null,
      data.observaciones ?? null, data.estado ?? 'BORRADOR', id,
    ]
  );
}

/* =========================================================
   DETALLE
======================================================== */
export async function insertCorteSemillaDetalle(data) {
  await executeRun(`
    INSERT INTO corte_semilla_detalle
      (cab_id, lote_semilla_id, variedad_id, fecha_corte,
       sup_corte_ha, rendimiento_tn_ha,
       tn_cortadas_manual, tn_cortadas_mecanizada,
       consumo_semilla_tn_ha, lote_plantado_id, total_general_ha, sup_plantada_mec_ha, orden)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.cab_id, data.lote_semilla_id ?? null, data.variedad_id ?? null,
      data.fecha_corte ?? null, data.sup_corte_ha ?? null,
      data.rendimiento_tn_ha ?? null,
      data.tn_cortadas_manual ?? 0, data.tn_cortadas_mecanizada ?? 0,
      data.consumo_semilla_tn_ha ?? null, data.lote_plantado_id ?? null,
      data.total_general_ha ?? null, data.sup_plantada_mec_ha ?? null, data.orden ?? 0,
    ]
  );
}

export async function getCortesByCab(cab_id) {
  return await executeQuery(`
    SELECT
      csd.*,
      l.nombre AS lote_semilla_nombre,
      v.nombre AS variedad_nombre,
      lp.nombre AS lote_plantado_nombre
    FROM corte_semilla_detalle csd
    LEFT JOIN lotes l ON l.id = csd.lote_semilla_id
    LEFT JOIN variedades v ON v.id = csd.variedad_id
    LEFT JOIN lotes lp ON lp.id = csd.lote_plantado_id
    WHERE csd.cab_id = ?
    ORDER BY csd.orden`, [cab_id]
  );
}

export async function deleteCortesByCab(cab_id) {
  await executeRun('DELETE FROM corte_semilla_detalle WHERE cab_id = ?', [cab_id]);
}

export async function deleteCorteDetalle(id) {
  await executeRun('DELETE FROM corte_semilla_detalle WHERE id = ?', [id]);
}

export async function updateEstadoCorteSemillaCab(id, estado) {
  await executeRun(
    'UPDATE corte_semilla_cab SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [estado, id]
  );
}

/* =========================================================
   EXPORTACIÓN A EXCEL
======================================================== */
export async function getLineasExportacionCorteSemilla(cab_id) {
  return await executeQuery(`
    SELECT
      csd.fecha_corte,
      '' AS corte_sector_codigo,
      ss.nombre AS corte_sector_nombre,
      ls.nombre AS lote_semilla_nombre,
      v.nombre AS variedad_nombre,
      csd.sup_corte_ha,
      csd.rendimiento_tn_ha,
      csd.tn_cortadas_manual,
      csd.tn_cortadas_mecanizada,
      csd.total_general_ha,
      lp.nombre AS lote_plantado_nombre,
      sp.nombre AS lote_plantado_sector_nombre
    FROM corte_semilla_detalle csd
    JOIN corte_semilla_cab csc ON csc.id = csd.cab_id
    JOIN empresas e ON e.id = csc.empresa_id
    LEFT JOIN lotes ls ON ls.id = csd.lote_semilla_id
    LEFT JOIN sectores ss ON ss.id = ls.sector_id
    LEFT JOIN variedades v ON v.id = csd.variedad_id
    LEFT JOIN lotes lp ON lp.id = csd.lote_plantado_id
    LEFT JOIN sectores sp ON sp.id = lp.sector_id
    WHERE csd.cab_id = ?
    ORDER BY csd.orden
  `, [cab_id]);
}
