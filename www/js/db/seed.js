import { lotesSeed } from './seed-data-lotes.js';
import { productosSeed } from './seed-data-productos.js';
import { ESPECIES_INICIALES } from './seedEspecies.js';
import { executeQuery, executeRun, executeSet } from './sqlite.js';
import { uuid } from '../utils/uuid.js';


export async function seedEmpresas() {
  const empresas = await executeQuery('SELECT nombre FROM empresas');
  const nombres = empresas.map(e => e.nombre);

  if (!nombres.includes('CURICHI')) {
    await executeRun(`INSERT INTO empresas (nombre, rut) VALUES ('CURICHI', '12345678-9')`);
  }
  if (!nombres.includes('NUEVA ERA')) {
    await executeRun(`INSERT INTO empresas (nombre, rut) VALUES ('NUEVA ERA', '98765432-1')`);
  }
}

/* =========================================================
   CULTIVOS — por empresa
========================================================= */
export async function seedCultivos() {
  try {
    const cultivos = await executeQuery('SELECT COUNT(*) as count FROM cultivos');
    const count = cultivos[0]?.count || 0;

    if (count > 0) {
      return;
    }

    const empresas = await executeQuery('SELECT id FROM empresas');
    const cultivosDemo = [
      { nombre: 'SOYA', descripcion: 'Cultivo de soja' },
      { nombre: 'SORGO', descripcion: 'Cultivo de sorgo' },
      { nombre: 'PASTO', descripcion: 'Cultivo de pasto' },
      { nombre: 'MAIZ', descripcion: 'Cultivo de maiz' },
      { nombre: 'COVERTURA DE PASTO', descripcion: 'Covertura de pasto' }
    ];

    // Crear cultivos para cada empresa
    for (const empresa of empresas) {
      for (const cultivo of cultivosDemo) {
        await executeRun(
          'INSERT INTO cultivos (empresa_id, nombre, descripcion) VALUES (?, ?, ?)',
          [empresa.id, cultivo.nombre, cultivo.descripcion]
        );
      }
    }
  } catch (error) {
    console.error('[SEED] Error en seedCultivos:', error);
    throw error;
  }
}

/* =========================================================
   VARIEDADES — por empresa
========================================================= */
export async function seedVariedades() {
  const mapa = {
    'SOYA':               ['CARAVANA', 'CUATRIPLETA', 'GENERAL', 'MUNASQA REGISTRADA-1', 'MUNASQA REGISTRADA-2', 'NEGRITA', 'SOJAPAR', 'SW-4863', 'SYN-1687', 'TMG-7363'],
    'SORGO':              ['AGRI 002'],
    'PASTO':              ['DUPLETA B-R', 'SIN VARIEDAD', 'TRIPLETA B-D-R'],
    'MAIZ':               ['AGRI-104', 'AGRI-330', 'P-4039'],
    'COVERTURA DE PASTO': ['COVERTURA PASTO TRIPLETA']
  };

  // Usar INSERT OR IGNORE para no duplicar si ya existen, pero sí insertar las faltantes
  const empresas = await executeQuery('SELECT id FROM empresas');

  for (const empresa of empresas) {
    const cultivos = await executeQuery(
      'SELECT id, nombre FROM cultivos WHERE empresa_id = ?',
      [empresa.id]
    );

    for (const cultivo of cultivos) {
      const variedades = mapa[cultivo.nombre] || [];

      for (const nombre of variedades) {
        // Verificar si ya existe esta variedad exacta antes de insertar
        const existe = await executeQuery(
          'SELECT id FROM variedades WHERE empresa_id = ? AND cultivo_id = ? AND nombre = ?',
          [empresa.id, cultivo.id, nombre]
        );
        if (existe.length === 0) {
          await executeRun(
            `INSERT INTO variedades (empresa_id, cultivo_id, nombre) VALUES (?, ?, ?)`,
            [empresa.id, cultivo.id, nombre]
          );
        }
      }
    }
  }
}


