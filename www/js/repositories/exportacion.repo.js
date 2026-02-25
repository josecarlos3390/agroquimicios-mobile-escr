import { executeQuery } from '../db/sqlite.js';

export async function getLineasExportacion(hojaIds) {
  const placeholders = hojaIds.map(() => '?').join(', ');

  return await executeQuery(
    `SELECT
      hc.numero_completo  AS NRO_NOTA,
      hc.fecha_inicio     AS FECHA_INICIO,
      hd.producto_codigo  AS CODIGO_PRODUCTO,
      hd.producto_nombre  AS DESCRIPCION,
      (hd.dosis * l.hectareas) AS CANTIDAD,
      'Directo'           AS SELECCION,
      'P01'               AS GCA,
      l.codigo            AS CA,
      tp.cuenta_contable  AS CUENTA,
      l.hectareas         AS HECTAREAS_APLICADAS,
      l.nombre            AS SELECCIONAR_LOTE,
      hd.dosis            AS DOSIS,
      l.hectareas         AS HECTAREAS_REF,
      v.nombre            AS CULTIVO,       -- 👈 ahora viene de variedades
      s.nombre            AS SECTOR,
      ''                  AS CAUDAL
    FROM hojas_cab hc
    JOIN hojas_detalle hd  ON hd.hoja_id = hc.id
    JOIN hojas_lotes hl    ON hl.hoja_id = hc.id
    JOIN lotes l           ON l.id = hl.lote_id
    JOIN sectores s        ON s.id = l.sector_id
    LEFT JOIN variedades v ON v.id = l.variedad_id   -- 👈 LEFT JOIN por si el lote no tiene variedad
    JOIN productos p       ON p.id = hd.producto_id
    JOIN tipos_producto tp ON tp.id = p.tipo_producto_id
    WHERE hc.id IN (${placeholders})
    ORDER BY hc.numero_completo, hd.linea, l.id`,
    hojaIds
  );
}