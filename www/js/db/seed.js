import { executeQuery, executeRun } from './sqlite.js';
import { uuid } from '../utils/uuid.js';


export async function seedEmpresas() {
  const empresas = await executeQuery('SELECT id FROM empresas');
  if (empresas.length > 0) return;

  await executeRun(`
    INSERT INTO empresas (nombre, rut)
    VALUES ('CURICHI', '12345678-9')
  `);

  await executeRun(`
    INSERT INTO empresas (nombre, rut)
    VALUES ('GIR', '12345678-9')
  `);
}

/* =========================================================
   CULTIVOS (NO SE TOCA)
========================================================= */
export async function seedCultivos() {
  try {
    const cultivos = await executeQuery('SELECT COUNT(*) as count FROM cultivos');
    const count = cultivos[0]?.count || 0;

    if (count > 0) {
      return;
    }

    const cultivosDemo = [
      { nombre: 'SOYA', descripcion: 'Cultivo de soja' }, //1
      { nombre: 'SORGO', descripcion: 'Cultivo de sorgo' }, //2
      { nombre: 'PASTO', descripcion: 'Cultivo de pasto' }, //3
      { nombre: 'MAIZ', descripcion: 'Cultivo de maiz' }, //4
      { nombre: 'COVERTURA DE PASTO', descripcion: 'Covertura de pasto' } //5
    ];

    for (const cultivo of cultivosDemo) {
      await executeRun(
        'INSERT INTO cultivos (nombre, descripcion) VALUES (?, ?)',
        [cultivo.nombre, cultivo.descripcion]
      );
    }
  } catch (error) {
    console.error('[SEED] Error en seedCultivos:', error);
    throw error;
  }
}

/* =========================================================
   VARIEDADES (NUEVO)
========================================================= */
export async function seedVariedades() {
  const existentes = await executeQuery(
    'SELECT COUNT(*) as count FROM variedades'
  );

  if (existentes[0].count > 0) return;

  const cultivos = await executeQuery(
    'SELECT id, nombre FROM cultivos'
  );

  const mapa = {
    'SOYA':               ['CARAVANA', 'CUATRIPLETA', 'GENERAL', 'MUNASQA REGISTRADA-1', 'MUNASQA REGISTRADA-2', 'NEGRITA', 'SW-4863', 'TMG-7363'],
    'SORGO':              ['AGRI 002'],
    'PASTO':              ['DUPLETA B-R', 'SIN VARIEDAD', 'TRIPLETA B-D-R'],
    'MAIZ':               ['AGRI-104', 'AGRI-330', 'P-4039'],
    'COVERTURA DE PASTO': ['COVERTURA PASTO TRIPLETA']
  };

  for (const cultivo of cultivos) {
    const variedades = mapa[cultivo.nombre] || [];

    for (const nombre of variedades) {
      await executeRun(
        `INSERT INTO variedades (cultivo_id, nombre)
         VALUES (?, ?)`,
        [cultivo.id, nombre]
      );
    }
  }
}


