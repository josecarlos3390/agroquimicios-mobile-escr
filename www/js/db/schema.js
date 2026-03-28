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
      nombre TEXT NOT NULL,
      descripcion TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS variedades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cultivo_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      FOREIGN KEY (cultivo_id) REFERENCES cultivos(id),
      UNIQUE (cultivo_id, nombre)
      
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
      codigo INTEGER,                        -- 👈 código del ERP
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

    CREATE TABLE IF NOT EXISTS aplicaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lote_id INTEGER NOT NULL,
      producto TEXT NOT NULL,
      dosis REAL,
      unidad TEXT,
      fecha_aplicacion DATE NOT NULL,
      operador TEXT,
      observaciones TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lote_id) REFERENCES lotes(id) ON DELETE CASCADE
    );

    /* =========================
       TABLAS NUEVAS REQUERIDAS
       ========================= */

    CREATE TABLE IF NOT EXISTS tecnicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tipos_aplicacion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS caudales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      valor REAL,
      unidad TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    /* =========================
       TABLA HOJAS DE TRABAJO (CABECERA)
       ========================= */

    CREATE TABLE IF NOT EXISTS hojas_cab (
      id TEXT PRIMARY KEY,                      -- UUID
      numero_secuencial INTEGER NOT NULL,
      numero_completo TEXT NOT NULL,

      dispositivo_id TEXT NOT NULL,
      campana TEXT NOT NULL,

      -- RELACIONES
      empresa_id INTEGER,
      cultivo_id INTEGER,
      tecnico_id INTEGER,
      sector_id INTEGER,
      tipo_aplicacion_id INTEGER,
      caudal_id INTEGER,
      caudal_descripcion TEXT,

      -- DATOS DE LA APLICACIÓN
      mes TEXT NOT NULL,
      fecha_inicio DATE NOT NULL,
      fecha_fin DATE NOT NULL,

      cantidad_hectareas REAL NOT NULL,
      cantidad_hectareas_lotes REAL NOT NULL,

      observaciones TEXT,

      -- ESTADOS
      estado TEXT DEFAULT 'BORRADOR',
      exportado INTEGER DEFAULT 0,
      exportado_formato TEXT,
      exportado_fecha TIMESTAMP,

      -- SINCRONIZACIÓN
      sync_status TEXT DEFAULT 'pending',
      sync_error TEXT,
      sync_attempts INTEGER DEFAULT 0,

      -- AUDITORÍA
      created_by TEXT,
      updated_by TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      synced_at TIMESTAMP,

      -- FOREIGN KEYS
      FOREIGN KEY (cultivo_id) REFERENCES cultivos(id),
      FOREIGN KEY (tecnico_id) REFERENCES tecnicos(id),
      FOREIGN KEY (sector_id) REFERENCES sectores(id),
      FOREIGN KEY (tipo_aplicacion_id) REFERENCES tipos_aplicacion(id),
      FOREIGN KEY (caudal_id) REFERENCES caudales(id)
    );

    CREATE TABLE IF NOT EXISTS hojas_lotes (
      hoja_id              TEXT    NOT NULL,
      lote_id              INTEGER NOT NULL,
      hectareas_aplicadas  REAL,            -- NULL = usa el 100% del lote
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
      codigo TEXT NOT NULL UNIQUE,
      nombre TEXT NOT NULL,
      tipo_producto_id INTEGER NOT NULL,
      activo INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tipo_producto_id) REFERENCES tipos_producto(id)
    );

    CREATE TABLE IF NOT EXISTS unidades_medida (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL UNIQUE,       -- L, KG, CC
      nombre TEXT NOT NULL,              -- Litros, Kilogramos
      factor REAL DEFAULT 1,              -- para conversiones
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

    CREATE INDEX IF NOT EXISTS idx_hojas_cab_estado
      ON hojas_cab (estado);

    CREATE INDEX IF NOT EXISTS idx_hojas_cab_sync
      ON hojas_cab (sync_status);

    CREATE INDEX IF NOT EXISTS idx_hojas_cab_numero
      ON hojas_cab (numero_completo);

    CREATE INDEX IF NOT EXISTS idx_hojas_cab_fechas
      ON hojas_cab (fecha_inicio, fecha_fin);

    /* =========================
       TABLA HOJAS DE TRABAJO (DETALLE)
       ========================= */  

    CREATE TABLE IF NOT EXISTS hojas_detalle (
      id TEXT PRIMARY KEY,               -- UUID
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

  // Migración: backfill hojas_sectores desde sector_id legacy
  try {
    await executeRun(`
      INSERT OR IGNORE INTO hojas_sectores (hoja_id, sector_id)
      SELECT id, sector_id FROM hojas_cab
      WHERE sector_id IS NOT NULL
    `);
  } catch (_) { /* tabla ya migrada o sin datos */ }
}