import { executeQuery, executeRun } from '../db/sqlite.js';
import { uuid } from '../utils/uuid.js';

/* =========================================================
   DETECCIÓN AUTOMÁTICA DEL TIPO DE ARCHIVO
   Detecta si el Excel es de productos o de lotes
   mirando los encabezados de la primera fila.
========================================================= */
export function detectarTipoExcel(headers) {
  const h = headers.map(c => String(c ?? '').trim().toUpperCase());

  const esProductos = h.includes('CODIGO') && h.includes('DESCRIPCION') &&
                      h.includes('UNIDAD') && h.includes('LINEA DE PRODUCTO');

  const esLotes     = h.includes('LOTE') && h.includes('HECTAREAS') &&
                      h.includes('SECTOR') && h.includes('CULTIVO');

  if (esProductos) return 'productos';
  if (esLotes)     return 'lotes';
  return null;
}

/* =========================================================
   LEER EXCEL CON SHEETJS
   Devuelve { headers, filas }
========================================================= */
export function leerExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data     = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet    = workbook.Sheets[workbook.SheetNames[0]];
        const rows     = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (rows.length < 2) {
          reject(new Error('El archivo está vacío o no tiene datos'));
          return;
        }

        const headers = rows[0].map(c => String(c ?? '').trim());
        const filas   = rows.slice(1).filter(r => r.some(c => c !== ''));

        resolve({ headers, filas });
      } catch (err) {
        reject(new Error('No se pudo leer el archivo: ' + err.message));
      }
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
}

/* =========================================================
   PREVISUALIZACIÓN — PRODUCTOS
   Analiza las filas y devuelve qué se va a insertar/actualizar
========================================================= */
export async function previsualizarProductos(headers, filas) {
  const idx = {
    codigo:  headers.findIndex(h => h.toUpperCase() === 'CODIGO'),
    nombre:  headers.findIndex(h => h.toUpperCase() === 'DESCRIPCION'),
    unidad:  headers.findIndex(h => h.toUpperCase() === 'UNIDAD'),
    linea:   headers.findIndex(h => h.toUpperCase() === 'LINEA DE PRODUCTO'),
  };

  // Cargar datos actuales de la BD para comparar
  const existentes = await executeQuery('SELECT id, codigo, nombre FROM productos');
  const codigoToId = Object.fromEntries(existentes.map(p => [p.codigo.toUpperCase(), p.id]));

  const tiposProducto = await executeQuery('SELECT id, nombre FROM tipos_producto');
  const tipoByNombre  = Object.fromEntries(tiposProducto.map(t => [t.nombre.toUpperCase(), t.id]));

  const unidades      = await executeQuery('SELECT id, codigo FROM unidades_medida');
  const unidadByCodigo = Object.fromEntries(unidades.map(u => [u.codigo.toUpperCase(), u.id]));

  const nuevos      = [];
  const actualizados = [];
  const errores     = [];

  for (const [i, fila] of filas.entries()) {
    const codigo  = String(fila[idx.codigo]  ?? '').trim().toUpperCase();
    const nombre  = String(fila[idx.nombre]  ?? '').trim().toUpperCase();
    const unidRaw = String(fila[idx.unidad]  ?? '').trim().toUpperCase();
    const linea   = String(fila[idx.linea]   ?? '').trim().toUpperCase();

    if (!codigo || !nombre) {
      errores.push({ fila: i + 2, msg: `Código o nombre vacío` });
      continue;
    }

    // Normalizar unidad: LTS → L, KGS → KG
    const unidadCodigo = unidRaw === 'LTS' ? 'L' : unidRaw === 'KGS' ? 'KG' : unidRaw;
    const unidadId     = unidadByCodigo[unidadCodigo] ?? null;
    const unidadNueva  = !unidadId && unidadCodigo;

    const tipoId    = tipoByNombre[linea] ?? null;
    const tipoNuevo = !tipoId && linea;

    const item = { codigo, nombre, linea, unidadCodigo, tipoId, tipoNuevo, unidadId, unidadNueva };

    if (codigoToId[codigo]) {
      actualizados.push({ ...item, id: codigoToId[codigo] });
    } else {
      nuevos.push(item);
    }
  }

  return { nuevos, actualizados, errores };
}

