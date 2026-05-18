import { executeRun, executeQuery, reservarNumeroSecuencial } from '../../../db/sqlite.js';

export async function getNextNumeroSecuencial() {
  return await reservarNumeroSecuencial('combustible_asignaciones');
}

export async function createAsignacion(data) {
  await executeRun(`
    INSERT INTO combustible_asignaciones (
      id, numero_secuencial, numero_completo,
      empresa_id, fecha, placa_codigo,
      persona_recibe, persona_entrega, cantidad,
      tipo_combustible, horometro, foto_base64, observaciones, estado
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BORRADOR')`,
    [
      data.id, data.numero_secuencial, data.numero_completo,
      data.empresa_id, data.fecha, data.placa_codigo,
      data.persona_recibe, data.persona_entrega, data.cantidad,
      data.tipo_combustible, data.horometro ?? null, data.foto_base64 ?? null, data.observaciones ?? null,
    ]
  );
  return data.id;
}

export async function getAsignaciones(empresaId = null) {
  const conditions = [];
  const params = [];
  if (empresaId) { conditions.push('ca.empresa_id = ?'); params.push(empresaId); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return await executeQuery(`
    SELECT
      ca.id, ca.numero_completo, ca.numero_secuencial,
      ca.fecha, ca.placa_codigo,
      ca.persona_recibe, ca.persona_entrega,
      ca.cantidad, ca.horometro, ca.tipo_combustible,
      ca.estado, ca.observaciones,
      e.nombre AS empresa_nombre
    FROM combustible_asignaciones ca
    LEFT JOIN empresas e ON e.id = ca.empresa_id
    ${where}
    ORDER BY ca.numero_secuencial DESC
  `, params);
}

export async function getAsignacionById(id) {
  const r = await executeQuery(`
    SELECT
      ca.*,
      e.nombre AS empresa_nombre
    FROM combustible_asignaciones ca
    LEFT JOIN empresas e ON e.id = ca.empresa_id
    WHERE ca.id = ?`, [id]
  );
  return r[0] ?? null;
}

export async function deleteAsignacion(id) {
  await executeRun('DELETE FROM combustible_asignaciones WHERE id = ?', [id]);
}

export async function updateAsignacion(id, data) {
  await executeRun(`
    UPDATE combustible_asignaciones SET
      empresa_id       = ?,
      fecha            = ?,
      placa_codigo     = ?,
      persona_recibe   = ?,
      persona_entrega  = ?,
      cantidad         = ?,
      tipo_combustible = ?,
      horometro        = ?,
      foto_base64      = ?,
      observaciones    = ?,
      updated_at       = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      data.empresa_id ?? null,
      data.fecha,
      data.placa_codigo,
      data.persona_recibe,
      data.persona_entrega,
      data.cantidad,
      data.tipo_combustible,
      data.horometro ?? null,
      data.foto_base64 ?? null,
      data.observaciones ?? null,
      id,
    ]
  );
}
