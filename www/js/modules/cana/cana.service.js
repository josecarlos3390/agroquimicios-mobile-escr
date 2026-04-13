import {
  createCanaCab, getNextNumeroSecuencialCana, getCanaCabs,
  getCanaCabById, deleteCanaCab, updateEstadoCanaCab,
  insertPlantacion, getPlantacionesByCab, deletePlantacion,
  insertCorte, getCortesByPlantacion, deleteCorte,
  insertInsumo, getInsumosByCab, deleteInsumosByCab,
} from './cana.repo.js';
import { executeQuery } from '../../db/sqlite.js';
import { uuid } from '../../utils/uuid.js';

/* =========================================================
   HELPER: modelo del dispositivo (igual que agroquímicos)
========================================================= */
async function getModeloDispositivo() {
  try {
    if (window.Capacitor?.Plugins?.Device) {
      const info = await window.Capacitor.Plugins.Device.getInfo();
      return info.model.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
    }
    const ua    = navigator.userAgent;
    const match = ua.match(/\(.*?;\s*([^;)]+)\s*Build/);
    if (match?.[1]) {
      return match[1].trim().toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
    }
    return 'LOCAL';
  } catch {
    return 'LOCAL';
  }
}

/* =========================================================
   INSUMOS POR DEFECTO  (se pre-cargan al crear una nota)
   El orden aquí define cómo aparecen en el formulario.
========================================================= */
const INSUMOS_DEFAULT = [
  // ── Agroquímicos ──────────────────────────────────────
  { tipo: 'AGROQUIMICO', codigo: 'cana-fosfato-mono',  nombre: 'Fosfato Monoamónico',           unidad: 'KG', orden: 1 },
  { tipo: 'AGROQUIMICO', codigo: 'cana-thiametoxan',   nombre: 'Thiametoxan',                    unidad: 'GR', orden: 2 },
  { tipo: 'AGROQUIMICO', codigo: 'cana-fipronil',      nombre: 'Fipronil',                       unidad: 'GR', orden: 3 },
  { tipo: 'AGROQUIMICO', codigo: 'cana-pyracloepox',   nombre: 'Pyraclostrobin + Epoxiconazole', unidad: 'LT', orden: 4 },
  { tipo: 'AGROQUIMICO', codigo: 'cana-nerthus',       nombre: 'Nerthus 11-56-00',               unidad: 'LT', orden: 5 },
  { tipo: 'AGROQUIMICO', codigo: 'cana-kinefol',       nombre: 'Kinefol (Folcol)',               unidad: 'LT', orden: 6 },
  { tipo: 'AGROQUIMICO', codigo: 'cana-agua',          nombre: 'Agua',                           unidad: 'LT', orden: 7 },
  // ── Biológicos ────────────────────────────────────────
  { tipo: 'BIOLOGICO', codigo: 'cana-bio-bact-cereal', nombre: 'Bacterias Cereales del Este',    unidad: 'LT', orden: 1 },
  { tipo: 'BIOLOGICO', codigo: 'cana-bio-hong-cereal', nombre: 'Hongos Cereales del Este',       unidad: 'LT', orden: 2 },
  { tipo: 'BIOLOGICO', codigo: 'cana-bio-bauveria',    nombre: 'Bauveria',                       unidad: 'LT', orden: 3 },
  { tipo: 'BIOLOGICO', codigo: 'cana-bio-isaria',      nombre: 'Isaria spp',                     unidad: 'LT', orden: 4 },
  { tipo: 'BIOLOGICO', codigo: 'cana-bio-metarh',      nombre: 'Metarhizium',                    unidad: 'LT', orden: 5 },
  { tipo: 'BIOLOGICO', codigo: 'cana-bio-tricho',      nombre: 'Trichoderma',                    unidad: 'LT', orden: 6 },
];

