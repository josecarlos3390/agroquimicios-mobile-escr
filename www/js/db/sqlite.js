let db = null;
let dbName = 'agro.db';

export async function getSQLite() {
  if (db) return db;


  // Verificar Capacitor
  if (!window.Capacitor || !window.Capacitor.Plugins) {
    throw new Error('Capacitor no disponible');
  }

  // En Capacitor 8 se llama CapacitorSQLite (no SQLite)
  const { CapacitorSQLite } = window.Capacitor.Plugins;

  if (!CapacitorSQLite) {
    throw new Error('Plugin CapacitorSQLite no disponible');
  }


  try {
    // 1. Crear conexión
    await CapacitorSQLite.createConnection({
      database: dbName,
      encrypted: false,
      mode: 'no-encryption',
      version: 1,
      readonly: false
    });


    // 2. Abrir base de datos
    await CapacitorSQLite.open({ 
      database: dbName,
      readonly: false 
    });


    // Guardar referencia
    db = CapacitorSQLite;

    return db;
  } catch (error) {
    console.error('[DB] Error al inicializar SQLite:', error);
    throw error;
  }
}

// Ejecutar consulta SELECT
export async function executeQuery(statement, values = []) {
  const sqlite = await getSQLite();
  
  const result = await sqlite.query({
    database: dbName,
    statement: statement,
    values: values
  });

  return result.values || [];
}

// Ejecutar INSERT, UPDATE, DELETE
export async function executeRun(statement, values = []) {
  const sqlite = await getSQLite();
  
  const result = await sqlite.run({
    database: dbName,
    statement: statement,
    values: values
  });

  return result.changes;
}

// Ejecutar múltiples statements (para schema/seed)
export async function executeSet(statements) {
  const sqlite = await getSQLite();
  
  await sqlite.execute({
    database: dbName,
    statements: statements
  });
}

// Cerrar conexión
export async function closeConnection() {
  if (db) {
    try {
      await db.close({ database: dbName });
      db = null;
    } catch (error) {
      console.error('[DB] Error al cerrar:', error);
    }
  }
}

// BORRAR BASE DE DATOS COMPLETA
export async function borrarBaseDeDatos() {
  const { CapacitorSQLite } = window.Capacitor.Plugins;


  try {
    // 1️⃣ Crear conexión (requerida por el plugin para borrar)
    await CapacitorSQLite.createConnection({
      database: dbName,
      encrypted: false,
      mode: 'no-encryption',
      version: 1,
      readonly: false
    });


    // 2️⃣ Borrar la base de datos
    await CapacitorSQLite.deleteDatabase({ database: dbName });


    // 3️⃣ Cerrar la conexión que abrimos para borrar
    await CapacitorSQLite.closeConnection({ 
      database: dbName,
      readonly: false 
    });


    db = null;

  } catch (err) {
    console.error('[DB] ❌ Error al borrar:', err);
    throw err;
  }
}