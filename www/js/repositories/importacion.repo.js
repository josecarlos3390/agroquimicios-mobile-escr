import { executeQuery, executeRun } from '../db/sqlite.js';

/* =========================================================
   CATÁLOGOS PARA PREVISUALIZACIÓN
========================================================= */

export async function getEmpresasMap() {
  return await executeQuery('SELECT id, nombre FROM empresas');
}

export async function getProductosMap() {
  return await executeQuery('SELECT id, codigo, nombre, empresa_id FROM productos');
}

export async function getTiposProductoMap() {
  return await executeQuery('SELECT id, nombre FROM tipos_producto');
}

export async function getUnidadesMap() {
  return await executeQuery('SELECT id, codigo FROM unidades_medida');
}

export async function getSectoresMap() {
  return await executeQuery('SELECT id, nombre, empresa_id FROM sectores');
}

export async function getCultivosMap() {
  return await executeQuery('SELECT id, nombre FROM cultivos');
}

export async function getVariedadesMap() {
  return await executeQuery('SELECT id, nombre FROM variedades');
}

export async function getLotesMap() {
  return await executeQuery('SELECT id, codigo, nombre, sector_id FROM lotes');
}

/* =========================================================
   PRODUCTOS
========================================================= */

export async function getUnidadPorCodigo(codigo) {
  const [row] = await executeQuery(
    'SELECT id FROM unidades_medida WHERE codigo = ? LIMIT 1', [codigo]
  );
  return row?.id ?? null;
}

export async function crearUnidadMedidaImportacion(codigo) {
  await executeRun(
    `INSERT OR IGNORE INTO unidades_medida (codigo, nombre, factor) VALUES (?, ?, 1)`,
    [codigo, codigo]
  );
  return await getUnidadPorCodigo(codigo);
}

export async function crearTipoProductoImportacion(nombre) {
  await executeRun(
    `INSERT OR IGNORE INTO tipos_producto (nombre, cuenta_contable) VALUES (?, '711020')`,
    [nombre]
  );
  const [row] = await executeQuery(
    'SELECT id FROM tipos_producto WHERE nombre = ? LIMIT 1', [nombre]
  );
  return row?.id ?? null;
}

export async function getTipoProductoFallback() {
  const [row] = await executeQuery(
    `SELECT id FROM tipos_producto WHERE nombre = 'AGROQUIMICOS' LIMIT 1`
  );
  return row?.id ?? null;
}

export async function crearProductoImportacion(id, empresaId, codigo, nombre, tipoId) {
  await executeRun(
    `INSERT OR IGNORE INTO productos (id, empresa_id, codigo, nombre, tipo_producto_id, activo)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [id, empresaId, codigo, nombre, tipoId]
  );
}

export async function actualizarProductoImportacion(id, nombre, tipoId) {
  await executeRun(
    `UPDATE productos SET nombre = ?, tipo_producto_id = ? WHERE id = ?`,
    [nombre, tipoId, id]
  );
}

export async function asignarUnidadAProducto(productoId, unidadId) {
  await executeRun(
    `INSERT OR IGNORE INTO productos_unidades (producto_id, unidad_medida_id, es_default)
     VALUES (?, ?, 1)`,
    [productoId, unidadId]
  );
}

export async function resetearUnidadesDefault(productoId) {
  await executeRun(
    `UPDATE productos_unidades SET es_default = 0 WHERE producto_id = ?`,
    [productoId]
  );
}

export async function setUnidadDefault(productoId, unidadId) {
  await executeRun(
    `UPDATE productos_unidades SET es_default = 1
     WHERE producto_id = ? AND unidad_medida_id = ?`,
    [productoId, unidadId]
  );
}

export async function getUnidadesMedidaList() {
  return await executeQuery('SELECT id, codigo FROM unidades_medida');
}

export async function insertarUnidadAlternativa(productoId, unidadDefaultId) {
  const unidades = await getUnidadesMedidaList();
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

/* =========================================================
   LOTES
========================================================= */

export async function getSectorPorNombreYEmpresa(nombre, empresaId) {
  const [row] = await executeQuery(
    'SELECT id FROM sectores WHERE nombre = ? AND empresa_id = ? LIMIT 1',
    [nombre, empresaId]
  );
  return row?.id ?? null;
}

export async function crearSectorImportacion(empresaId, nombre) {
  await executeRun(
    'INSERT OR IGNORE INTO sectores (empresa_id, nombre) VALUES (?, ?)',
    [empresaId, nombre]
  );
  return await getSectorPorNombreYEmpresa(nombre, empresaId);
}

export async function getCultivoPorNombreYEmpresa(nombre, empresaId) {
  const [row] = await executeQuery(
    'SELECT id FROM cultivos WHERE empresa_id = ? AND nombre = ? LIMIT 1', [empresaId, nombre]
  );
  return row?.id ?? null;
}

export async function crearCultivoImportacion(empresaId, nombre) {
  await executeRun(
    'INSERT OR IGNORE INTO cultivos (empresa_id, nombre) VALUES (?, ?)',
    [empresaId, nombre]
  );
  return await getCultivoPorNombreYEmpresa(nombre, empresaId);
}

export async function getVariedadPorNombreYCultivo(nombre, cultivoId) {
  const [row] = await executeQuery(
    'SELECT id FROM variedades WHERE nombre = ? AND cultivo_id = ? LIMIT 1',
    [nombre, cultivoId]
  );
  return row?.id ?? null;
}

export async function crearVariedadImportacion(empresaId, cultivoId, nombre) {
  await executeRun(
    'INSERT OR IGNORE INTO variedades (empresa_id, cultivo_id, nombre) VALUES (?, ?, ?)',
    [empresaId, cultivoId, nombre]
  );
  return await getVariedadPorNombreYCultivo(nombre, cultivoId);
}

export async function crearLoteImportacion(sectorId, codigo, nombre, hectareas, cultivoId, variedadId) {
  await executeRun(
    `INSERT INTO lotes (sector_id, codigo, nombre, hectareas, cultivo_id, variedad_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [sectorId, codigo, nombre, hectareas, cultivoId, variedadId]
  );
}

export async function actualizarLoteImportacion(id, nombre, hectareas, cultivoId, variedadId, sectorId) {
  await executeRun(
    `UPDATE lotes SET nombre = ?, hectareas = ?, cultivo_id = ?, variedad_id = ?, sector_id = ?
     WHERE id = ?`,
    [nombre, hectareas, cultivoId, variedadId, sectorId, id]
  );
}

/* =========================================================
   ESPECIES
========================================================= */

export async function getEspeciesMap(empresaId) {
  return await executeQuery(
    'SELECT id, nombre_comun FROM especies WHERE empresa_id = ?',
    [empresaId]
  );
}

export async function crearEspecieImportacion(empresaId, codigo, nombreComun, nombreCientifico) {
  const result = await executeRun(
    'INSERT INTO especies (empresa_id, codigo, nombre_comun, nombre_cientifico) VALUES (?, ?, ?, ?)',
    [empresaId, codigo, nombreComun, nombreCientifico]
  );
  return result.lastId;
}

export async function actualizarEspecieImportacion(id, nombreComun, nombreCientifico) {
  await executeRun(
    'UPDATE especies SET nombre_comun = ?, nombre_cientifico = ? WHERE id = ?',
    [nombreComun, nombreCientifico, id]
  );
}