/* =========================================================
   SECTORES — actualizado con todos los sectores reales
========================================================= */
export async function seedSectoresDemo() {
  const existentes = await executeQuery('SELECT id FROM sectores');
  if (existentes.length > 0) return;

  const [empresa] = await executeQuery('SELECT id FROM empresas LIMIT 1');

  if (!empresa) {
    console.error('[SEED] ❌ No hay empresas para asociar sectores');
    return;
  }

  const empresaId = empresa.id;

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

  for (const nombre of sectores) {
    await executeRun(
      'INSERT INTO sectores (empresa_id, nombre) VALUES (?, ?)',
      [empresaId, nombre]
    );
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

  const lotes = [
    { nombre: '1A CURICHI', codigo: '0001', hectareas: 34, variedad: 'SW-4863', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '2A CURICHI', codigo: '0002', hectareas: 31.2, variedad: 'SW-4863', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '3A CURICHI', codigo: '0003', hectareas: 18.9, variedad: 'SW-4863', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '4A CURICHI', codigo: '0004', hectareas: 39.4, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '5A CURICHI', codigo: '0005', hectareas: 37.5, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '6A CURICHI', codigo: '0006', hectareas: 23.6, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '7A CURICHI', codigo: '0007', hectareas: 37.7, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '8A CURICHI', codigo: '0008', hectareas: 39.9, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '9A CURICHI', codigo: '0009', hectareas: 26.8, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '10A CURICHI', codigo: '0010', hectareas: 35.1, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '11A CURICHI', codigo: '0011', hectareas: 38.9, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '12A CURICHI', codigo: '0012', hectareas: 27.6, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '13A CURICHI', codigo: '0013', hectareas: 38.5, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '14A CURICHI', codigo: '0014', hectareas: 66.9, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '15A CURICHI', codigo: '0015', hectareas: 44.7, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '16A CURICHI', codigo: '0016', hectareas: 69.1, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '17A CURICHI', codigo: '0017', hectareas: 61.2, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '18A CURICHI', codigo: '0018', hectareas: 43.6, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '19A CURICHI', codigo: '0019', hectareas: 68.7, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '20A CURICHI', codigo: '0020', hectareas: 66.8, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '21A CURICHI', codigo: '0021', hectareas: 43.2, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '22A CURICHI', codigo: '0022', hectareas: 67.9, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '1A TOTAISITO', codigo: '0041', hectareas: 21.5, variedad: 'SW-4863', cultivo: 'SOYA', sector: 'TOTAISITO' },
    { nombre: '2A TOTAISITO', codigo: '0042', hectareas: 19.7, variedad: 'COVERTURA PASTO TRIPLETA', cultivo: 'COVERTURA DE PASTO', sector: 'TOTAISITO' },
    { nombre: '3A TOTAISITO', codigo: '0043', hectareas: 13.1, variedad: 'SW-4863', cultivo: 'SOYA', sector: 'TOTAISITO' },
    { nombre: '4A TOTAISITO', codigo: '0044', hectareas: 29.1, variedad: 'NEGRITA', cultivo: 'SOYA', sector: 'TOTAISITO' },
    { nombre: '5A TOTAISITO', codigo: '0045', hectareas: 28.7, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'TOTAISITO' },
    { nombre: '6A TOTAISITO', codigo: '0046', hectareas: 17.4, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'TOTAISITO' },
    { nombre: '7A TOTAISITO', codigo: '0047', hectareas: 30.2, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'TOTAISITO' },
    { nombre: '8A TOTAISITO', codigo: '0048', hectareas: 24.7, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'TOTAISITO' },
    { nombre: '9A TOTAISITO', codigo: '0049', hectareas: 21.9, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'TOTAISITO' },
    { nombre: '10A TOTAISITO', codigo: '0050', hectareas: 28.5, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'TOTAISITO' },
    { nombre: '11A TOTAISITO', codigo: '0051', hectareas: 31.4, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'TOTAISITO' },
    { nombre: '12A TOTAISITO', codigo: '0052', hectareas: 22.2, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'TOTAISITO' },
    { nombre: '13A TOTAISITO', codigo: '0053', hectareas: 32.4, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'TOTAISITO' },
    { nombre: '1B CURICHI', codigo: '0101', hectareas: 61.2, variedad: 'SIN VARIEDAD', cultivo: 'PASTO', sector: 'CURICHI' },
    { nombre: '2B CURICHI', codigo: '0102', hectareas: 56.7, variedad: 'CUATRIPLETA', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '3B CURICHI', codigo: '0103', hectareas: 35.3, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '4B CURICHI', codigo: '0104', hectareas: 59.3, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '5B CURICHI', codigo: '0105', hectareas: 60, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '6B CURICHI', codigo: '0106', hectareas: 39.2, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '7B CURICHI', codigo: '0107', hectareas: 63.7, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '8B CURICHI', codigo: '0108', hectareas: 58.7, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '9B CURICHI', codigo: '0109', hectareas: 44.3, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '10B CURICHI', codigo: '0110', hectareas: 58.8, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '11B CURICHI', codigo: '0111', hectareas: 57.9, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '12B CURICHI', codigo: '0112', hectareas: 42.8, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '13B CURICHI', codigo: '0113', hectareas: 57.5, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '14B CURICHI', codigo: '0114', hectareas: 60.4, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '15B CURICHI', codigo: '0115', hectareas: 41.3, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '16B CURICHI', codigo: '0116', hectareas: 64.2, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '17B CURICHI', codigo: '0117', hectareas: 59.2, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '18B CURICHI', codigo: '0118', hectareas: 43.2, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '19B CURICHI', codigo: '0119', hectareas: 63.1, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '20B CURICHI', codigo: '0120', hectareas: 60.3, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '21B CURICHI', codigo: '0121', hectareas: 41.2, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '22B CURICHI', codigo: '0122', hectareas: 58.1, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '23B CURICHI', codigo: '0123', hectareas: 56.4, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '24B CURICHI', codigo: '0124', hectareas: 37, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '25B CURICHI', codigo: '0125', hectareas: 65, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CURICHI' },
    { nombre: '1C ALVARO I', codigo: '0200', hectareas: 32.3, variedad: 'AGRI-104', cultivo: 'MAIZ', sector: 'ALVARO' },
    { nombre: '4C ALVARO I', codigo: '0201', hectareas: 64, variedad: 'NEGRITA', cultivo: 'SOYA', sector: 'ALVARO' },
    { nombre: '5C ALVARO I', codigo: '0202', hectareas: 68.2, variedad: 'NEGRITA', cultivo: 'SOYA', sector: 'ALVARO' },
    { nombre: '6C ALVARO I', codigo: '0203', hectareas: 50.8, variedad: 'NEGRITA', cultivo: 'SOYA', sector: 'ALVARO' },
    { nombre: '7C ALVARO I', codigo: '0204', hectareas: 70.4, variedad: 'NEGRITA', cultivo: 'SOYA', sector: 'ALVARO' },
    { nombre: '8C ALVARO I', codigo: '0205', hectareas: 65.2, variedad: 'NEGRITA', cultivo: 'SOYA', sector: 'ALVARO' },
    { nombre: '9C ALVARO I', codigo: '0206', hectareas: 45.6, variedad: 'NEGRITA', cultivo: 'SOYA', sector: 'ALVARO' },
    { nombre: '10C ALVARO 1', codigo: '0207', hectareas: 65.1, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'ALVARO' },
    { nombre: '11C ALVARO I', codigo: '0208', hectareas: 64.9, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'ALVARO' },
    { nombre: '12C ALVARO I', codigo: '0209', hectareas: 43.1, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'ALVARO' },
    { nombre: '13C ALVARO I', codigo: '0210', hectareas: 67.1, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'ALVARO' },
    { nombre: '14C ALVARO 1', codigo: '0211', hectareas: 63.6, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'ALVARO' },
    { nombre: '15C ALVARO I', codigo: '0212', hectareas: 46.6, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'ALVARO' },
    { nombre: '16C ALVARO I', codigo: '0213', hectareas: 63.5, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'ALVARO' },
    { nombre: '17C ALVARO I', codigo: '0214', hectareas: 63.7, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'ALVARO' },
    { nombre: '18C ALVARO I', codigo: '0215', hectareas: 46.2, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'ALVARO' },
    { nombre: '19C ALVARO I', codigo: '0216', hectareas: 63, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'ALVARO' },
    { nombre: '20C ALVARO I', codigo: '0217', hectareas: 65.9, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'ALVARO' },
    { nombre: '21C ALVARO I', codigo: '0218', hectareas: 45.2, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'ALVARO' },
    { nombre: '22C ALVARO I', codigo: '0219', hectareas: 71.3, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'ALVARO' },
    { nombre: '23C ALVARO I', codigo: '0220', hectareas: 71.1, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'ALVARO' },
    { nombre: '24C ALVARO I', codigo: '0221', hectareas: 46.5, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'ALVARO' },
    { nombre: '25C ALVARO I', codigo: '0222', hectareas: 58.7, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'ALVARO' },
    { nombre: '1A NUEVO HORIZONTE', codigo: '0501', hectareas: 29.8, variedad: 'AGRI 002', cultivo: 'SORGO', sector: 'HORIZONTE' },
    { nombre: '2A NUEVO HORIZONTE', codigo: '0502', hectareas: 16.4, variedad: 'AGRI 002', cultivo: 'SORGO', sector: 'HORIZONTE' },
    { nombre: '3A NUEVO HORIZONTE', codigo: '0503', hectareas: 13.9, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'HORIZONTE' },
    { nombre: '4A NUEVO HORIZONTE', codigo: '0504', hectareas: 24.5, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'HORIZONTE' },
    { nombre: '5A NUEVO HORIZONTE', codigo: '0505', hectareas: 28, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'HORIZONTE' },
    { nombre: '6A NUEVO HORIZONTE', codigo: '0506', hectareas: 26.6, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'HORIZONTE' },
    { nombre: '7A NUEVO HORIZONTE', codigo: '0507', hectareas: 27.2, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'HORIZONTE' },
    { nombre: '8A NUEVO HORIZONTE', codigo: '0508', hectareas: 16.4, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'HORIZONTE' },
    { nombre: '9A NUEVO HORIZONTE', codigo: '0509', hectareas: 37.7, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'HORIZONTE' },
    { nombre: '10A NUEVO HORIZONTE', codigo: '0510', hectareas: 30.7, variedad: 'NEGRITA', cultivo: 'SOYA', sector: 'HORIZONTE' },
    { nombre: '11A NUEVO HORIZONTE', codigo: '0511', hectareas: 48.2, variedad: 'NEGRITA', cultivo: 'SOYA', sector: 'HORIZONTE' },
    { nombre: '12A NUEVO HORIZONTE', codigo: '0512', hectareas: 25.5, variedad: 'NEGRITA', cultivo: 'SOYA', sector: 'HORIZONTE' },
    { nombre: '13A NUEVO HORIZONTE', codigo: '0513', hectareas: 19.2, variedad: 'NEGRITA', cultivo: 'SOYA', sector: 'HORIZONTE' },
    { nombre: '14A NUEVO HORIZONTE', codigo: '0514', hectareas: 19.8, variedad: 'NEGRITA', cultivo: 'SOYA', sector: 'HORIZONTE' },
    { nombre: '15A NUEVO HORIZONTE', codigo: '0515', hectareas: 23.6, variedad: 'NEGRITA', cultivo: 'SOYA', sector: 'HORIZONTE' },
    { nombre: '16A NUEVO HORIZONTE', codigo: '0516', hectareas: 18.3, variedad: 'NEGRITA', cultivo: 'SOYA', sector: 'HORIZONTE' },
    { nombre: '17A NUEVO HORIZONTE', codigo: '0517', hectareas: 32.5, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'HORIZONTE' },
    { nombre: '1B NUEVO HORIZONTE', codigo: '0601', hectareas: 51.8, variedad: 'AGRI 002', cultivo: 'SORGO', sector: 'HORIZONTE' },
    { nombre: '2B NUEVO HORIZONTE', codigo: '0602', hectareas: 35.5, variedad: 'AGRI 002', cultivo: 'SORGO', sector: 'HORIZONTE' },
    { nombre: '3B NUEVO HORIZONTE', codigo: '0603', hectareas: 42.2, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'HORIZONTE' },
    { nombre: '4B NUEVO HORIZONTE', codigo: '0604', hectareas: 33.3, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'HORIZONTE' },
    { nombre: '5B NUEVO HORIZONTE', codigo: '0605', hectareas: 38.4, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'HORIZONTE' },
    { nombre: '6B NUEVO HORIZONTE', codigo: '0606', hectareas: 31.9, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'HORIZONTE' },
    { nombre: '7B NUEVO HORIZONTE', codigo: '0607', hectareas: 35.6, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'HORIZONTE' },
    { nombre: '8B NUEVO HORIZONTE', codigo: '0608', hectareas: 24.2, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'HORIZONTE' },
    { nombre: '9B NUEVO HORIZONTE', codigo: '0609', hectareas: 32.2, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'HORIZONTE' },
    { nombre: '10B NUEVO HORIZONTE', codigo: '0610', hectareas: 18.8, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'HORIZONTE' },
    { nombre: '11B NUEVO HORIZONTE', codigo: '0611', hectareas: 27.1, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'HORIZONTE' },
    { nombre: '12B NUEVO HORIZONTE', codigo: '0612', hectareas: 25.9, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'HORIZONTE' },
    { nombre: '13B NUEVO HORIZONTE', codigo: '0613', hectareas: 32.6, variedad: 'NEGRITA', cultivo: 'SOYA', sector: 'HORIZONTE' },
    { nombre: '14B NUEVO HORIZONTE', codigo: '0614', hectareas: 33.2, variedad: 'NEGRITA', cultivo: 'SOYA', sector: 'HORIZONTE' },
    { nombre: '15B NUEVO HORIZONTE', codigo: '0615', hectareas: 31.1, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'HORIZONTE' },
    { nombre: '16B NUEVO HORIZONTE', codigo: '0616', hectareas: 19.9, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'HORIZONTE' },
    { nombre: '17B NUEVO HORIZONTE', codigo: '0617', hectareas: 38.8, variedad: 'TRIPLETA B-D-R', cultivo: 'PASTO', sector: 'HORIZONTE' },
    { nombre: '1A CORREA', codigo: '0801', hectareas: 67.82, variedad: 'SIN VARIEDAD', cultivo: 'PASTO', sector: 'CORREA' },
    { nombre: '2A CORREA', codigo: '0802', hectareas: 42.5, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '3A CORREA', codigo: '0803', hectareas: 76.5, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '4A CORREA', codigo: '0804', hectareas: 54.9, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '5A CORREA', codigo: '0805', hectareas: 54, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '6A CORREA', codigo: '0806', hectareas: 54.5, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '7A CORREA', codigo: '0807', hectareas: 54.8, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '8A CORREA', codigo: '0808', hectareas: 50.6, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '9A CORREA', codigo: '0809', hectareas: 57.3, variedad: 'P-4039', cultivo: 'MAIZ', sector: 'CORREA' },
    { nombre: '10A CORREA', codigo: '0810', hectareas: 63.5, variedad: 'P-4039', cultivo: 'MAIZ', sector: 'CORREA' },
    { nombre: '11A CORREA', codigo: '0811', hectareas: 63, variedad: 'P-4039', cultivo: 'MAIZ', sector: 'CORREA' },
    { nombre: '12A CORREA', codigo: '0812', hectareas: 62.9, variedad: 'P-4039', cultivo: 'MAIZ', sector: 'CORREA' },
    { nombre: '13A CORREA', codigo: '0813', hectareas: 92.1, variedad: 'AGRI-330', cultivo: 'MAIZ', sector: 'CORREA' },
    { nombre: '14A CORREA', codigo: '0814', hectareas: 116.9, variedad: 'AGRI-330', cultivo: 'MAIZ', sector: 'CORREA' },
    { nombre: '15A CORREA', codigo: '0815', hectareas: 123.1, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '16A CORREA', codigo: '0816', hectareas: 126.3, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '17A CORREA', codigo: '0817', hectareas: 90.6, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '18A CORREA', codigo: '0818', hectareas: 93.1, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '19A CORREA', codigo: '0819', hectareas: 83.6, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '20A CORREA', codigo: '0820', hectareas: 113.6, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '1B CORREA', codigo: '0901', hectareas: 113.1, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '2B CORREA', codigo: '0902', hectareas: 118.6, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '3B CORREA', codigo: '0903', hectareas: 81.3, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '4B CORREA', codigo: '0904', hectareas: 54.3, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '5B CORREA', codigo: '0905', hectareas: 51.6, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '6B CORREA', codigo: '0906', hectareas: 47, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '7B CORREA', codigo: '0907', hectareas: 50.1, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '8B CORREA', codigo: '0908', hectareas: 45.8, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '9B CORREA', codigo: '0909', hectareas: 52.9, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '10B CORREA', codigo: '0910', hectareas: 57, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '11B CORREA', codigo: '0911', hectareas: 55.1, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '12B CORREA', codigo: '0912', hectareas: 57.5, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '13B CORREA', codigo: '0913', hectareas: 67.7, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '14B CORREA', codigo: '0914', hectareas: 90.2, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '15B CORREA', codigo: '0915', hectareas: 103.1, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '16B CORREA', codigo: '0916', hectareas: 104, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '17B CORREA', codigo: '0917', hectareas: 67.6, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '18B CORREA', codigo: '0918', hectareas: 72.1, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '19B CORREA', codigo: '0919', hectareas: 72.3, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '20B CORREA', codigo: '0920', hectareas: 98, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CORREA' },
    { nombre: '1A PEREZA', codigo: '1101', hectareas: 32.8, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'PEREZA' },
    { nombre: '2A PEREZA', codigo: '1102', hectareas: 31.6, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'PEREZA' },
    { nombre: '3A PEREZA', codigo: '1103', hectareas: 31.61, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'PEREZA' },
    { nombre: '4A PEREZA', codigo: '1104', hectareas: 30.8, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'PEREZA' },
    { nombre: '5A PEREZA', codigo: '1105', hectareas: 31.53, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'PEREZA' },
    { nombre: '6A PEREZA', codigo: '1106', hectareas: 31.3, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'PEREZA' },
    { nombre: '7A PEREZA', codigo: '1107', hectareas: 33.2, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'PEREZA' },
    { nombre: '8A PEREZA', codigo: '1108', hectareas: 31.6, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'PEREZA' },
    { nombre: '9A PEREZA', codigo: '1109', hectareas: 29.98, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'PEREZA' },
    { nombre: '10A PEREZA', codigo: '1110', hectareas: 25.6, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'PEREZA' },
    { nombre: '11A PEREZA', codigo: '1111', hectareas: 31.5, variedad: 'TRIPLETA B-D-R', cultivo: 'PASTO', sector: 'PEREZA' },
    { nombre: '12A PEREZA', codigo: '1112', hectareas: 28.6, variedad: 'TRIPLETA B-D-R', cultivo: 'PASTO', sector: 'PEREZA' },
    { nombre: '13A PEREZA', codigo: '1113', hectareas: 15.1, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'PEREZA' },
    { nombre: '14A PEREZA', codigo: '1114', hectareas: 15, variedad: 'TRIPLETA B-D-R', cultivo: 'PASTO', sector: 'PEREZA' },
    { nombre: '15A PEREZA', codigo: '1115', hectareas: 18.8, variedad: 'AGRI 002', cultivo: 'SORGO', sector: 'PEREZA' },
    { nombre: '16A PEREZA', codigo: '1116', hectareas: 19.2, variedad: 'AGRI 002', cultivo: 'SORGO', sector: 'PEREZA' },
    { nombre: '1B PEREZA', codigo: '1201', hectareas: 32.8, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'PEREZA' },
    { nombre: '2B PEREZA', codigo: '1202', hectareas: 30, variedad: 'TRIPLETA B-D-R', cultivo: 'PASTO', sector: 'PEREZA' },
    { nombre: '3B PEREZA', codigo: '1203', hectareas: 34, variedad: 'TRIPLETA B-D-R', cultivo: 'PASTO', sector: 'PEREZA' },
    { nombre: '4B PEREZA', codigo: '1204', hectareas: 33.2, variedad: 'DUPLETA B-R', cultivo: 'PASTO', sector: 'PEREZA' },
    { nombre: '5B PEREZA', codigo: '1205', hectareas: 32.17, variedad: 'DUPLETA B-R', cultivo: 'PASTO', sector: 'PEREZA' },
    { nombre: '6B PEREZA', codigo: '1206', hectareas: 30.6, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'PEREZA' },
    { nombre: '7B PEREZA', codigo: '1207', hectareas: 34.6, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'PEREZA' },
    { nombre: '8B PEREZA', codigo: '1208', hectareas: 31.8, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'PEREZA' },
    { nombre: '9B PEREZA', codigo: '1209', hectareas: 30.1, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'PEREZA' },
    { nombre: '10B PEREZA', codigo: '1210', hectareas: 24.4, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'PEREZA' },
    { nombre: '11B PEREZA', codigo: '1211', hectareas: 30.9, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'PEREZA' },
    { nombre: '12B PEREZA', codigo: '1212', hectareas: 29, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'PEREZA' },
    { nombre: '13B PEREZA', codigo: '1213', hectareas: 24.8, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'PEREZA' },
    { nombre: '14B PEREZA', codigo: '1214', hectareas: 26.5, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'PEREZA' },
    { nombre: '15B PEREZA', codigo: '1215', hectareas: 33.1, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'PEREZA' },
    { nombre: '16B PEREZA', codigo: '1216', hectareas: 38.8, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'PEREZA' },
    { nombre: '1A AURORA', codigo: '1401', hectareas: 27.7, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'AURORA' },
    { nombre: '2A AURORA', codigo: '1402', hectareas: 35.5, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'AURORA' },
    { nombre: '3A AURORA', codigo: '1403', hectareas: 34.6, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'AURORA' },
    { nombre: '4A AURORA', codigo: '1404', hectareas: 32.4, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'AURORA' },
    { nombre: '5A AURORA', codigo: '1405', hectareas: 32.4, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'AURORA' },
    { nombre: '6A AURORA', codigo: '1406', hectareas: 32.1, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'AURORA' },
    { nombre: '7A AURORA', codigo: '1407', hectareas: 23.7, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'AURORA' },
    { nombre: '8A AURORA', codigo: '1408', hectareas: 24.5, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'AURORA' },
    { nombre: '9A AURORA', codigo: '1409', hectareas: 26.5, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'AURORA' },
    { nombre: '10A AURORA', codigo: '1410', hectareas: 28, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'AURORA' },
    { nombre: '11A AURORA', codigo: '1411', hectareas: 27.5, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'AURORA' },
    { nombre: '12A AURORA', codigo: '1412', hectareas: 27.6, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'AURORA' },
    { nombre: '13A AURORA', codigo: '1413', hectareas: 26.2, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'AURORA' },
    { nombre: '14A AURORA', codigo: '1414', hectareas: 28.5, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'AURORA' },
    { nombre: '15A AURORA', codigo: '1415', hectareas: 28.8, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'AURORA' },
    { nombre: '16A AURORA', codigo: '1416', hectareas: 29, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'AURORA' },
    { nombre: '17A AURORA', codigo: '1417', hectareas: 30.6, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'AURORA' },
    { nombre: '18A AURORA', codigo: '1418', hectareas: 31.1, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'AURORA' },
    { nombre: '19A AURORA', codigo: '1419', hectareas: 27.9, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'AURORA' },
    { nombre: '20A AURORA', codigo: '1420', hectareas: 28, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'AURORA' },
    { nombre: '21A AURORA', codigo: '1421', hectareas: 26.1, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'AURORA' },
    { nombre: '22A AURORA', codigo: '1422', hectareas: 33.7, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'AURORA' },
    { nombre: '23A AURORA', codigo: '1423', hectareas: 29.6, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'AURORA' },
    { nombre: '24A AURORA', codigo: '1424', hectareas: 30.7, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'AURORA' },
    { nombre: '25A AURORA', codigo: '1425', hectareas: 8.3, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'AURORA' },
    { nombre: '26A AURORA', codigo: '1426', hectareas: 14.8, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'AURORA' },
    { nombre: '27A AURORA', codigo: '1427', hectareas: 31.4, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'AURORA' },
    { nombre: '28A AURORA', codigo: '1428', hectareas: 26.4, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'AURORA' },
    { nombre: '29A AURORA', codigo: '1429', hectareas: 22.5, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'AURORA' },
    { nombre: '1A COOPERATIVA', codigo: '1601', hectareas: 43.6, variedad: 'NEGRITA', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '2A COOPERATIVA', codigo: '1602', hectareas: 28.6, variedad: 'AGRI 002', cultivo: 'SORGO', sector: 'COOPERATIVA' },
    { nombre: '3A COOPERATIVA', codigo: '1603', hectareas: 27.1, variedad: 'AGRI 002', cultivo: 'SORGO', sector: 'COOPERATIVA' },
    { nombre: '4A COOPERATIVA', codigo: '1604', hectareas: 44.9, variedad: 'AGRI 002', cultivo: 'SORGO', sector: 'COOPERATIVA' },
    { nombre: '5A COOPERATIVA', codigo: '1605', hectareas: 26.4, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '6A COOPERATIVA', codigo: '1606', hectareas: 34.9, variedad: 'SW-4863', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '7A COOPERATIVA', codigo: '1607', hectareas: 43.7, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '8A COOPERATIVA', codigo: '1608', hectareas: 33, variedad: 'AGRI 002', cultivo: 'SORGO', sector: 'COOPERATIVA' },
    { nombre: '9A COOPERATIVA', codigo: '1609', hectareas: 35.2, variedad: 'AGRI 002', cultivo: 'SORGO', sector: 'COOPERATIVA' },
    { nombre: '10A COOPERATIVA', codigo: '1610', hectareas: 7.8, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '1B COOPERATIVA', codigo: '1701', hectareas: 11.9, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '1B COOPERATIVA - 01', codigo: '1716', hectareas: 31.1, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '1B COOPERATIVA - 02', codigo: '1727', hectareas: 39.1, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '2B COOPERATIVA', codigo: '1702', hectareas: 8.7, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '2B COOPERATIVA - 01', codigo: '1717', hectareas: 21.7, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '2B COOPERATIVA - 02', codigo: '1728', hectareas: 26.3, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '3B COOPERATIVA', codigo: '1703', hectareas: 7.8, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '3B COOPERATIVA - 01', codigo: '1718', hectareas: 20.3, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '3B COOPERATIVA - 02', codigo: '1729', hectareas: 24.5, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '4B COOPERATIVA', codigo: '1704', hectareas: 11.4, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '4B COOPERATIVA - 01', codigo: '1719', hectareas: 33.1, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '4B COOPERATIVA - 02', codigo: '1730', hectareas: 39.7, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '5B COOPERATIVA', codigo: '1705', hectareas: 7.5, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '5B COOPERATIVA - 01', codigo: '1720', hectareas: 19.6, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '5B COOPERATIVA - 02', codigo: '1731', hectareas: 22.2, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '6B COOPERATIVA', codigo: '1706', hectareas: 8.3, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '6B COOPERATIVA - 01', codigo: '1721', hectareas: 24.9, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '6B COOPERATIVA - 02', codigo: '1732', hectareas: 30.4, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '7B COOPERATIVA', codigo: '1707', hectareas: 12.4, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '7B COOPERATIVA - 01', codigo: '1722', hectareas: 34, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '7B COOPERATIVA - 02', codigo: '1733', hectareas: 38.7, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '8B COOPERATIVA', codigo: '1708', hectareas: 9.2, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '8B COOPERATIVA - 01', codigo: '1723', hectareas: 25.5, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '8B COOPERATIVA - 02', codigo: '1734', hectareas: 28.8, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '9B COOPERATIVA', codigo: '1709', hectareas: 10.3, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '9B COOPERATIVA - 01', codigo: '1724', hectareas: 28.2, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '9B COOPERATIVA - 02', codigo: '1735', hectareas: 30.7, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '10B COOPERATIVA', codigo: '1710', hectareas: 18.6, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '10B COOPERATIVA - 01', codigo: '1725', hectareas: 34.9, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '10B COOPERATIVA - 02', codigo: '1726', hectareas: 37.5, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '1C COOPERATIVA', codigo: '1801', hectareas: 58, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '2C COOPERATIVA', codigo: '1802', hectareas: 31.9, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '3C COOPERATIVA', codigo: '1803', hectareas: 46.3, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '4C COOPERATIVA', codigo: '1804', hectareas: 50.5, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '5C COOPERATIVA', codigo: '1805', hectareas: 60.8, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '6C COOPERATIVA', codigo: '1806', hectareas: 57, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '7C COOPERATIVA', codigo: '1807', hectareas: 69.4, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '8C COOPERATIVA', codigo: '1808', hectareas: 50.6, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '9C COOPERATIVA', codigo: '1809', hectareas: 58.6, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '10C COOPERATIVA', codigo: '1810', hectareas: 70.2, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'COOPERATIVA' },
    { nombre: '1C CAMBA', codigo: '1901', hectareas: 83.8, variedad: 'CARAVANA', cultivo: 'SOYA', sector: 'CAMBA' },
    { nombre: '2C CAMBA', codigo: '1902', hectareas: 80.1, variedad: 'CARAVANA', cultivo: 'SOYA', sector: 'CAMBA' },
    { nombre: '3C CAMBA', codigo: '1903', hectareas: 83.1, variedad: 'CARAVANA', cultivo: 'SOYA', sector: 'CAMBA' },
    { nombre: '4C CAMBA', codigo: '1904', hectareas: 83.6, variedad: 'CARAVANA', cultivo: 'SOYA', sector: 'CAMBA' },
    { nombre: '5C CAMBA', codigo: '1905', hectareas: 79.3, variedad: 'CARAVANA', cultivo: 'SOYA', sector: 'CAMBA' },
    { nombre: '6C CAMBA', codigo: '1906', hectareas: 58.9, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CAMBA' },
    { nombre: '7C CAMBA', codigo: '1907', hectareas: 96.8, variedad: 'CARAVANA', cultivo: 'SOYA', sector: 'CAMBA' },
    { nombre: '8C CAMBA', codigo: '1908', hectareas: 65.8, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CAMBA' },
    { nombre: '9C CAMBA', codigo: '1909', hectareas: 54.6, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CAMBA' },
    { nombre: '10C CAMBA', codigo: '1910', hectareas: 55.84, variedad: 'MUNASQA REGISTRADA-1', cultivo: 'SOYA', sector: 'CAMBA' },
    { nombre: '12C CAMBA', codigo: '1912', hectareas: 98.1, variedad: 'MUNASQA REGISTRADA-2', cultivo: 'SOYA', sector: 'CAMBA' },
    { nombre: '1A MERCEDES', codigo: '2010', hectareas: 43.1, variedad: 'SW-4863', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '2A MERCEDES', codigo: '2020', hectareas: 43.9, variedad: 'SW-4863', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '3A MERCEDES', codigo: '2030', hectareas: 30.7, variedad: 'SW-4863', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '4A MERCEDES', codigo: '2040', hectareas: 28.1, variedad: 'SW-4863', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '5A MERCEDES', codigo: '2050', hectareas: 23.2, variedad: 'SW-4863', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '1B MERCEDES', codigo: '2060', hectareas: 28.7, variedad: 'COVERTURA PASTO TRIPLETA', cultivo: 'COVERTURA DE PASTO', sector: 'MERCEDES' },
    { nombre: '1B MERCEDES - 01', codigo: '2061', hectareas: 16.4, variedad: 'SW-4863', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '2B MERCEDES', codigo: '2070', hectareas: 28.5, variedad: 'COVERTURA PASTO TRIPLETA', cultivo: 'COVERTURA DE PASTO', sector: 'MERCEDES' },
    { nombre: '2B MERCEDES - 01', codigo: '2071', hectareas: 13.7, variedad: 'SW-4863', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '3B MERCEDES', codigo: '2080', hectareas: 43.8, variedad: 'COVERTURA PASTO TRIPLETA', cultivo: 'COVERTURA DE PASTO', sector: 'MERCEDES' },
    { nombre: '3B MERCEDES - 01', codigo: '2081', hectareas: 8.5, variedad: 'SW-4863', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '4B MERCEDES', codigo: '2090', hectareas: 46, variedad: 'SW-4863', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '4B MERCEDES - 01', codigo: '2091', hectareas: 7.27, variedad: 'SW-4863', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '5B MERCEDES', codigo: '2100', hectareas: 33, variedad: 'SW-4863', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '5B MERCEDES - 01', codigo: '2101', hectareas: 8.04, variedad: 'SW-4863', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '14B MERCEDES', codigo: '2110', hectareas: 26, variedad: 'SW-4863', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '15B MERCEDES', codigo: '2120', hectareas: 30.6, variedad: 'SW-4863', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '16B MERCEDES', codigo: '2130', hectareas: 32.1, variedad: 'SW-4863', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '1C MERCEDES', codigo: '2140', hectareas: 44.1, variedad: 'SW-4863', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '2C MERCEDES', codigo: '2150', hectareas: 42.5, variedad: 'SW-4863', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '3C MERCEDES', codigo: '2160', hectareas: 43.7, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '4C MERCEDES', codigo: '2170', hectareas: 43.4, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '5C MERCEDES', codigo: '2180', hectareas: 40.4, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '6C MERCEDES', codigo: '2190', hectareas: 45, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '7C MERCEDES', codigo: '2200', hectareas: 47.4, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '8C MERCEDES', codigo: '2210', hectareas: 42.6, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '9C MERCEDES', codigo: '2220', hectareas: 36.5, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '10C MERCEDES', codigo: '2230', hectareas: 38.2, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '11C MERCEDES', codigo: '2240', hectareas: 37.1, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '12C MERCEDES', codigo: '2250', hectareas: 37.5, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '13C MERCEDES', codigo: '2260', hectareas: 37.5, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '14C MERCEDES', codigo: '2270', hectareas: 36.2, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '15C MERCEDES', codigo: '2280', hectareas: 36.6, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '16C MERCEDES', codigo: '2290', hectareas: 39.4, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '17C MERCEDES', codigo: '2300', hectareas: 42.9, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '18C MERCEDES', codigo: '2310', hectareas: 14.7, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '1D MERCEDES', codigo: '2320', hectareas: 41.9, variedad: 'SW-4863', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '2D MERCEDES', codigo: '2330', hectareas: 40.4, variedad: 'SW-4863', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '3D MERCEDES', codigo: '2340', hectareas: 37.7, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '4D MERCEDES', codigo: '2350', hectareas: 46.4, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '5D MERCEDES', codigo: '2360', hectareas: 44.9, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '6D MERCEDES', codigo: '2370', hectareas: 44.6, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '7D MERCEDES', codigo: '2380', hectareas: 45.5, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '8D MERCEDES', codigo: '2390', hectareas: 43.3, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '9D MERCEDES', codigo: '2400', hectareas: 36.6, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '10D MERCEDES', codigo: '2410', hectareas: 38.7, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '11D MERCEDES', codigo: '2420', hectareas: 40.8, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '12D MERCEDES', codigo: '2430', hectareas: 40.1, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '13D MERCEDES', codigo: '2440', hectareas: 41.1, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '14D MERCEDES', codigo: '2450', hectareas: 40.3, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '15D MERCEDES', codigo: '2460', hectareas: 43.8, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '16D MERCEDES', codigo: '2470', hectareas: 45.83, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '17D MERCEDES', codigo: '2480', hectareas: 48.1, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '18D MERCEDES', codigo: '2490', hectareas: 35.1, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '19D MERCEDES', codigo: '2500', hectareas: 15.48, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: '20D MERCEDES', codigo: '2510', hectareas: 14.48, variedad: 'TMG-7363', cultivo: 'SOYA', sector: 'MERCEDES' },
    { nombre: 'INDIRECTO', codigo: '9005', hectareas: 0, variedad: 'SIN VARIEDAD', cultivo: 'PASTO', sector: 'MERCEDES' },
    { nombre: 'CAV-SOYA', codigo: '9100', hectareas: 0, variedad: 'GENERAL', cultivo: 'SOYA', sector: 'MERCEDES' },  ];

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

  const tecnicosDemo = [
    'Juan Pérez',
    'María López',
    'Carlos Gómez'
  ];

  for (const nombre of tecnicosDemo) {
    await executeRun(
      'INSERT INTO tecnicos (nombre) VALUES (?)',
      [nombre]
    );
  }
}

/* =========================================================
   TIPOS DE APLICACIÓN
========================================================= */
export async function seedTiposAplicacion() {
  const [{ count }] = await executeQuery(
    'SELECT COUNT(*) as count FROM tipos_aplicacion'
  );

  if (count > 0) {
    return;
  }

  const tiposDemo = [
    'AEREA',
    'TERRESTRE'
  ];

  for (const nombre of tiposDemo) {
    await executeRun(
      'INSERT INTO tipos_aplicacion (nombre) VALUES (?)',
      [nombre]
    );
  }
}

/* =========================================================
   CAUDALES
========================================================= */
export async function seedCaudales() {
  const [{ count }] = await executeQuery(
    'SELECT COUNT(*) as count FROM caudales'
  );

  if (count > 0) {
    return;
  }

  const caudalesDemo = [
    { nombre: 'Bajo', valor: 80, unidad: 'L/ha' },
    { nombre: 'Medio', valor: 120, unidad: 'L/ha' },
    { nombre: 'Alto', valor: 180, unidad: 'L/ha' }
  ];

  for (const caudal of caudalesDemo) {
    await executeRun(
      'INSERT INTO caudales (nombre, valor, unidad) VALUES (?, ?, ?)',
      [caudal.nombre, caudal.valor, caudal.unidad]
    );
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

  const productos = [
    { codigo: '2,4D-H', nombre: 'INTER D -2,4D ( Aminex-amina 72%)', linea: 'HERBICIDAS', unidad: 'L' },
    { codigo: 'ACETOCHLOR-H', nombre: 'INTERCLOR  ACETHOCLOR-H', linea: 'HERBICIDAS', unidad: 'L' },
    { codigo: 'ARROZAN', nombre: 'ARROZAN 220 G/L', linea: 'HERBICIDAS', unidad: 'L' },
    { codigo: 'CLETODIN-H', nombre: 'CLETHODIM (CHARTER)', linea: 'HERBICIDAS', unidad: 'L' },
    { codigo: 'CLOMAZONE-H', nombre: 'CLOMAZONE AZONE MAX', linea: 'HERBICIDAS', unidad: 'L' },
    { codigo: 'CLORIMURON-H', nombre: 'CLORIMURON-CLASINEX-CLORIMUR', linea: 'HERBICIDAS', unidad: 'KG' },
    { codigo: 'CONVEY-H', nombre: 'CONVEY', linea: 'HERBICIDAS', unidad: 'L' },
    { codigo: 'DICLOSULAM-H', nombre: 'PROCORE-DICLOSULAM', linea: 'HERBICIDAS', unidad: 'KG' },
    { codigo: 'FLUMIOXAZIN-H', nombre: 'FLUMIOXAZOL', linea: 'HERBICIDAS', unidad: 'L' },
    { codigo: 'FLUROXIPIR-H', nombre: 'FLUROXIPIR', linea: 'HERBICIDAS', unidad: 'L' },
    { codigo: 'GALANT-H', nombre: 'GALANT (HALOXIFOP-R-METHYL)', linea: 'HERBICIDAS', unidad: 'L' },
    { codigo: 'GLIFOSIX 75,7-H', nombre: 'GLIFOSIX', linea: 'HERBICIDAS', unidad: 'KG' },
    { codigo: 'GLIFOSIX-H', nombre: 'GLIFOSATO 608', linea: 'HERBICIDAS', unidad: 'L' },
    { codigo: 'GLUFOSINATO 20%-H', nombre: 'GLUFOSINATE-AMMONIUM 200 G/L', linea: 'HERBICIDAS', unidad: 'L' },
    { codigo: 'HALOXYFOP-H', nombre: 'HALOXYFOP-R ( METIL 10,8% ) HALOXYFAP', linea: 'HERBICIDAS', unidad: 'L' },
    { codigo: 'HEAT-H', nombre: 'HEAT', linea: 'HERBICIDAS', unidad: 'KG' },
    { codigo: 'IMAZAPYR 250-H', nombre: 'MAZAPYR 250', linea: 'HERBICIDAS', unidad: 'L' },
    { codigo: 'IMAZETAPHIR-H', nombre: 'IMAZETAPHIR', linea: 'HERBICIDAS', unidad: 'L' },
    { codigo: 'LACTOFORTE-H', nombre: 'LACTOFEN 240 G/L', linea: 'HERBICIDAS', unidad: 'L' },
    { codigo: 'LIFELINE-H', nombre: 'LIFELINE 20LT(GLUFOSINATE DE AMONIUM)', linea: 'HERBICIDAS', unidad: 'L' },
    { codigo: 'MAUSER-H', nombre: 'MAUSER (FOMESAFEN)', linea: 'HERBICIDAS', unidad: 'L' },
    { codigo: 'METRIBUZIN-H', nombre: 'SENCOR-TRICOR(METRIBUZIN)', linea: 'HERBICIDAS', unidad: 'L' },
    { codigo: 'PANTERA-H', nombre: 'QUIZALOFOP-PANTERA', linea: 'HERBICIDAS', unidad: 'L' },
    { codigo: 'PANZER GOLD-H', nombre: 'GLIFOSATO SAL MONOAMONICA 608g/L', linea: 'HERBICIDAS', unidad: 'L' },
    { codigo: 'PARAPIX (PARAQUAT)-H', nombre: 'PARAPIX (PARAQUAT)', linea: 'HERBICIDAS', unidad: 'L' },
    { codigo: 'PLATEU-H', nombre: 'IMAZAPIC', linea: 'HERBICIDAS', unidad: 'KG' },
    { codigo: 'ROUNDUP CONTROL MAX -H', nombre: 'ROUNDUP CONTROL MAX', linea: 'HERBICIDAS', unidad: 'KG' },
    { codigo: 'SULFENTRAZONE-H', nombre: 'SULFENTRAZONE', linea: 'HERBICIDAS', unidad: 'L' },
    { codigo: 'TECNUP PREMIUN-H', nombre: 'TECNUP PREMIUN 60,8', linea: 'HERBICIDAS', unidad: 'L' },
    { codigo: 'TRIBUSA-H', nombre: 'TRICLOPYR 83,4 %', linea: 'HERBICIDAS', unidad: 'L' },
    { codigo: 'ZINATRA DKN', nombre: 'ATRAZINA', linea: 'HERBICIDAS', unidad: 'KG' },
    { codigo: 'ABAMECTIN-I', nombre: 'ABAMECTINA', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'ABAMEX PLUS -I', nombre: 'ABAMEX  PLUS', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'ALLIAN-I', nombre: 'ALLIANCE', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'ANDROID-I', nombre: 'SPIRIT', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'BUPROFEZIN-I', nombre: 'BUPROFEZIN', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'CARTUGEN-I', nombre: 'CARTUGEN', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'CAXIN-I', nombre: 'CAXIN (FLUXOFENIN)', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'CLORANTRANILIPROLE-I', nombre: 'CLORANTRANILIPROLE 75%-NAVAJO', linea: 'INSECTICIDAS', unidad: 'KG' },
    { codigo: 'CLORFENAPYR-I', nombre: 'CLORFENAPYR 70%', linea: 'INSECTICIDAS', unidad: 'KG' },
    { codigo: 'CLORPIRIFOS-I', nombre: 'CLORPIRON INTERPIRIFOS (LORBEK) MISIL', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'CONNECT-I', nombre: 'CONNECT-I', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'DELETE-I', nombre: 'CHORFENAPYR', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'DINOTEFURAN-I', nombre: 'DINOTEFURAN', linea: 'INSECTICIDAS', unidad: 'KG' },
    { codigo: 'EXALT-I', nombre: 'EXALT-SPINETORAM', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'FENDONA-I', nombre: 'FENDONA', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'FIPRONIL-I', nombre: 'MAGNUN 80 WAG - SUNAMI-FIPRONON', linea: 'INSECTICIDAS', unidad: 'KG' },
    { codigo: 'FLYCONTROL-I', nombre: 'FLYCONTROL (AZETAMIPRID)', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'FORTIMYL-I', nombre: 'TRIADICARB+IMIDACLOPRID', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'GOLDROLE XTRA-I', nombre: 'FLUBENDIAMIDE 20%', linea: 'INSECTICIDAS', unidad: 'KG' },
    { codigo: 'INDOXACARB', nombre: 'INDOXACARB', linea: 'INSECTICIDAS', unidad: 'KG' },
    { codigo: 'INDOXACARB-I', nombre: 'INDOXACARP 30% - DROLIN', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'JOKER-I', nombre: 'BIFENTRIN+THIAMETOXAN', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'KEYROLE XTRA-I', nombre: 'CLOTHIANIDIN', linea: 'INSECTICIDAS', unidad: 'KG' },
    { codigo: 'KILLIGAN-I', nombre: 'KILLIGAN-PINION (CHLORFENAPIR 240 G/L', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'LAMBDACION-I', nombre: 'LAMBDA-CYHALOTRINA', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'LARVIN-I', nombre: 'LARVIN', linea: 'INSECTICIDAS', unidad: 'KG' },
    { codigo: 'LUFENURON-I', nombre: 'SENTINEL PLUS', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'MASTEROLE-I', nombre: 'MASTEROLE-AUDAZ ( METHOXYFENOZIDE )', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'METHOMYL-I', nombre: 'EXPLOSIVE METHOMYL- POSEIDON', linea: 'INSECTICIDAS', unidad: 'KG' },
    { codigo: 'MIREX-I', nombre: 'MIREX', linea: 'INSECTICIDAS', unidad: 'KG' },
    { codigo: 'MITER XTRA-I', nombre: 'MITER XTRA (ABAMECTIN 144 g/l)', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'NOCTUR T-I', nombre: 'NOCTUR T', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'OBERON-I', nombre: 'SPIROMESIFEN', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'PRESEA-I', nombre: 'BENZOATO-EMAMECTIN-NOVO', linea: 'INSECTICIDAS', unidad: 'KG' },
    { codigo: 'QUINTAL XTRA-I', nombre: 'SPINETORAM 30% METHOXIFENOZIDE 6%', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'SPINOTERAN', nombre: 'SPINOTERAN', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'SPIRODICLOFEN+ABAMECTIN', nombre: 'SPIRODICLOFEN 18%+ABAMECTIN 25%', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'SPIROMESIFEN-I', nombre: 'SPIROMESIFEN', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'TEFLUMAX GL-I', nombre: 'TEFLUBENZURON', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'THIAMETOXAN-I', nombre: 'INTERTOXAN-VORTIS-THIAMETHOXAN', linea: 'INSECTICIDAS', unidad: 'KG' },
    { codigo: 'TOPADOR PLUS -I', nombre: 'TOPADOR', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'TRACER-I', nombre: 'TRACER', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'TRANSFORM-I', nombre: 'TRANSFORM (SULFOXAFLOR 500 g/KG)', linea: 'INSECTICIDAS', unidad: 'KG' },
    { codigo: 'TRIFLUMIC-I', nombre: 'TRIFLUMIC TRIFLUMURON', linea: 'INSECTICIDAS', unidad: 'L' },
    { codigo: 'VENOM-I', nombre: 'VENOM (CHLORANTRANILIPROLE 800 WG', linea: 'INSECTICIDAS', unidad: 'KG' },
    { codigo: 'ACRONIS-F', nombre: 'ACRONIS', linea: 'FUNGICIDAS', unidad: 'L' },
    { codigo: 'AFRODITA-F', nombre: 'AFRODITA 250-SC (PICOXYSTROBIN 250 G/L)', linea: 'FUNGICIDAS', unidad: 'L' },
    { codigo: 'APRON MAXX-F', nombre: 'APRON MAXX', linea: 'FUNGICIDAS', unidad: 'L' },
    { codigo: 'AZOXYSTEBOL C-14 F', nombre: 'AZOXYSTEBOL C-14', linea: 'FUNGICIDAS', unidad: 'L' },
    { codigo: 'CIBRANIL-F', nombre: 'CLOROTHALONIL', linea: 'FUNGICIDAS', unidad: 'L' },
    { codigo: 'CLEANER XTRA-F', nombre: 'CLEANER XTRA(CHLOROTHALONIL 90% WG)', linea: 'FUNGICIDAS', unidad: 'KG' },
    { codigo: 'CRIPTON-F', nombre: 'CRIPTON SC325 BOT BO', linea: 'FUNGICIDAS', unidad: 'L' },
    { codigo: 'CROSS FIRE-F', nombre: 'CROSS FIRE', linea: 'FUNGICIDAS', unidad: 'L' },
    { codigo: 'DIFENICONAZOL+CYPROCO-F', nombre: 'DIFENICINAZOLE +CIPROCONAZOLE', linea: 'FUNGICIDAS', unidad: 'L' },
    { codigo: 'DIFENOCONAZOLE+PIRACLOSTR', nombre: 'DIFENOCONAZOLE+PIRACLOSTROBIN', linea: 'FUNGICIDAS', unidad: 'L' },
    { codigo: 'DIFPROP-F', nombre: 'DIFPROP', linea: 'FUNGICIDAS', unidad: 'L' },
    { codigo: 'FLUXAPIROXAD 167-F', nombre: 'FLUXAPIROXAD 167', linea: 'FUNGICIDAS', unidad: 'L' },
    { codigo: 'FLUXAPIROXAD+PIRACLOSTROB', nombre: 'FLUXAPIROZAX+PIRAXLOSTROBIN', linea: 'FUNGICIDAS', unidad: 'L' },
    { codigo: 'FUNGIBAC-F', nombre: 'FUNGIBAC', linea: 'FUNGICIDAS', unidad: 'L' },
    { codigo: 'FUNGIMYL DUO-F', nombre: 'FUNGIMYL DUO', linea: 'FUNGICIDAS', unidad: 'L' },
    { codigo: 'OPERA-F', nombre: 'OPERA', linea: 'FUNGICIDAS', unidad: 'L' },
    { codigo: 'PRIAXOR-F', nombre: 'PRIAXOR X 5LTS', linea: 'FUNGICIDAS', unidad: 'L' },
    { codigo: 'PRIORI XTRA-F', nombre: 'PRIORI XTRA', linea: 'FUNGICIDAS', unidad: 'L' },
    { codigo: 'PROTHIOCONAZOLE+PICOXIS-F', nombre: 'PROTHIOCONAZOLE+PICOXYSTROBIN-F', linea: 'FUNGICIDAS', unidad: 'L' },
    { codigo: 'REDSHIELD 750-F', nombre: 'REDSHIEL 750 OXIDO CUPROSO', linea: 'FUNGICIDAS', unidad: 'KG' },
    { codigo: 'REMOVE RS', nombre: 'REMOVE', linea: 'FUNGICIDAS', unidad: 'L' },
    { codigo: 'SPROUT X-FUNG', nombre: 'SPROUT XTRA FUNGICIDA TRAT. DE SEMILLA', linea: 'FUNGICIDAS', unidad: 'L' },
    { codigo: 'THANOS-F', nombre: 'THANOS TURIN.', linea: 'FUNGICIDAS', unidad: 'L' },
    { codigo: 'UNIZEB GOLD-F', nombre: 'UNIZEB GOLD (MANCOZEB)', linea: 'FUNGICIDAS', unidad: 'KG' },
    { codigo: 'VERNO-F', nombre: 'VERNO', linea: 'FUNGICIDAS', unidad: 'KG' },
    { codigo: 'VERSATILIS-F', nombre: 'VERSATILIS', linea: 'FUNGICIDAS', unidad: 'L' },
    { codigo: 'VIOVAN-F', nombre: 'VIOVAN', linea: 'FUNGICIDAS', unidad: 'L' },
    { codigo: 'ACTION OIL-INO', nombre: 'ACTION OIL (ACEITE VEGETAL)', linea: 'INOCULANTES', unidad: 'L' },
    { codigo: 'ENERGY TOP-INO', nombre: 'ENERGY TOP', linea: 'INOCULANTES', unidad: 'L' },
    { codigo: 'ACQUAMAX FULL-FER', nombre: 'ACQUAMAX', linea: 'FERTILIZANTES', unidad: 'L' },
    { codigo: 'AMINO 80-FER', nombre: 'AMINO 80-FER', linea: 'FERTILIZANTES', unidad: 'KG' },
    { codigo: 'AUXINA CITOQUININA KT-IAA', nombre: 'AUXINA CITOQUININA KT-IAA', linea: 'FERTILIZANTES', unidad: 'KG' },
    { codigo: 'BIO GAIN AMINO-FER', nombre: 'BIO GAEN AMINO', linea: 'FERTILIZANTES', unidad: 'KG' },
    { codigo: 'BORO-FER', nombre: 'BORO LIQ', linea: 'FERTILIZANTES', unidad: 'L' },
    { codigo: 'COSMO AGUA -FER', nombre: 'COSMO AGUA', linea: 'FERTILIZANTES', unidad: 'KG' },
    { codigo: 'COSMO IND - FER', nombre: 'COSMO IND', linea: 'FERTILIZANTES', unidad: 'L' },
    { codigo: 'ESSENCE-FER', nombre: 'ESSENCE', linea: 'FERTILIZANTES', unidad: 'L' },
    { codigo: 'FERTILIZANTE MINERAL', nombre: 'FERTILIZANTE MINERAL', linea: 'FERTILIZANTES', unidad: 'L' },
    { codigo: 'FOSFITO DE MANGANESO', nombre: 'FOSFITO DE MANGANESO', linea: 'FERTILIZANTES', unidad: 'L' },
    { codigo: 'FULVIN-FER', nombre: 'FULVIN', linea: 'FERTILIZANTES', unidad: 'L' },
    { codigo: 'GIBERELINA-FER', nombre: 'GIBERELINA', linea: 'FERTILIZANTES', unidad: 'KG' },
    { codigo: 'HUMIVIP-FER', nombre: 'HUMIVIP', linea: 'FERTILIZANTES', unidad: 'L' },
    { codigo: 'IND-NUTRI ZN-FER', nombre: 'IND-NUTRI ZN', linea: 'FERTILIZANTES', unidad: 'L' },
    { codigo: 'KINETINE-FER', nombre: 'KINETINE CITOQUININA KT', linea: 'FERTILIZANTES', unidad: 'KG' },
    { codigo: 'KOMBU-FER', nombre: 'KOMBU', linea: 'FERTILIZANTES', unidad: 'L' },
    { codigo: 'LITUS-FER', nombre: 'LITUS-FER', linea: 'FERTILIZANTES', unidad: 'L' },
    { codigo: 'LOBI 44-FER', nombre: 'LOBI 44-FER', linea: 'FERTILIZANTES', unidad: 'KG' },
    { codigo: 'MIST TPS 65-FER', nombre: 'MIST TPS 65', linea: 'FERTILIZANTES', unidad: 'L' },
    { codigo: 'MIST TPS 78-FER', nombre: 'MIST TPS 78', linea: 'FERTILIZANTES', unidad: 'L' },
    { codigo: 'MULTI CROP-FER', nombre: 'MULTI CROP', linea: 'FERTILIZANTES', unidad: 'KG' },
    { codigo: 'N TOP-FER', nombre: 'N TOP FER', linea: 'FERTILIZANTES', unidad: 'L' },
    { codigo: 'NEW-FER', nombre: 'NEW -FER', linea: 'FERTILIZANTES', unidad: 'L' },
    { codigo: 'NITRATE BALANCER-FER', nombre: 'NITRATE BALANCER-FER', linea: 'FERTILIZANTES', unidad: 'L' },
    { codigo: 'NUTRISIL 50-FER', nombre: 'NUTRISIL 50', linea: 'FERTILIZANTES', unidad: 'L' },
    { codigo: 'NZONE MAX-FER', nombre: 'NZONE MAX', linea: 'FERTILIZANTES', unidad: 'L' },
    { codigo: 'RADIFLEX-FER', nombre: 'RADIFLEX', linea: 'FERTILIZANTES', unidad: 'L' },
    { codigo: 'SCHLAG-FER', nombre: 'SCHLAG', linea: 'FERTILIZANTES', unidad: 'L' },
    { codigo: 'SEED ZINC-FER', nombre: 'SEED ZINC', linea: 'FERTILIZANTES', unidad: 'L' },
    { codigo: 'SULFOCA-FER', nombre: 'SULFOCA', linea: 'FERTILIZANTES', unidad: 'L' },
    { codigo: 'VIGORSEM-FER', nombre: 'VIGORSEM', linea: 'FERTILIZANTES', unidad: 'L' },
    { codigo: 'X-CYTE REGULADOR-F', nombre: 'X CYTE REGULADOR DE CRECIMIENTO', linea: 'FERTILIZANTES', unidad: 'L' },
    { codigo: 'YESO AGRICOLA-FER', nombre: 'FORM.POLVO CA 31%+S 18%', linea: 'FERTILIZANTES', unidad: 'KG' },
    { codigo: 'ZINC-FER', nombre: 'ZINC/QUEL', linea: 'FERTILIZANTES', unidad: 'L' },
    { codigo: 'ALL-K', nombre: 'ALL-K', linea: 'ADHERENTES Y COADYUVANTES', unidad: 'L' },
    { codigo: 'ALL-N', nombre: 'ALL-N', linea: 'ADHERENTES Y COADYUVANTES', unidad: 'L' },
    { codigo: 'B-MOLY-AD', nombre: 'B-MOLY', linea: 'ADHERENTES Y COADYUVANTES', unidad: 'L' },
    { codigo: 'CARRY-AD', nombre: 'CARRY', linea: 'ADHERENTES Y COADYUVANTES', unidad: 'L' },
    { codigo: 'CORREO-AD', nombre: 'CORREO', linea: 'ADHERENTES Y COADYUVANTES', unidad: 'L' },
    { codigo: 'CT-GREEN-BIO', nombre: 'CT- GREEN', linea: 'ADHERENTES Y COADYUVANTES', unidad: 'L' },
    { codigo: 'DANKEN HARD GOLD-COAD', nombre: 'DANKEN HARD MIX', linea: 'ADHERENTES Y COADYUVANTES', unidad: 'L' },
    { codigo: 'INTER FIX-COAD', nombre: 'INTER FIX', linea: 'ADHERENTES Y COADYUVANTES', unidad: 'L' },
    { codigo: 'INTER OIL-COAD', nombre: 'INTER OIL', linea: 'ADHERENTES Y COADYUVANTES', unidad: 'L' },
    { codigo: 'INVERTE OIL-COAD', nombre: 'INVERTE OIL', linea: 'ADHERENTES Y COADYUVANTES', unidad: 'L' },
    { codigo: 'KOMUS FLEX-AD', nombre: 'KOMUS FLEX', linea: 'ADHERENTES Y COADYUVANTES', unidad: 'L' },
    { codigo: 'PORTADOR-AD', nombre: 'PORTADOR (ACEITE VEGETAL)', linea: 'ADHERENTES Y COADYUVANTES', unidad: 'L' },
    { codigo: 'SILICON GOLD', nombre: 'SILICON GOLD', linea: 'ADHERENTES Y COADYUVANTES', unidad: 'L' },
    { codigo: 'SILICON-AD', nombre: 'SILICON CROP', linea: 'ADHERENTES Y COADYUVANTES', unidad: 'L' },
    { codigo: 'SUPER GUN-AD', nombre: 'SUPER GUN', linea: 'ADHERENTES Y COADYUVANTES', unidad: 'L' },
    { codigo: 'SUPER SEGURO-COAD', nombre: 'SUPER SEGURO', linea: 'ADHERENTES Y COADYUVANTES', unidad: 'L' },
    { codigo: 'TRILL', nombre: 'TRILL', linea: 'ADHERENTES Y COADYUVANTES', unidad: 'L' },
    { codigo: 'TWIN-AD', nombre: 'TWIN PLUS', linea: 'ADHERENTES Y COADYUVANTES', unidad: 'L' },
    { codigo: 'ACEITE CRUDO-AC', nombre: 'ACEITE CRUDO', linea: 'ACEITES MINERALES', unidad: 'L' },
    { codigo: 'BROAD-', nombre: 'BROAD', linea: 'ACEITES MINERALES', unidad: 'L' },
    { codigo: 'FITOBOLIC', nombre: 'FITOBOLIC EX1', linea: 'BIOESTIMULANTES (REG. Y CRECIMIENTO)', unidad: 'L' },
    { codigo: 'ALOE CONTROLE-BIO', nombre: 'ALOE CONTROLE', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'ALOE EXTRACTOS VEG-BIO', nombre: 'ALOE EXTRACTOS VEGETALES', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'ALOE PLUS-BIO', nombre: 'ALOE PLUS', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'ANTIESPUMANTE-BIO', nombre: 'ANTIESPUMANTE', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'AZOSPIRILLUN CEPA-BAC12', nombre: 'AZOSPIRILLUN CEPA-BAC 12', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'AZOSPIRILUM-BIO', nombre: 'AZOSPIRILUM', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'B. AMYLOLIQUEFACIENS-BIO', nombre: 'BACILLUS AMYLILOQUEFACIENS', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'B. ARYBHATTAI CEPA-BAC03', nombre: 'BACILLUS ARYBHATTAI CEPA-BAC03', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'B. SUBTILIS CEPA-BAC08', nombre: 'BACILLUS SUBTILIS CEPA -BAC08', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'B. THURINGIENSIS-BIO', nombre: 'BACILLUS THURINGIENSIS', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'B.ARYABHATTAI-BIO', nombre: 'BACILLUS ARYABHATTAI', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'BACILLUS CEREUS-BIO', nombre: 'BACILLUS CEREUS', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'BACILLUS MEGATERIUM-BIO', nombre: 'BACILLUS MEGATERIUM-BIO', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'BACILLUS SAFENSIS-BIO', nombre: 'BACILLUS SAFENSIS', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'BACILLUS SUBTILIS-BIO', nombre: 'BACILLUS SUBTILIS', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'BACILLUS TEQUELENSIS-BIO', nombre: 'BACILLUS TEQUELENSIS', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'BACILLUS VELEZENSIS-BIO', nombre: 'BACILLUS VELEZENSIS', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'BAUVERIA BASIANA SP-BIO', nombre: 'BAUVERIA BASIANA', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'BIOFIX FORTE RED-BIO', nombre: 'BIOFIX FORTE RED', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'BIOMAX-BIO', nombre: 'BIOMAX', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'BRADYRHIZOBIUM CEPA-BAC01', nombre: 'BRADYRHIZOBIUM CEPA-BAC01', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'BRADYRHIZOBIUM-BIO', nombre: 'NITROBIO BRADYRHIZOBIUM', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'COLOR SEED-BIO', nombre: 'COLOR SEED', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'DRIFTLOCK-BIO', nombre: 'DRIFTLOCK', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'EM-1-BIO', nombre: 'EM-1', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'HOGO-FER', nombre: 'HOGO', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'ISARIA SP-BIO', nombre: 'ISARIA', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'JOKER ADJUVANTE-BIO', nombre: 'JOKER ADJUVANTE', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'METARHIZIUM-BIO', nombre: 'METARHIZIUM', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'MICORRIZA-BIO', nombre: 'MICORRIZA-NANORRIZHAENDO', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'PSEUDOMONAS CEPA-BAC10', nombre: 'PSEUDOMONA CEPA-BAC10', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'PSEUDOMONAS-BIO', nombre: 'PSEUDOMONAS', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'SERRATIA M. CEPA-BAC11', nombre: 'SERRATIA MARCENCENS CEPA-BAC11', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'SERRATIA MARCESCENS-BIO', nombre: 'SERRATIA MARCESCENS', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'TRICHO MIX-BIO', nombre: 'TRICHO MIX', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
    { codigo: 'TRICHODERMA-BIO', nombre: 'TRICHODERMA', linea: 'PRODUCTO BIOLOGICO', unidad: 'L' },
  ];

  for (const p of productos) {
    // Buscar tipo por linea exacta, fallback a AGROQUIMICOS
    const tipoId = tipoByNombre[p.linea] ?? tipoByNombre['AGROQUIMICOS'] ?? 1;

    await executeRun(
      `INSERT OR IGNORE INTO productos (id, codigo, nombre, tipo_producto_id)
       VALUES (?, ?, ?, ?)`,
      [uuid(), p.codigo, p.nombre, tipoId]
    );
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