/* =========================================================
   IMPORTAR PRODUCTOS
   Aplica los cambios a la BD: INSERT OR REPLACE
========================================================= */
export async function importarProductos(nuevos, actualizados) {
  let insertados = 0;
  let modificados = 0;

  // Crear unidades de medida nuevas que vengan del Excel y no estén en la BD
  const unidadesCreadas = {};
  for (const p of [...nuevos, ...actualizados]) {
    if (p.unidadNueva && p.unidadCodigo && !unidadesCreadas[p.unidadCodigo]) {
      await executeRun(
        `INSERT OR IGNORE INTO unidades_medida (codigo, nombre, factor) VALUES (?, ?, 1)`,
        [p.unidadCodigo, p.unidadCodigo]
      );
      const [row] = await executeQuery(
        'SELECT id FROM unidades_medida WHERE codigo = ? LIMIT 1', [p.unidadCodigo]
      );
      unidadesCreadas[p.unidadCodigo] = row?.id;
    }
    if (!p.unidadId && unidadesCreadas[p.unidadCodigo]) {
      p.unidadId = unidadesCreadas[p.unidadCodigo];
    }
  }

  // Crear tipos de producto nuevos que vengan del Excel y no estén en la BD
  const tiposCreados = {};
  for (const p of [...nuevos, ...actualizados]) {
    if (p.tipoNuevo && p.linea && !tiposCreados[p.linea]) {
      await executeRun(
        `INSERT OR IGNORE INTO tipos_producto (nombre, cuenta_contable) VALUES (?, '711020')`,
        [p.linea]
      );
      const [row] = await executeQuery(
        'SELECT id FROM tipos_producto WHERE nombre = ? LIMIT 1', [p.linea]
      );
      tiposCreados[p.linea] = row?.id;
    }
    if (!p.tipoId && tiposCreados[p.linea]) {
      p.tipoId = tiposCreados[p.linea];
    }
    if (!p.tipoId) {
      const [fallback] = await executeQuery(
        `SELECT id FROM tipos_producto WHERE nombre = 'AGROQUIMICOS' LIMIT 1`
      );
      p.tipoId = fallback?.id ?? 1;
    }
  }

  for (const p of nuevos) {
    const id = uuid();
    await executeRun(
      `INSERT OR IGNORE INTO productos (id, codigo, nombre, tipo_producto_id, activo)
       VALUES (?, ?, ?, ?, 1)`,
      [id, p.codigo, p.nombre, p.tipoId]
    );
    await executeRun(
      `INSERT OR IGNORE INTO productos_unidades (producto_id, unidad_medida_id, es_default)
       VALUES (?, ?, 1)`,
      [id, p.unidadId]
    );
    await _insertarUnidadAlternativa(id, p.unidadId);
    insertados++;
  }

  for (const p of actualizados) {
    await executeRun(
      `UPDATE productos SET nombre = ?, tipo_producto_id = ? WHERE id = ?`,
      [p.nombre, p.tipoId, p.id]
    );
    await executeRun(
      `UPDATE productos_unidades SET es_default = 0 WHERE producto_id = ?`,
      [p.id]
    );
    await executeRun(
      `INSERT OR IGNORE INTO productos_unidades (producto_id, unidad_medida_id, es_default)
       VALUES (?, ?, 1)`,
      [p.id, p.unidadId]
    );
    await executeRun(
      `UPDATE productos_unidades SET es_default = 1
       WHERE producto_id = ? AND unidad_medida_id = ?`,
      [p.id, p.unidadId]
    );
    modificados++;
  }

  return { insertados, modificados };
}