/* =========================================================
   SECTORES — actualizado con todos los sectores reales
========================================================= */
export async function seedSectoresDemo() {
  const existentes = await executeQuery('SELECT id FROM sectores');
  if (existentes.length > 0) return;

  const empresas = await executeQuery('SELECT id FROM empresas');

  if (empresas.length === 0) {
    console.error('[SEED] ❌ No hay empresas para asociar sectores');
    return;
  }

  const sectores = [
    'ALVARO',
    'AURORA',
    'CAMBA',
    'COOPERATIVA',
    'CORREA',
    'CURICHI',
    'HORIZONTE',
    'MERCEDES',
    'PEREZA',
    'TOTAISITO',
  ];

  for (const empresa of empresas) {
    for (const nombre of sectores) {
      await executeRun(
        'INSERT INTO sectores (empresa_id, nombre) VALUES (?, ?)',
        [empresa.id, nombre]
      );
    }
  }
}


/* =========================================================
   LOTES — 337 lotes cargados desde Lotes_App_AGR.xlsx
========================================================= */
export async function seedLotesDemo() {
  const existentes = await executeQuery('SELECT id FROM lotes');
  if (existentes.length > 0) return;

  const sectores  = await executeQuery('SELECT id, nombre FROM sectores');
  const cultivos  = await executeQuery('SELECT id, nombre FROM cultivos');
  const variedades = await executeQuery('SELECT id, nombre, cultivo_id FROM variedades');

  if (sectores.length === 0 || cultivos.length === 0) {
    console.error('[SEED] ❌ Faltan sectores o cultivos');
    return;
  }

  // Mapas de búsqueda por nombre
  const sectorByNombre   = Object.fromEntries(sectores.map(s => [s.nombre, s.id]));
  const cultivoByNombre  = Object.fromEntries(cultivos.map(c => [c.nombre, c.id]));
  const variedadByNombre = Object.fromEntries(variedades.map(v => [v.nombre, v.id]));

  const lotes = lotesSeed;

  let insertados = 0;
  let errores = 0;

  for (const l of lotes) {
    const sectorId  = sectorByNombre[l.sector];
    const cultivoId = cultivoByNombre[l.cultivo];
    const variedadId = variedadByNombre[l.variedad] ?? null;

    if (!sectorId || !cultivoId) {
      console.warn(`[SEED] ⚠️ Lote "${l.nombre}" sin sector o cultivo válido (sector=${l.sector}, cultivo=${l.cultivo})`);
      errores++;
      continue;
    }

    await executeRun(
      `INSERT INTO lotes (sector_id, codigo, nombre, hectareas, cultivo_id, variedad_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sectorId, l.codigo, l.nombre, l.hectareas, cultivoId, variedadId]
    );
    insertados++;
  }

  console.log(`[SEED] ✅ Lotes insertados: ${insertados} | Errores: ${errores}`);
}


export async function seedTecnicos() {
  const [{ count }] = await executeQuery(
    'SELECT COUNT(*) as count FROM tecnicos'
  );

  if (count > 0) {
    return;
  }

  const empresas = await executeQuery('SELECT id FROM empresas');
  const tecnicosDemo = [
    'Juan Pérez',
    'María López',
    'Carlos Gómez'
  ];

  for (const empresa of empresas) {
    for (const nombre of tecnicosDemo) {
      await executeRun(
        'INSERT INTO tecnicos (empresa_id, nombre) VALUES (?, ?)',
        [empresa.id, nombre]
      );
    }
  }
}

/* =========================================================
   TIPOS DE APLICACIÓN — por empresa
========================================================= */
export async function seedTiposAplicacion() {
  const [{ count }] = await executeQuery(
    'SELECT COUNT(*) as count FROM tipos_aplicacion'
  );

  if (count > 0) {
    return;
  }

  const empresas = await executeQuery('SELECT id FROM empresas');
  const tiposDemo = [
    'AEREA',
    'TERRESTRE'
  ];

  for (const empresa of empresas) {
    for (const nombre of tiposDemo) {
      await executeRun(
        'INSERT INTO tipos_aplicacion (empresa_id, nombre) VALUES (?, ?)',
        [empresa.id, nombre]
      );
    }
  }
}

/* =========================================================
   CAUDALES — por empresa
========================================================= */
export async function seedCaudales() {
  const [{ count }] = await executeQuery(
    'SELECT COUNT(*) as count FROM caudales'
  );

  if (count > 0) {
    return;
  }

  const empresas = await executeQuery('SELECT id FROM empresas');
  const caudalesDemo = [
    { nombre: 'Bajo', valor: 80, unidad: 'L/ha' },
    { nombre: 'Medio', valor: 120, unidad: 'L/ha' },
    { nombre: 'Alto', valor: 180, unidad: 'L/ha' }
  ];

  for (const empresa of empresas) {
    for (const caudal of caudalesDemo) {
      await executeRun(
        'INSERT INTO caudales (empresa_id, nombre, valor, unidad) VALUES (?, ?, ?, ?)',
        [empresa.id, caudal.nombre, caudal.valor, caudal.unidad]
      );
    }
  }
}

/* =========================================================
    TIPOS DE PRODUCTO
    Ahora incluye todas las líneas del Excel como tipos.
========================================================= */
export async function seedTiposProducto() {
  const tipos = [
    { nombre: 'AGROQUIMICOS',                       cuenta: '711020' },
    { nombre: 'SEMILLA',                             cuenta: '711010' },
    { nombre: 'HERBICIDAS',                          cuenta: '711020' },
    { nombre: 'INSECTICIDAS',                        cuenta: '711020' },
    { nombre: 'FUNGICIDAS',                          cuenta: '711020' },
    { nombre: 'FERTILIZANTES',                       cuenta: '711020' },
    { nombre: 'ADHERENTES Y COADYUVANTES',           cuenta: '711020' },
    { nombre: 'PRODUCTO BIOLOGICO',                  cuenta: '711020' },
    { nombre: 'ACEITES MINERALES',                   cuenta: '711020' },
    { nombre: 'INOCULANTES',                         cuenta: '711020' },
    { nombre: 'BIOESTIMULANTES (REG. Y CRECIMIENTO)', cuenta: '711020' },
  ];

  for (const t of tipos) {
    await executeRun(
      `INSERT OR IGNORE INTO tipos_producto (nombre, cuenta_contable)
       VALUES (?, ?)`,
      [t.nombre, t.cuenta]
    );
  }
}

/* =========================================================
    UNIDADES DE MEDIDA
========================================================= */
export async function seedUnidadesMedida() {
  const unidades = await executeQuery(
    'SELECT COUNT(*) as count FROM unidades_medida'
  );

  if (unidades[0].count > 0) return;

  const data = [
    { codigo: 'L',  nombre: 'Litros',               factor: 1     },
    { codigo: 'KG', nombre: 'Kilogramos',            factor: 1     },
    { codigo: 'G',  nombre: 'Gramos',                factor: 0.001 },
    { codigo: 'CC', nombre: 'Centímetros cúbicos',   factor: 0.001 },
  ];

  for (const u of data) {
    await executeRun(
      `INSERT INTO unidades_medida (codigo, nombre, factor)
       VALUES (?, ?, ?)`,
      [u.codigo, u.nombre, u.factor]
    );
  }
}

/* =========================================================
    PRODUCTOS
    196 productos cargados desde AGROQUIMICOS.xlsx
========================================================= */
export async function seedProductos() {
  const count = await executeQuery(
    'SELECT COUNT(*) as count FROM productos'
  );

  if (count[0].count > 0) return;

  // Obtener tipos_producto para mapear por nombre
  const tiposProducto = await executeQuery(
    'SELECT id, nombre FROM tipos_producto'
  );
  const tipoByNombre = Object.fromEntries(
    tiposProducto.map(t => [t.nombre, t.id])
  );

  const productos = productosSeed;

  const empresas = await executeQuery('SELECT id FROM empresas');

  for (const empresa of empresas) {
    for (const p of productos) {
      // Buscar tipo por linea exacta, fallback a AGROQUIMICOS
      const tipoId = tipoByNombre[p.linea] ?? tipoByNombre['AGROQUIMICOS'] ?? 1;

      await executeRun(
        `INSERT OR IGNORE INTO productos (id, empresa_id, codigo, nombre, tipo_producto_id)
         VALUES (?, ?, ?, ?, ?)`,
        [uuid(), empresa.id, p.codigo, p.nombre, tipoId]
      );
    }
  }
}

/* =========================================================
    PRODUCTOS_UNIDADES
    CORREGIDO: ahora usa la unidad real del Excel por producto,
    en vez del prefijo del código que no coincidía con nada.
========================================================= */
export async function seedProductosUnidades() {
  const count = await executeQuery(
    'SELECT COUNT(*) as count FROM productos_unidades'
  );

  if (count[0].count > 0) return;

  const productos = await executeQuery(
    'SELECT id, codigo FROM productos'
  );

  const unidades = await executeQuery(
    'SELECT id, codigo FROM unidades_medida'
  );

  const unidadById = Object.fromEntries(
    unidades.map(u => [u.codigo, u.id])
  );

  if (!unidadById['L'] || !unidadById['KG']) {
    console.error('[SEED] ❌ Unidades L o KG no encontradas, abortando productos_unidades');
    return;
  }

  // Mapa codigo de producto -> unidad default del Excel
  const unidadDefaultPorCodigo = {
    '2,4D-H': 'L', 'ACETOCHLOR-H': 'L', 'ARROZAN': 'L', 'CLETODIN-H': 'L',
    'CLOMAZONE-H': 'L', 'CLORIMURON-H': 'KG', 'CONVEY-H': 'L', 'DICLOSULAM-H': 'KG',
    'FLUMIOXAZIN-H': 'L', 'FLUROXIPIR-H': 'L', 'GALANT-H': 'L', 'GLIFOSIX 75,7-H': 'KG',
    'GLIFOSIX-H': 'L', 'GLUFOSINATO 20%-H': 'L', 'HALOXYFOP-H': 'L', 'HEAT-H': 'KG',
    'IMAZAPYR 250-H': 'L', 'IMAZETAPHIR-H': 'L', 'LACTOFORTE-H': 'L', 'LIFELINE-H': 'L',
    'MAUSER-H': 'L', 'METRIBUZIN-H': 'L', 'PANTERA-H': 'L', 'PANZER GOLD-H': 'L',
    'PARAPIX (PARAQUAT)-H': 'L', 'PLATEU-H': 'KG', 'ROUNDUP CONTROL MAX -H': 'KG',
    'SULFENTRAZONE-H': 'L', 'TECNUP PREMIUN-H': 'L', 'TRIBUSA-H': 'L', 'ZINATRA DKN': 'KG',
    'ABAMECTIN-I': 'L', 'ABAMEX PLUS -I': 'L', 'ALLIAN-I': 'L', 'ANDROID-I': 'L',
    'BUPROFEZIN-I': 'L', 'CARTUGEN-I': 'L', 'CAXIN-I': 'L', 'CLORANTRANILIPROLE-I': 'KG',
    'CLORFENAPYR-I': 'KG', 'CLORPIRIFOS-I': 'L', 'CONNECT-I': 'L', 'DELETE-I': 'L',
    'DINOTEFURAN-I': 'KG', 'EXALT-I': 'L', 'FENDONA-I': 'L', 'FIPRONIL-I': 'KG',
    'FLYCONTROL-I': 'L', 'FORTIMYL-I': 'L', 'GOLDROLE XTRA-I': 'KG', 'INDOXACARB': 'KG',
    'INDOXACARB-I': 'L', 'JOKER-I': 'L', 'KEYROLE XTRA-I': 'KG', 'KILLIGAN-I': 'L',
    'LAMBDACION-I': 'L', 'LARVIN-I': 'KG', 'LUFENURON-I': 'L', 'MASTEROLE-I': 'L',
    'METHOMYL-I': 'KG', 'MIREX-I': 'KG', 'MITER XTRA-I': 'L', 'NOCTUR T-I': 'L',
    'OBERON-I': 'L', 'PRESEA-I': 'KG', 'QUINTAL XTRA-I': 'L', 'SPINOTERAN': 'L',
    'SPIRODICLOFEN+ABAMECTIN': 'L', 'SPIROMESIFEN-I': 'L', 'TEFLUMAX GL-I': 'L',
    'THIAMETOXAN-I': 'KG', 'TOPADOR PLUS -I': 'L', 'TRACER-I': 'L', 'TRANSFORM-I': 'KG',
    'TRIFLUMIC-I': 'L', 'VENOM-I': 'KG',
    'ACRONIS-F': 'L', 'AFRODITA-F': 'L', 'APRON MAXX-F': 'L', 'AZOXYSTEBOL C-14 F': 'L',
    'CIBRANIL-F': 'L', 'CLEANER XTRA-F': 'KG', 'CRIPTON-F': 'L', 'CROSS FIRE-F': 'L',
    'DIFENICONAZOL+CYPROCO-F': 'L', 'DIFENOCONAZOLE+PIRACLOSTR': 'L', 'DIFPROP-F': 'L',
    'FLUXAPIROXAD 167-F': 'L', 'FLUXAPIROXAD+PIRACLOSTROB': 'L', 'FUNGIBAC-F': 'L',
    'FUNGIMYL DUO-F': 'L', 'OPERA-F': 'L', 'PRIAXOR-F': 'L', 'PRIORI XTRA-F': 'L',
    'PROTHIOCONAZOLE+PICOXIS-F': 'L', 'REDSHIELD 750-F': 'KG', 'REMOVE RS': 'L',
    'SPROUT X-FUNG': 'L', 'THANOS-F': 'L', 'UNIZEB GOLD-F': 'KG', 'VERNO-F': 'KG',
    'VERSATILIS-F': 'L', 'VIOVAN-F': 'L',
    'ACTION OIL-INO': 'L', 'ENERGY TOP-INO': 'L',
  };

  for (const p of productos) {
    const unidadDefault = unidadDefaultPorCodigo[p.codigo] ?? 'L'; // fallback L
    const unidadDefaultId = unidadById[unidadDefault];

    // Insertar unidad default
    await executeRun(
      `INSERT OR IGNORE INTO productos_unidades (producto_id, unidad_medida_id, es_default)
       VALUES (?, ?, 1)`,
      [p.id, unidadDefaultId]
    );

    // Insertar unidad alternativa (la otra entre L y KG) como no-default
    const unidadAlt = unidadDefault === 'L' ? 'KG' : 'L';
    await executeRun(
      `INSERT OR IGNORE INTO productos_unidades (producto_id, unidad_medida_id, es_default)
       VALUES (?, ?, 0)`,
      [p.id, unidadById[unidadAlt]]
    );
  }
}
/* =========================================================
   PRODUCTOS DE PLANTACIÓN DE CAÑA
   Códigos con prefijo CANA- para identificarlos fácilmente.
   INSERT OR IGNORE → nunca duplica, y el código se puede
   actualizar desde la vista de Productos cuando llegue el
   código real del ERP.
========================================================= */
export async function seedProductosCana() {

  // Asegurarse de que los tipos y unidades existen primero
  const tiposProducto = await executeQuery('SELECT id, nombre FROM tipos_producto');
  const tipoByNombre  = Object.fromEntries(tiposProducto.map(t => [t.nombre, t.id]));

  const unidades    = await executeQuery('SELECT id, codigo FROM unidades_medida');
  const unidadById  = Object.fromEntries(unidades.map(u => [u.codigo, u.id]));

  const tipoAgro = tipoByNombre['AGROQUIMICOS'];
  const tipoBio  = tipoByNombre['PRODUCTO BIOLOGICO'];
  const tipoFert = tipoByNombre['FERTILIZANTES'];

  if (!tipoAgro || !tipoBio || !tipoFert) {
    console.warn('[SEED] ⚠️ seedProductosCana: tipos de producto no encontrados, ejecutar seedTiposProducto primero');
    return;
  }

  // ── Agroquímicos de Caña ─────────────────────────────────────────────────
  const agroquimicos = [
    { codigo: 'CANA-FOSFATO-MONO',  nombre: 'Fosfato Monoamónico',              tipo: tipoFert, unidad: 'KG' },
    { codigo: 'CANA-THIAMETOXAN',   nombre: 'Thiametoxan',                       tipo: tipoAgro, unidad: 'G'  },
    { codigo: 'CANA-FIPRONIL',      nombre: 'Fipronil',                          tipo: tipoAgro, unidad: 'G'  },
    { codigo: 'CANA-PYRACLOEPOX',   nombre: 'Pyraclostrobin + Epoxiconazole',    tipo: tipoAgro, unidad: 'L'  },
    { codigo: 'CANA-NERTHUS',       nombre: 'Nerthus 11-56-00',                  tipo: tipoFert, unidad: 'L'  },
    { codigo: 'CANA-KINEFOL',       nombre: 'Kinefol (Folcol)',                  tipo: tipoAgro, unidad: 'L'  },
    { codigo: 'CANA-AGUA',          nombre: 'Agua',                              tipo: tipoAgro, unidad: 'L'  },
  ];

  // ── Biológicos de Caña ───────────────────────────────────────────────────
  const biologicos = [
    { codigo: 'CANA-BIO-BACT-CEREAL', nombre: 'Bacterias Cereales del Este',   tipo: tipoBio, unidad: 'L' },
    { codigo: 'CANA-BIO-HONG-CEREAL', nombre: 'Hongos Cereales del Este',      tipo: tipoBio, unidad: 'L' },
    { codigo: 'CANA-BIO-BAUVERIA',    nombre: 'Bauveria',                      tipo: tipoBio, unidad: 'L' },
    { codigo: 'CANA-BIO-ISARIA',      nombre: 'Isaria spp',                    tipo: tipoBio, unidad: 'L' },
    { codigo: 'CANA-BIO-METARH',      nombre: 'Metarhizium',                   tipo: tipoBio, unidad: 'L' },
    { codigo: 'CANA-BIO-TRICHO',      nombre: 'Trichoderma',                   tipo: tipoBio, unidad: 'L' },
  ];

  const todos = [...agroquimicos, ...biologicos];

  const empresas = await executeQuery('SELECT id FROM empresas');

  for (const empresa of empresas) {
    for (const p of todos) {
      const id = p.codigo.toLowerCase(); // id legible, mismo que codigo por ahora

      await executeRun(
        `INSERT OR IGNORE INTO productos (id, empresa_id, codigo, nombre, tipo_producto_id, activo)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [id + '_' + empresa.id, empresa.id, p.codigo, p.nombre, p.tipo]
      );

      // Unidad default
      const unidadId = unidadById[p.unidad];
      if (unidadId) {
        await executeRun(
          `INSERT OR IGNORE INTO productos_unidades (producto_id, unidad_medida_id, es_default)
           VALUES (?, ?, 1)`,
          [id + '_' + empresa.id, unidadId]
        );
      }
    }
  }

  console.log('[SEED] ✅ seedProductosCana: productos de caña insertados/verificados');
}

/* =========================================================
   ESPECIES — módulo Control Rodeo
========================================================= */
export async function seedEspecies() {
  const count = await executeQuery('SELECT COUNT(*) as count FROM especies');
  if (count[0]?.count > 0) {
    return;
  }

  const inserts = ESPECIES_INICIALES.map((e, idx) => {
    const codigo = `ESP-${String(idx + 1).padStart(4, '0')}`;
    const nc = e.nombre_comun.replace(/'/g, "''");
    return `INSERT INTO especies (codigo, nombre_comun) VALUES ('${codigo}', '${nc}');`;
  }).join('\n');

  await executeSet(inserts);
  console.log(`[SEED] ✅ seedEspecies: ${ESPECIES_INICIALES.length} especies insertadas`);
}