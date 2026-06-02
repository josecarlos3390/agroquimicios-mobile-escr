import { executeSet } from './sqlite.js';

export async function initSchema() {
  const statements = `
    /* =========================
       TABLAS BASE EXISTENTES
       ========================= */

    CREATE TABLE IF NOT EXISTS empresas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      rut TEXT,
      direccion TEXT,
      telefono TEXT,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cultivos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS variedades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER NOT NULL,
      cultivo_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
      FOREIGN KEY (cultivo_id) REFERENCES cultivos(id)
    );

    CREATE TABLE IF NOT EXISTS sectores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      hectareas REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo INTEGER,
      sector_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      hectareas REAL,
      cultivo_id INTEGER,
      variedad_id INTEGER,
      fecha_siembra DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sector_id) REFERENCES sectores(id) ON DELETE CASCADE,
      FOREIGN KEY (cultivo_id) REFERENCES cultivos(id),
      FOREIGN KEY (variedad_id) REFERENCES variedades(id)
    );

    /* =========================
       TABLAS NUEVAS REQUERIDAS
       ========================= */

    CREATE TABLE IF NOT EXISTS tecnicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tipos_aplicacion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS caudales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      valor REAL,
      unidad TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
    );

    /* =========================
       TABLA HOJAS DE TRABAJO (CABECERA)
       ========================= */

    CREATE TABLE IF NOT EXISTS hojas_cab (
      id TEXT PRIMARY KEY,
      numero_secuencial INTEGER NOT NULL,
      numero_completo TEXT NOT NULL,

      dispositivo_id TEXT NOT NULL,
      campana TEXT NOT NULL,

      empresa_id INTEGER,
      cultivo_id INTEGER,
      tecnico_id INTEGER,
      sector_id INTEGER,
      tipo_aplicacion_id INTEGER,
      caudal_id INTEGER,
      caudal_descripcion TEXT,

      mes TEXT NOT NULL,
      fecha_inicio DATE NOT NULL,
      fecha_fin DATE NOT NULL,

      cantidad_hectareas REAL NOT NULL,
      cantidad_hectareas_lotes REAL NOT NULL,

      observaciones TEXT,

      estado TEXT DEFAULT 'BORRADOR',
      exportado INTEGER DEFAULT 0,
      exportado_formato TEXT,
      exportado_fecha TIMESTAMP,

      sync_status TEXT DEFAULT 'pending',
      sync_error TEXT,
      sync_attempts INTEGER DEFAULT 0,

      created_by TEXT,
      updated_by TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      synced_at TIMESTAMP,

      FOREIGN KEY (cultivo_id) REFERENCES cultivos(id),
      FOREIGN KEY (tecnico_id) REFERENCES tecnicos(id),
      FOREIGN KEY (sector_id) REFERENCES sectores(id),
      FOREIGN KEY (tipo_aplicacion_id) REFERENCES tipos_aplicacion(id),
      FOREIGN KEY (caudal_id) REFERENCES caudales(id)
    );

    CREATE TABLE IF NOT EXISTS hojas_lotes (
      hoja_id              TEXT    NOT NULL,
      lote_id              INTEGER NOT NULL,
      hectareas_aplicadas  REAL,
      PRIMARY KEY (hoja_id, lote_id),
      FOREIGN KEY (hoja_id)  REFERENCES hojas_cab(id),
      FOREIGN KEY (lote_id)  REFERENCES lotes(id)
    );

    /* =========================
       TABLA HOJAS ↔ SECTORES (multi-sector)
       ========================= */
    CREATE TABLE IF NOT EXISTS hojas_sectores (
      hoja_id   TEXT    NOT NULL,
      sector_id INTEGER NOT NULL,
      PRIMARY KEY (hoja_id, sector_id),
      FOREIGN KEY (hoja_id)   REFERENCES hojas_cab(id) ON DELETE CASCADE,
      FOREIGN KEY (sector_id) REFERENCES sectores(id)
    );

    CREATE INDEX IF NOT EXISTS idx_hojas_sectores_hoja
      ON hojas_sectores (hoja_id);


    CREATE TABLE IF NOT EXISTS tipos_producto (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      cuenta_contable TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS productos (
      id TEXT PRIMARY KEY,
      empresa_id INTEGER NOT NULL,
      codigo TEXT NOT NULL,
      nombre TEXT NOT NULL,
      tipo_producto_id INTEGER NOT NULL,
      activo INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
      FOREIGN KEY (tipo_producto_id) REFERENCES tipos_producto(id)
    );

    CREATE TABLE IF NOT EXISTS unidades_medida (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL UNIQUE,
      nombre TEXT NOT NULL,
      factor REAL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS productos_unidades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id TEXT NOT NULL,
      unidad_medida_id INTEGER NOT NULL,
      es_default INTEGER DEFAULT 0,

      FOREIGN KEY (producto_id) REFERENCES productos(id),
      FOREIGN KEY (unidad_medida_id) REFERENCES unidades_medida(id),

      UNIQUE (producto_id, unidad_medida_id)
    );

    /* =========================
       ÍNDICES HOJAS CABECERA
       ========================= */

    CREATE INDEX IF NOT EXISTS idx_hojas_cab_empresa
      ON hojas_cab (empresa_id);

    CREATE INDEX IF NOT EXISTS idx_hojas_cab_estado
      ON hojas_cab (estado);

    CREATE INDEX IF NOT EXISTS idx_hojas_cab_sync
      ON hojas_cab (sync_status);

    CREATE INDEX IF NOT EXISTS idx_hojas_cab_numero
      ON hojas_cab (numero_completo);

    CREATE INDEX IF NOT EXISTS idx_hojas_cab_fechas
      ON hojas_cab (fecha_inicio, fecha_fin);

    /* =========================
       MÓDULO PLANTACIÓN DE CAÑA
       ========================= */

    CREATE TABLE IF NOT EXISTS cana_cab (
      id                  TEXT PRIMARY KEY,
      numero_secuencial   INTEGER NOT NULL,
      numero_completo     TEXT    NOT NULL,
      dispositivo_id      TEXT    NOT NULL,
      campana             TEXT    NOT NULL,
      empresa_id          INTEGER,
      tecnico_id          INTEGER,
      fecha_inicio        DATE    NOT NULL,
      fecha_fin           DATE,
      mes                 TEXT    NOT NULL,
      observaciones       TEXT,
      estado              TEXT    DEFAULT 'BORRADOR',
      sync_status         TEXT    DEFAULT 'pending',
      created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id),
      FOREIGN KEY (tecnico_id) REFERENCES tecnicos(id)
    );

    CREATE TABLE IF NOT EXISTS cana_plantacion (
      id                        INTEGER PRIMARY KEY AUTOINCREMENT,
      cab_id                    TEXT    NOT NULL,
      lote_id                   INTEGER NOT NULL,
      variedad_id               INTEGER,
      ha_manual                 REAL    DEFAULT 0,
      ha_mecanizada             REAL    DEFAULT 0,
      ha_total                  REAL    DEFAULT 0,
      cantidad_sembradora_grupos INTEGER,
      personas_por_grupo        INTEGER,
      orden                     INTEGER DEFAULT 0,
      FOREIGN KEY (cab_id)      REFERENCES cana_cab(id) ON DELETE CASCADE,
      FOREIGN KEY (lote_id)     REFERENCES lotes(id),
      FOREIGN KEY (variedad_id) REFERENCES variedades(id)
    );

    CREATE TABLE IF NOT EXISTS cana_corte_semilla (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      plantacion_id           INTEGER NOT NULL,
      lote_semilla_id         INTEGER,
      variedad_id             INTEGER,
      sup_corte_ha            REAL,
      rendimiento_tn_ha       REAL,
      tn_cortadas_manual      REAL    DEFAULT 0,
      tn_cortadas_mecanizada  REAL    DEFAULT 0,
      consumo_semilla_tn_ha   REAL,
      orden                   INTEGER DEFAULT 0,
      FOREIGN KEY (plantacion_id)   REFERENCES cana_plantacion(id) ON DELETE CASCADE,
      FOREIGN KEY (lote_semilla_id) REFERENCES lotes(id),
      FOREIGN KEY (variedad_id)     REFERENCES variedades(id)
    );

    CREATE TABLE IF NOT EXISTS cana_insumos (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      cab_id          TEXT    NOT NULL,
      tipo            TEXT    NOT NULL DEFAULT 'AGROQUIMICO',
      producto_id     TEXT,
      producto_nombre TEXT    NOT NULL,
      cantidad        REAL,
      unidad          TEXT,
      orden           INTEGER DEFAULT 0,
      FOREIGN KEY (cab_id)      REFERENCES cana_cab(id) ON DELETE CASCADE,
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    );

    CREATE INDEX IF NOT EXISTS idx_cana_cab_estado
      ON cana_cab (estado);

    CREATE INDEX IF NOT EXISTS idx_cana_plantacion_cab
      ON cana_plantacion (cab_id);

    CREATE INDEX IF NOT EXISTS idx_cana_corte_plantacion
      ON cana_corte_semilla (plantacion_id);

    CREATE INDEX IF NOT EXISTS idx_cana_insumos_cab
      ON cana_insumos (cab_id);

    /* =========================
       MÓDULO USO DE COMBUSTIBLE
       ========================= */

    CREATE TABLE IF NOT EXISTS combustible_asignaciones (
      id                TEXT PRIMARY KEY,
      numero_secuencial INTEGER NOT NULL,
      numero_completo   TEXT    NOT NULL,
      empresa_id        INTEGER,
      fecha             DATE    NOT NULL,
      placa_codigo      TEXT    NOT NULL,
      persona_recibe    TEXT    NOT NULL,
      persona_entrega   TEXT    NOT NULL,
      cantidad          REAL    NOT NULL,
      tipo_combustible  TEXT    NOT NULL CHECK(tipo_combustible IN ('DIESEL','GASOLINA')),
      horometro         REAL,
      foto_base64       TEXT,
      observaciones     TEXT,
      estado            TEXT    DEFAULT 'BORRADOR',
      sync_status       TEXT    DEFAULT 'pending',
      created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id)
    );

    CREATE INDEX IF NOT EXISTS idx_combustible_fecha
      ON combustible_asignaciones (fecha);

    CREATE INDEX IF NOT EXISTS idx_combustible_empresa
      ON combustible_asignaciones (empresa_id);

    /* =========================
       MÓDULO CORTE DE SEMILLA
       ========================= */

    CREATE TABLE IF NOT EXISTS corte_semilla_cab (
      id                  TEXT PRIMARY KEY,
      numero_secuencial   INTEGER NOT NULL,
      numero_completo     TEXT    NOT NULL,
      dispositivo_id      TEXT    NOT NULL,
      campana             TEXT    NOT NULL,
      empresa_id          INTEGER,
      tecnico_id          INTEGER,
      fecha               DATE    NOT NULL,
      mes                 TEXT    NOT NULL,
      observaciones       TEXT,
      estado              TEXT    DEFAULT 'BORRADOR',
      sync_status         TEXT    DEFAULT 'pending',
      created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id),
      FOREIGN KEY (tecnico_id) REFERENCES tecnicos(id)
    );

    CREATE TABLE IF NOT EXISTS corte_semilla_detalle (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      cab_id                  TEXT    NOT NULL,
      lote_semilla_id         INTEGER,
      variedad_id             INTEGER,
      fecha_corte             DATE,
      sup_corte_ha            REAL,
      rendimiento_tn_ha       REAL,
      tn_cortadas_manual      REAL    DEFAULT 0,
      tn_cortadas_mecanizada  REAL    DEFAULT 0,
      consumo_semilla_tn_ha   REAL,
      lote_plantado_id        INTEGER,
      total_general_ha        REAL,
      sup_plantada_mec_ha     REAL,
      orden                   INTEGER DEFAULT 0,
      FOREIGN KEY (cab_id)            REFERENCES corte_semilla_cab(id) ON DELETE CASCADE,
      FOREIGN KEY (lote_semilla_id)   REFERENCES lotes(id),
      FOREIGN KEY (variedad_id)       REFERENCES variedades(id),
      FOREIGN KEY (lote_plantado_id)  REFERENCES lotes(id)
    );

    CREATE INDEX IF NOT EXISTS idx_corte_semilla_cab_estado
      ON corte_semilla_cab (estado);

    CREATE INDEX IF NOT EXISTS idx_corte_semilla_detalle_cab
      ON corte_semilla_detalle (cab_id);

    /* =========================
       TABLA DE SECUENCIAS (control atómico de números)
       ========================= */
    CREATE TABLE IF NOT EXISTS secuencias (
      tabla TEXT PRIMARY KEY,
      ultimo_numero INTEGER NOT NULL DEFAULT 0
    );

    /* =========================
       TABLA HOJAS DE TRABAJO (DETALLE)
       ========================= */  

    CREATE TABLE IF NOT EXISTS hojas_detalle (
      id TEXT PRIMARY KEY,
      hoja_id TEXT NOT NULL,
      linea INTEGER NOT NULL,

      producto_id TEXT NOT NULL,
      producto_codigo TEXT NOT NULL,
      producto_nombre TEXT NOT NULL,

      cantidad REAL NOT NULL,
      unidad_medida_id INTEGER NOT NULL,
      dosis REAL NOT NULL,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (hoja_id) REFERENCES hojas_cab(id) ON DELETE CASCADE,
      FOREIGN KEY (producto_id) REFERENCES productos(id),
      FOREIGN KEY (unidad_medida_id) REFERENCES unidades_medida(id),

      UNIQUE (hoja_id, linea)
    );

    /* =========================
       MÓDULO GUÍA DE TRANSPORTE DE CAÑA
       ========================= */

    CREATE TABLE IF NOT EXISTS guia_transporte_cab (
      id                  TEXT PRIMARY KEY,
      numero_secuencial   INTEGER NOT NULL,
      numero_completo     TEXT    NOT NULL,
      dispositivo_id      TEXT    NOT NULL,
      empresa_id          INTEGER,
      fecha               DATE    NOT NULL,
      hora_llegada        TEXT,
      hora_salida         TEXT,
      hora_llegada_cola   TEXT,
      boletario           TEXT,
      turno               TEXT,
      frente              TEXT,
      propiedad           TEXT,
      observaciones       TEXT,
      cod_liberacion      TEXT,
      cod_chofer          TEXT,
      nombre_chofer       TEXT,
      cod_camion          TEXT,
      placa               TEXT,
      cod_chata           TEXT,
      transportista       TEXT,
      foto_camion_base64  TEXT,
      cod_cargadora       TEXT,
      cod_operadora       TEXT,
      cod_tractor_chata   TEXT,
      cod_tractorista     TEXT,
      foto_semi_base64    TEXT,
      lote                TEXT,
      variedad            TEXT,
      cultivo             TEXT,
      hectareas           REAL,
      estado              TEXT    DEFAULT 'BORRADOR',
      sync_status         TEXT    DEFAULT 'pending',
      created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id)
    );

    CREATE TABLE IF NOT EXISTS guia_transporte_cosecha_mec (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      guia_id                 TEXT    NOT NULL,
      numero_cosechadora      INTEGER NOT NULL DEFAULT 1,
      grilla_seleccion        TEXT,
      cod_cosechadora         TEXT,
      cod_operador            TEXT,
      cod_tractor_transbordo  TEXT,
      cod_tractorista         TEXT,
      FOREIGN KEY (guia_id) REFERENCES guia_transporte_cab(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_guia_transporte_estado
      ON guia_transporte_cab (estado);
    CREATE INDEX IF NOT EXISTS idx_guia_transporte_empresa
      ON guia_transporte_cab (empresa_id);
    CREATE INDEX IF NOT EXISTS idx_guia_cosecha_mec_guia
      ON guia_transporte_cosecha_mec (guia_id);

    /* =========================
       MÓDULO CONTROL RODEO
       ========================= */

    CREATE TABLE IF NOT EXISTS especies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER NOT NULL,
      codigo TEXT NOT NULL,
      nombre_comun TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
      UNIQUE (empresa_id, codigo)
    );

    CREATE INDEX IF NOT EXISTS idx_especies_empresa
      ON especies (empresa_id);

    CREATE INDEX IF NOT EXISTS idx_especies_codigo
      ON especies (codigo);

    CREATE INDEX IF NOT EXISTS idx_especies_nombre
      ON especies (nombre_comun);

    /* =========================
       MÓDULO CONTROL RODEO — CFO
       ========================= */

    CREATE TABLE IF NOT EXISTS cefo_cab (
      id                  TEXT PRIMARY KEY,
      empresa_id          INTEGER NOT NULL,
      numero_secuencial   INTEGER NOT NULL,
      numero_completo     TEXT    NOT NULL,
      nro_cfo_recib       TEXT NOT NULL,
      fecha_recep         DATE,
      placa               TEXT,
      chofer              TEXT,
      observaciones       TEXT,
      created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cefo_detalle (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      cefo_id             TEXT    NOT NULL,
      especie             TEXT    NOT NULL,
      faja                INTEGER,
      nro_arbol           TEXT,
      seccion             TEXT,
      diamayor            REAL,
      diamenor            REAL,
      largo               REAL,
      volumen             REAL,
      despachado          INTEGER DEFAULT 0,
      FOREIGN KEY (cefo_id) REFERENCES cefo_cab(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_cefo_cab_empresa
      ON cefo_cab (empresa_id);

    CREATE INDEX IF NOT EXISTS idx_cefo_cab_nro
      ON cefo_cab (nro_cfo_recib);

    CREATE INDEX IF NOT EXISTS idx_cefo_detalle_cefo
      ON cefo_detalle (cefo_id);

    CREATE INDEX IF NOT EXISTS idx_cefo_detalle_despachado
      ON cefo_detalle (despachado);

    /* =========================
       CONTROL RODEO — SALIDAS / DESPACHOS
       ========================= */

    CREATE TABLE IF NOT EXISTS cefo_salida_cab (
      id                  TEXT PRIMARY KEY,
      empresa_id          INTEGER NOT NULL,
      numero_secuencial   INTEGER NOT NULL,
      numero_completo     TEXT    NOT NULL,
      nro_cfo_despacho    TEXT NOT NULL,
      fecha_despacho      DATE,
      placa               TEXT,
      chofer              TEXT,
      observaciones       TEXT,
      created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cefo_salida_detalle (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      salida_id           TEXT    NOT NULL,
      cefo_detalle_id     INTEGER NOT NULL,
      especie             TEXT    NOT NULL,
      faja                INTEGER,
      nro_arbol           TEXT,
      seccion             TEXT,
      diamayor            REAL,
      diamenor            REAL,
      largo               REAL,
      volumen             REAL,
      FOREIGN KEY (salida_id) REFERENCES cefo_salida_cab(id) ON DELETE CASCADE,
      FOREIGN KEY (cefo_detalle_id) REFERENCES cefo_detalle(id)
    );

    CREATE INDEX IF NOT EXISTS idx_cefo_salida_cab_empresa
      ON cefo_salida_cab (empresa_id);

    CREATE INDEX IF NOT EXISTS idx_cefo_salida_detalle_salida
      ON cefo_salida_detalle (salida_id);

    /* =========================
       MÓDULO RODEO
       ========================= */

    CREATE TABLE IF NOT EXISTS rodeo_sectores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
      UNIQUE (empresa_id, nombre)
    );

    CREATE TABLE IF NOT EXISTS rodeo_cab (
      id                  TEXT PRIMARY KEY,
      empresa_id          INTEGER NOT NULL,
      numero_secuencial   INTEGER NOT NULL,
      numero_completo     TEXT    NOT NULL,
      fecha               DATE    NOT NULL,
      sector_id           INTEGER,
      estado              TEXT    DEFAULT 'BORRADOR',
      sync_status         TEXT    DEFAULT 'pending',
      created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
      FOREIGN KEY (sector_id) REFERENCES rodeo_sectores(id)
    );

    CREATE TABLE IF NOT EXISTS rodeo_detalle (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      rodeo_cab_id        TEXT    NOT NULL,
      nro_rodeo           TEXT,
      x_coord             REAL,
      y_coord             REAL,
      especie             TEXT,
      faja                TEXT,
      nro_arbol           TEXT,
      seccion             TEXT,
      d1                  REAL,
      d2                  REAL,
      largo               REAL,
      volumen             REAL,
      para_transporte     TEXT,
      FOREIGN KEY (rodeo_cab_id) REFERENCES rodeo_cab(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_rodeo_sectores_empresa
      ON rodeo_sectores (empresa_id);

    CREATE INDEX IF NOT EXISTS idx_rodeo_cab_empresa
      ON rodeo_cab (empresa_id);

    CREATE INDEX IF NOT EXISTS idx_rodeo_cab_estado
      ON rodeo_cab (estado);

    CREATE INDEX IF NOT EXISTS idx_rodeo_detalle_cab
      ON rodeo_detalle (rodeo_cab_id);
  `;

  await executeSet(statements);

  // Migraciones para bases de datos existentes
  const { executeRun, executeQuery, executeSet: execSet } = await import('./sqlite.js');

  // Helper: ALTER TABLE solo si la columna no existe
  async function addColumnIfNotExists(table, column, definition) {
    try {
      const cols = await executeQuery(`PRAGMA table_info(${table})`);
      const exists = cols.some(c => c.name === column);
      if (!exists) {
        await execSet(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
      }
    } catch (_) { /* ignorar */ }
  }

  await addColumnIfNotExists('hojas_cab', 'caudal_descripcion', 'TEXT');
  await addColumnIfNotExists('hojas_lotes', 'hectareas_aplicadas', 'REAL');

  // Migraciones módulo Caña — agregar columnas nuevas si la tabla ya existía
  await addColumnIfNotExists('cana_cab', 'fecha', 'DATE');
  await addColumnIfNotExists('cana_plantacion', 'cantidad_sembradora_grupos', 'INTEGER');
  await addColumnIfNotExists('cana_plantacion', 'personas_por_grupo', 'INTEGER');
  await addColumnIfNotExists('cana_plantacion', 'orden', 'INTEGER DEFAULT 0');
  await addColumnIfNotExists('cana_plantacion', 'fecha_inicio', 'DATE');
  await addColumnIfNotExists('cana_plantacion', 'fecha_fin', 'DATE');
  await addColumnIfNotExists('cana_corte_semilla', 'tn_cortadas_mecanizada', 'REAL DEFAULT 0');
  await addColumnIfNotExists('cana_corte_semilla', 'orden', 'INTEGER DEFAULT 0');
  await addColumnIfNotExists('cana_corte_semilla', 'fecha', 'DATE');
  await addColumnIfNotExists('cana_insumos', 'tipo', "TEXT NOT NULL DEFAULT 'AGROQUIMICO'");
  await addColumnIfNotExists('cana_insumos', 'orden', 'INTEGER DEFAULT 0');

  // Migración: backfill hojas_sectores desde sector_id legacy
  try {
    await executeRun(`
      INSERT OR IGNORE INTO hojas_sectores (hoja_id, sector_id)
      SELECT id, sector_id FROM hojas_cab
      WHERE sector_id IS NOT NULL
    `);
  } catch (_) { /* tabla ya migrada o sin datos */ }

  // Migraciones multi-tenancy: agregar empresa_id a tablas de catálogo
  await addColumnIfNotExists('cultivos', 'empresa_id', 'INTEGER NOT NULL DEFAULT 1');
  await addColumnIfNotExists('variedades', 'empresa_id', 'INTEGER NOT NULL DEFAULT 1');
  await addColumnIfNotExists('productos', 'empresa_id', 'INTEGER NOT NULL DEFAULT 1');
  await addColumnIfNotExists('tecnicos', 'empresa_id', 'INTEGER NOT NULL DEFAULT 1');
  await addColumnIfNotExists('tipos_aplicacion', 'empresa_id', 'INTEGER NOT NULL DEFAULT 1');
  await addColumnIfNotExists('caudales', 'empresa_id', 'INTEGER NOT NULL DEFAULT 1');

  // Migraciones módulo Combustible — agregar columnas nuevas si la tabla ya existía
  await addColumnIfNotExists('combustible_asignaciones', 'numero_secuencial', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfNotExists('combustible_asignaciones', 'numero_completo', "TEXT NOT NULL DEFAULT 'COMB-000'");
  await addColumnIfNotExists('combustible_asignaciones', 'horometro', 'REAL');

  // Migraciones módulo Corte de Semilla
  await addColumnIfNotExists('corte_semilla_detalle', 'lote_plantado_id', 'INTEGER');
  await addColumnIfNotExists('corte_semilla_detalle', 'total_general_ha', 'REAL');
  await addColumnIfNotExists('corte_semilla_detalle', 'sup_plantada_mec_ha', 'REAL');

  // Migraciones módulo Control Rodeo
  await addColumnIfNotExists('cefo_cab', 'numero_secuencial', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfNotExists('cefo_cab', 'numero_completo', "TEXT NOT NULL DEFAULT 'CEFO-000'");
  await addColumnIfNotExists('cefo_cab', 'observaciones', 'TEXT');
  await addColumnIfNotExists('cefo_detalle', 'despachado', 'INTEGER DEFAULT 0');
  await addColumnIfNotExists('cefo_salida_cab', 'numero_secuencial', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfNotExists('cefo_salida_cab', 'numero_completo', "TEXT NOT NULL DEFAULT 'DESP-000'");
  await addColumnIfNotExists('cefo_salida_cab', 'observaciones', 'TEXT');

  // Migraciones módulo Guía de Transporte de Caña
  await addColumnIfNotExists('guia_transporte_cab', 'lote', 'TEXT');
  await addColumnIfNotExists('guia_transporte_cab', 'variedad', 'TEXT');
  await addColumnIfNotExists('guia_transporte_cab', 'cultivo', 'TEXT');
  await addColumnIfNotExists('guia_transporte_cab', 'hectareas', 'REAL');

  // Backfill: asignar secuenciales únicos a registros existentes
  try {
    const existentes = await executeQuery('SELECT id FROM combustible_asignaciones ORDER BY created_at');
    if (existentes.length > 0) {
      for (let idx = 0; idx < existentes.length; idx++) {
        const sec = idx + 1;
        const corr = String(sec).padStart(3, '0');
        const nro = `COMB-LEGCY-${corr}`;
        await executeRun(
          'UPDATE combustible_asignaciones SET numero_secuencial = ?, numero_completo = ? WHERE id = ?',
          [sec, nro, existentes[idx].id]
        );
      }
    }
  } catch (_) { /* ignorar */ }

  // Crear Foreign Keys para las nuevas columnas empresa_id (si no existen)
  // SQLite no soporta ALTER FOREIGN KEY, pero los datos ya están asignados a empresa_id=1

  // Backfill tabla de secuencias con los valores actuales de cada tabla
  await executeRun(`
    INSERT OR IGNORE INTO secuencias (tabla, ultimo_numero)
    SELECT 'hojas_cab', COALESCE(MAX(numero_secuencial), 0) FROM hojas_cab
  `);
  await executeRun(`
    INSERT OR IGNORE INTO secuencias (tabla, ultimo_numero)
    SELECT 'cana_cab', COALESCE(MAX(numero_secuencial), 0) FROM cana_cab
  `);
  await executeRun(`
    INSERT OR IGNORE INTO secuencias (tabla, ultimo_numero)
    SELECT 'combustible_asignaciones', COALESCE(MAX(numero_secuencial), 0) FROM combustible_asignaciones
  `);
  await executeRun(`
    INSERT OR IGNORE INTO secuencias (tabla, ultimo_numero)
    SELECT 'corte_semilla_cab', COALESCE(MAX(numero_secuencial), 0) FROM corte_semilla_cab
  `);
  await executeRun(`
    INSERT OR IGNORE INTO secuencias (tabla, ultimo_numero)
    SELECT 'guia_transporte_cab', COALESCE(MAX(numero_secuencial), 0) FROM guia_transporte_cab
  `);
  await executeRun(`
    INSERT OR IGNORE INTO secuencias (tabla, ultimo_numero)
    SELECT 'cefo_cab', COALESCE(MAX(numero_secuencial), 0) FROM cefo_cab
  `);
  await executeRun(`
    INSERT OR IGNORE INTO secuencias (tabla, ultimo_numero)
    SELECT 'cefo_salida_cab', COALESCE(MAX(numero_secuencial), 0) FROM cefo_salida_cab
  `);
  await executeRun(`
    INSERT OR IGNORE INTO secuencias (tabla, ultimo_numero)
    SELECT 'rodeo_cab', COALESCE(MAX(numero_secuencial), 0) FROM rodeo_cab
  `);
}