/* =========================================================
   PREVISUALIZACIÓN — LOTES
========================================================= */
export async function previsualizarLotes(headers, filas) {
  const idx = {
    nombre:   headers.findIndex(h => h.toUpperCase() === 'LOTE'),
    codigo:   headers.findIndex(h => h.toUpperCase() === 'CODIGO'),
    hectareas:headers.findIndex(h => h.toUpperCase() === 'HECTAREAS'),
    variedad: headers.findIndex(h => h.toUpperCase() === 'VARIEDAD'),
    cultivo:  headers.findIndex(h => h.toUpperCase() === 'CULTIVO'),
    sector:   headers.findIndex(h => h.toUpperCase() === 'SECTOR'),
  };

  // Cargar catálogos de la BD
  const sectores   = await executeQuery('SELECT id, nombre FROM sectores');
  const cultivos   = await executeQuery('SELECT id, nombre FROM cultivos');
  const variedades = await executeQuery('SELECT id, nombre FROM variedades');
  const lotesExist = await executeQuery('SELECT id, codigo, nombre, sector_id FROM lotes');

  const sectorByNombre   = Object.fromEntries(sectores.map(s => [s.nombre.toUpperCase(), s.id]));
  const cultivoByNombre  = Object.fromEntries(cultivos.map(c => [c.nombre.toUpperCase(), c.id]));
  const variedadByNombre = Object.fromEntries(variedades.map(v => [v.nombre.toUpperCase(), v.id]));

  // Identificar lotes por nombre+sector_id (más confiable que codigo que puede venir vacío)
  const loteByNombreSector = Object.fromEntries(
    lotesExist.map(l => [`${l.nombre.toUpperCase()}_${String(l.sector_id)}`, l.id])
  );

  const nuevos              = [];
  const actualizados        = [];
  const errores             = [];
  const sectoresNuevos      = new Set();
  const cultivosNuevos      = new Set();
  const variedadesNuevas    = new Set();

  for (const [i, fila] of filas.entries()) {
    const nombre    = String(fila[idx.nombre]    ?? '').trim().toUpperCase();
    const codigo    = String(fila[idx.codigo]    ?? '').trim().toUpperCase();
    const hectareas = parseFloat(fila[idx.hectareas]) || null;
    const varNombre = String(fila[idx.variedad]  ?? '').trim().toUpperCase();
    const cultNombre= String(fila[idx.cultivo]   ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
    const sectNombre= String(fila[idx.sector]    ?? '').trim().toUpperCase();

    if (!nombre || !sectNombre) {
      errores.push({ fila: i + 2, msg: 'Nombre o sector vacío' });
      continue;
    }

    const sectorId   = sectorByNombre[sectNombre]  ?? null;
    const cultivoId  = cultivoByNombre[cultNombre] ?? null;
    const variedadId = variedadByNombre[varNombre] ?? null;

    if (!sectorId)                sectoresNuevos.add(sectNombre);
    if (cultNombre && !cultivoId) cultivosNuevos.add(cultNombre);
    if (varNombre  && !variedadId) variedadesNuevas.add(varNombre);

    // La clave usa nombre+sectorId para comparar con la BD.
    // sectorId puede ser null si el sector todavía no existe => será nuevo.
    const key  = `${nombre}_${String(sectorId ?? '')}`;
    const item = { nombre, codigo, hectareas, cultivoId, variedadId, sectorId,
                   sectorNombre: sectNombre, cultivoNombre: cultNombre, variedadNombre: varNombre };

    if (loteByNombreSector[key]) {
      actualizados.push({ ...item, id: loteByNombreSector[key] });
    } else {
      nuevos.push(item);
    }
  }

  return {
    nuevos,
    actualizados,
    errores,
    sectoresNuevos:    [...sectoresNuevos],
    cultivosNuevos:    [...cultivosNuevos],
    variedadesNuevas:  [...variedadesNuevas],
  };
}

/* =========================================================
   IMPORTAR LOTES
========================================================= */
export async function importarLotes(nuevos, actualizados) {
  const [empresa] = await executeQuery('SELECT id FROM empresas LIMIT 1');
  const empresaId = empresa?.id ?? 1;

  let insertados = 0;
  let modificados = 0;

  const sectoresCreados   = {};
  const cultivosCreados   = {};
  const variedadesCreadas = {};

  for (const l of [...nuevos, ...actualizados]) {
    // Sector
    if (!l.sectorId && l.sectorNombre && !sectoresCreados[l.sectorNombre]) {
      await executeRun(
        'INSERT OR IGNORE INTO sectores (empresa_id, nombre) VALUES (?, ?)',
        [empresaId, l.sectorNombre]
      );
      const [row] = await executeQuery(
        'SELECT id FROM sectores WHERE nombre = ? LIMIT 1', [l.sectorNombre]
      );
      sectoresCreados[l.sectorNombre] = row?.id;
    }
    if (!l.sectorId && sectoresCreados[l.sectorNombre]) {
      l.sectorId = sectoresCreados[l.sectorNombre];
    }

    // Cultivo
    if (!l.cultivoId && l.cultivoNombre && !cultivosCreados[l.cultivoNombre]) {
      await executeRun(
        'INSERT OR IGNORE INTO cultivos (nombre) VALUES (?)',
        [l.cultivoNombre]
      );
      const [row] = await executeQuery(
        'SELECT id FROM cultivos WHERE nombre = ? LIMIT 1', [l.cultivoNombre]
      );
      cultivosCreados[l.cultivoNombre] = row?.id;
    }
    if (!l.cultivoId && cultivosCreados[l.cultivoNombre]) {
      l.cultivoId = cultivosCreados[l.cultivoNombre];
    }

    // Variedad
    if (!l.variedadId && l.variedadNombre && l.cultivoId && !variedadesCreadas[l.variedadNombre]) {
      await executeRun(
        'INSERT OR IGNORE INTO variedades (cultivo_id, nombre) VALUES (?, ?)',
        [l.cultivoId, l.variedadNombre]
      );
      const [row] = await executeQuery(
        'SELECT id FROM variedades WHERE nombre = ? AND cultivo_id = ? LIMIT 1',
        [l.variedadNombre, l.cultivoId]
      );
      variedadesCreadas[l.variedadNombre] = row?.id;
    }
    if (!l.variedadId && variedadesCreadas[l.variedadNombre]) {
      l.variedadId = variedadesCreadas[l.variedadNombre];
    }
  }

  for (const l of nuevos) {
    if (!l.sectorId) continue;
    await executeRun(
      `INSERT INTO lotes (sector_id, codigo, nombre, hectareas, cultivo_id, variedad_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [l.sectorId, l.codigo, l.nombre, l.hectareas, l.cultivoId, l.variedadId]
    );
    insertados++;
  }

  for (const l of actualizados) {
    await executeRun(
      `UPDATE lotes SET nombre = ?, hectareas = ?, cultivo_id = ?, variedad_id = ?, sector_id = ?
       WHERE id = ?`,
      [l.nombre, l.hectareas, l.cultivoId, l.variedadId, l.sectorId, l.id]
    );
    modificados++;
  }

  return { insertados, modificados };
}

/* =========================================================
   HELPER INTERNO — unidad alternativa
========================================================= */
async function _insertarUnidadAlternativa(productoId, unidadDefaultId) {
  const unidades = await executeQuery('SELECT id, codigo FROM unidades_medida');
  const alt = unidades.find(u => u.id !== unidadDefaultId &&
    (u.codigo === 'L' || u.codigo === 'KG'));
  if (alt) {
    await executeRun(
      `INSERT OR IGNORE INTO productos_unidades (producto_id, unidad_medida_id, es_default)
       VALUES (?, ?, 0)`,
      [productoId, alt.id]
    );
  }
}