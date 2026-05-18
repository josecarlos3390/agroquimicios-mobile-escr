import { uuid } from '../utils/uuid.js';
import {
  getEmpresasMap,
  getProductosMap,
  getTiposProductoMap,
  getUnidadesMap,
  getSectoresMap,
  getCultivosMap,
  getVariedadesMap,
  getLotesMap,
  getUnidadPorCodigo,
  crearUnidadMedidaImportacion,
  crearTipoProductoImportacion,
  getTipoProductoFallback,
  crearProductoImportacion,
  actualizarProductoImportacion,
  asignarUnidadAProducto,
  resetearUnidadesDefault,
  setUnidadDefault,
  getUnidadesMedidaList,
  insertarUnidadAlternativa,
  getSectorPorNombreYEmpresa,
  crearSectorImportacion,
  getCultivoPorNombreYEmpresa,
  crearCultivoImportacion,
  getVariedadPorNombreYCultivo,
  crearVariedadImportacion,
  crearLoteImportacion,
  actualizarLoteImportacion
} from '../repositories/importacion.repo.js';

/* =========================================================
   DETECCIÓN AUTOMÁTICA DEL TIPO DE ARCHIVO
   Detecta si el Excel es de productos o de lotes
   mirando los encabezados de la primera fila.
========================================================= */
export function detectarTipoExcel(headers) {
  const h = headers.map(c => String(c ?? '').trim().toUpperCase());

  const esProductos = h.includes('CODIGO') && h.includes('DESCRIPCION') &&
                      h.includes('UNIDAD') && h.includes('LINEA DE PRODUCTO') &&
                      h.includes('EMPRESA');

  const esLotes     = h.includes('LOTE') && h.includes('HECTAREAS') &&
                      h.includes('SECTOR') && h.includes('CULTIVO') &&
                      h.includes('EMPRESA');

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
    empresa: headers.findIndex(h => h.toUpperCase() === 'EMPRESA'),
  };

  // Cargar empresas para mapear por nombre
  const empresas = await getEmpresasMap();
  const empresaByNombre = Object.fromEntries(empresas.map(e => [e.nombre.toUpperCase(), e.id]));

  // Cargar datos actuales de la BD para comparar (por empresa también)
  const existentes = await getProductosMap();
  const codigoEmpresaToId = Object.fromEntries(
    existentes.map(p => [`${p.codigo.toUpperCase()}_${p.empresa_id}`, p.id])
  );

  const tiposProducto = await getTiposProductoMap();
  const tipoByNombre  = Object.fromEntries(tiposProducto.map(t => [t.nombre.toUpperCase(), t.id]));

  const unidades      = await getUnidadesMap();
  const unidadByCodigo = Object.fromEntries(unidades.map(u => [u.codigo.toUpperCase(), u.id]));

  const nuevos      = [];
  const actualizados = [];
  const errores     = [];

  for (const [i, fila] of filas.entries()) {
    const codigo  = String(fila[idx.codigo]  ?? '').trim().toUpperCase();
    const nombre  = String(fila[idx.nombre]  ?? '').trim().toUpperCase();
    const unidRaw = String(fila[idx.unidad]  ?? '').trim().toUpperCase();
    const linea   = String(fila[idx.linea]   ?? '').trim().toUpperCase();
    const empNombre = String(fila[idx.empresa] ?? '').trim().toUpperCase();

    if (!codigo || !nombre) {
      errores.push({ fila: i + 2, msg: `Código o nombre vacío` });
      continue;
    }

    if (!empNombre) {
      errores.push({ fila: i + 2, msg: `Fila ${i+2}: columna EMPRESA vacía — no se puede asignar el producto` });
      continue;
    }

    const empresaId = empresaByNombre[empNombre] ?? null;
    if (!empresaId) {
      errores.push({ fila: i + 2, msg: `Empresa "${empNombre}" no encontrada en la app` });
      continue;
    }

    // Normalizar unidad: LTS → L, KGS → KG
    const unidadCodigo = unidRaw === 'LTS' ? 'L' : unidRaw === 'KGS' ? 'KG' : unidRaw;
    const unidadId     = unidadByCodigo[unidadCodigo] ?? null;
    const unidadNueva  = !unidadId && unidadCodigo;

    const tipoId    = tipoByNombre[linea] ?? null;
    const tipoNuevo = !tipoId && linea;

    const item = { codigo, nombre, linea, unidadCodigo, tipoId, tipoNuevo, unidadId, unidadNueva, empresaId, empresaNombre: empNombre };

    const key = `${codigo}_${empresaId}`;
    if (codigoEmpresaToId[key]) {
      actualizados.push({ ...item, id: codigoEmpresaToId[key] });
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
      const uid = await crearUnidadMedidaImportacion(p.unidadCodigo);
      unidadesCreadas[p.unidadCodigo] = uid;
    }
    if (!p.unidadId && unidadesCreadas[p.unidadCodigo]) {
      p.unidadId = unidadesCreadas[p.unidadCodigo];
    }
  }

  // Crear tipos de producto nuevos que vengan del Excel y no estén en la BD
  const tiposCreados = {};
  for (const p of [...nuevos, ...actualizados]) {
    if (p.tipoNuevo && p.linea && !tiposCreados[p.linea]) {
      const tid = await crearTipoProductoImportacion(p.linea);
      tiposCreados[p.linea] = tid;
    }
    if (!p.tipoId && tiposCreados[p.linea]) {
      p.tipoId = tiposCreados[p.linea];
    }
    if (!p.tipoId) {
      p.tipoId = await getTipoProductoFallback() ?? 1;
    }
  }

  for (const p of nuevos) {
    const id = uuid();
    await crearProductoImportacion(id, p.empresaId, p.codigo, p.nombre, p.tipoId);
    await asignarUnidadAProducto(id, p.unidadId);
    await insertarUnidadAlternativa(id, p.unidadId);
    insertados++;
  }

  for (const p of actualizados) {
    await actualizarProductoImportacion(p.id, p.nombre, p.tipoId);
    await resetearUnidadesDefault(p.id);
    await asignarUnidadAProducto(p.id, p.unidadId);
    await setUnidadDefault(p.id, p.unidadId);
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
    empresa:  headers.findIndex(h => h.toUpperCase() === 'EMPRESA'),
  };

  // Cargar catálogos de la BD
  const empresas   = await getEmpresasMap();
  const sectores   = await getSectoresMap();
  const cultivos   = await getCultivosMap();
  const variedades = await getVariedadesMap();
  const lotesExist = await getLotesMap();

  const empresaByNombre  = Object.fromEntries(empresas.map(e => [e.nombre.toUpperCase(), e.id]));

  // Sectores indexados por NOMBRE+EMPRESA_ID para no confundir sectores homónimos de distintas empresas
  const sectorByNombreEmpresa = Object.fromEntries(
    sectores.map(s => [`${s.nombre.toUpperCase()}_${s.empresa_id}`, s.id])
  );

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
    const empNombre = String(fila[idx.empresa]   ?? '').trim().toUpperCase();

    if (!nombre || !sectNombre) {
      errores.push({ fila: i + 2, msg: 'Nombre o sector vacío' });
      continue;
    }

    if (!empNombre) {
      errores.push({ fila: i + 2, msg: `Fila ${i+2}: columna EMPRESA vacía — no se puede asignar el sector` });
      continue;
    }

    const empresaId  = empresaByNombre[empNombre] ?? null;
    if (!empresaId) {
      errores.push({ fila: i + 2, msg: `Empresa "${empNombre}" no encontrada en la app` });
      continue;
    }

    // Buscar sector filtrando por empresa
    const sectorId   = sectorByNombreEmpresa[`${sectNombre}_${empresaId}`] ?? null;
    const cultivoId  = cultivoByNombre[cultNombre] ?? null;
    const variedadId = variedadByNombre[varNombre] ?? null;

    if (!sectorId)                sectoresNuevos.add(`${sectNombre}||${empresaId}||${empNombre}`);
    if (cultNombre && !cultivoId) cultivosNuevos.add(cultNombre);
    if (varNombre  && !variedadId) variedadesNuevas.add(varNombre);

    const key  = `${nombre}_${String(sectorId ?? '')}`;
    const item = { nombre, codigo, hectareas, cultivoId, variedadId, sectorId,
                   empresaId, empresaNombre: empNombre,
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
    sectoresNuevos:    [...sectoresNuevos].map(s => {
      const [nombre, empresaId, empresaNombre] = s.split('||');
      return { nombre, empresaId, empresaNombre };
    }),
    cultivosNuevos:    [...cultivosNuevos],
    variedadesNuevas:  [...variedadesNuevas],
  };
}