/* =========================================================
   CREAR NOTA COMPLETA
========================================================= */
export async function crearNotaCana(data) {
  const id               = uuid();
  const numeroSecuencial = await getNextNumeroSecuencialCana();

  const ahora  = new Date();
  const fecha  = ahora.toISOString().slice(0, 10).replace(/-/g, '');
  const hora   = String(ahora.getHours()).padStart(2, '0');
  const minuto = String(ahora.getMinutes()).padStart(2, '0');
  const corr   = String(numeroSecuencial).padStart(5, '0');
  const modelo = await getModeloDispositivo();

  const numeroCompleto = `CANA-${modelo}-${fecha}${hora}${minuto}${corr}`;

  const mes = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
               'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE']
               [new Date(data.fecha_inicio + 'T00:00:00').getMonth()];

  await createCanaCab({
    id, numero_secuencial: numeroSecuencial, numero_completo: numeroCompleto,
    dispositivo_id: modelo, campana: data.campana,
    empresa_id: data.empresa_id, tecnico_id: data.tecnico_id ?? null,
    fecha_inicio: data.fecha_inicio, fecha_fin: data.fecha_fin ?? data.fecha_inicio,
    mes, observaciones: data.observaciones ?? null,
  });

  // Insertar insumos por defecto buscando el producto_id en la BD
  const productos = await executeQuery(
    'SELECT id, codigo, nombre FROM productos WHERE codigo LIKE "CANA-%"'
  );
  const productoByCode = Object.fromEntries(productos.map(p => [p.codigo.toLowerCase(), p]));

  for (const ins of INSUMOS_DEFAULT) {
    const prod = productoByCode[ins.codigo];
    await insertInsumo({
      cab_id:         id,
      tipo:           ins.tipo,
      producto_id:    prod?.id ?? null,
      producto_nombre: prod?.nombre ?? ins.nombre,
      cantidad:       null,
      unidad:         ins.unidad,
      orden:          ins.orden,
    });
  }

  return id;
}

/* =========================================================
   LISTAR NOTAS
========================================================= */
export async function listarNotasCana(estado = null) {
  return await getCanaCabs(estado);
}

/* =========================================================
   ELIMINAR NOTA
========================================================= */
export async function eliminarNotaCana(id) {
  return await deleteCanaCab(id);
}

/* =========================================================
   OBTENER NOTA COMPLETA (cab + plantaciones + cortes + insumos)
========================================================= */
export async function getNotaCanaCompleta(id) {
  const cab         = await getCanaCabById(id);
  if (!cab) return null;
  const plantaciones = await getPlantacionesByCab(id);
  for (const p of plantaciones) {
    p.cortes = await getCortesByPlantacion(p.id);
  }
  const insumos = await getInsumosByCab(id);
  return { cab, plantaciones, insumos };
}

/* =========================================================
   GUARDAR PLANTACIÓN + CORTES
========================================================= */
export async function guardarPlantacion(plantacion) {
  const pId = await insertPlantacion(plantacion);
  if (plantacion.cortes?.length) {
    for (let i = 0; i < plantacion.cortes.length; i++) {
      await insertCorte({ ...plantacion.cortes[i], plantacion_id: pId, orden: i });
    }
  }
  return pId;
}

export async function eliminarPlantacion(id) {
  return await deletePlantacion(id);
}

export async function eliminarCorte(id) {
  return await deleteCorte(id);
}

/* =========================================================
   GUARDAR INSUMOS (reemplaza todos los de la nota)
========================================================= */
export async function guardarInsumos(cab_id, insumos) {
  await deleteInsumosByCab(cab_id);
  for (let i = 0; i < insumos.length; i++) {
    await insertInsumo({ ...insumos[i], cab_id, orden: i });
  }
}

/* =========================================================
   MARCAR EXPORTADO
========================================================= */
export async function marcarExportadoCana(ids) {
  for (const id of ids) {
    await updateEstadoCanaCab(id, 'EXPORTADO');
  }
}

export { getInsumosByCab, getPlantacionesByCab, getCortesByPlantacion, insertCorte, deleteCorte };