/* =========================================================
   IMPORTAR LOTES
========================================================= */
export async function importarLotes(nuevos, actualizados) {
  let insertados = 0;
  let modificados = 0;

  const sectoresCreados   = {};
  const cultivosCreados   = {};
  const variedadesCreadas = {};

  for (const l of [...nuevos, ...actualizados]) {
    // Sector — crear bajo la empresa correcta del Excel
    const sectorKey = `${l.sectorNombre}_${l.empresaId}`;
    if (!l.sectorId && l.sectorNombre && l.empresaId && !sectoresCreados[sectorKey]) {
      const sid = await crearSectorImportacion(l.empresaId, l.sectorNombre);
      sectoresCreados[sectorKey] = sid;
    }
    if (!l.sectorId && sectoresCreados[sectorKey]) {
      l.sectorId = sectoresCreados[sectorKey];
    }

    // Cultivo
    if (!l.cultivoId && l.cultivoNombre && !cultivosCreados[l.cultivoNombre]) {
      const cid = await crearCultivoImportacion(l.empresaId, l.cultivoNombre);
      cultivosCreados[l.cultivoNombre] = cid;
    }
    if (!l.cultivoId && cultivosCreados[l.cultivoNombre]) {
      l.cultivoId = cultivosCreados[l.cultivoNombre];
    }

    // Variedad
    if (!l.variedadId && l.variedadNombre && l.cultivoId && !variedadesCreadas[l.variedadNombre]) {
      const vid = await crearVariedadImportacion(l.empresaId, l.cultivoId, l.variedadNombre);
      variedadesCreadas[l.variedadNombre] = vid;
    }
    if (!l.variedadId && variedadesCreadas[l.variedadNombre]) {
      l.variedadId = variedadesCreadas[l.variedadNombre];
    }
  }

  for (const l of nuevos) {
    if (!l.sectorId) continue;
    await crearLoteImportacion(l.sectorId, l.codigo, l.nombre, l.hectareas, l.cultivoId, l.variedadId);
    insertados++;
  }

  for (const l of actualizados) {
    await actualizarLoteImportacion(l.id, l.nombre, l.hectareas, l.cultivoId, l.variedadId, l.sectorId);
    modificados++;
  }

  return { insertados, modificados };
}

