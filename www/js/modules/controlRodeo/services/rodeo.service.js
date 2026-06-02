import { uuid } from '../../../utils/uuid.js';
import { getModeloDispositivo } from '../../../utils/device.js';
import {
  createRodeoCab,
  createRodeoDetalle,
  getRodeos,
  getRodeoById,
  getRodeoDetalleByCabId,
  deleteRodeo,
  updateEstadoRodeo,
  getNextNumeroSecuencial,
} from '../repositories/rodeo.repo.js';

export async function crearRodeo(data, detalle) {
  if (!data.fecha) throw new Error('La fecha es obligatoria');

  const id = uuid();
  const dispositivo = await getModeloDispositivo({ maxLength: 8, fallback: 'DISP' });
  const secuencial = await getNextNumeroSecuencial();
  const corr = String(secuencial).padStart(3, '0');
  const numero_completo = `RODEO-${dispositivo}-${corr}`;

  await createRodeoCab({ ...data, id, numero_secuencial: secuencial, numero_completo });

  if (detalle && detalle.length > 0) {
    await createRodeoDetalle(id, detalle);
  }

  return id;
}

export async function listarRodeos(empresaId) {
  return await getRodeos(empresaId);
}

export async function obtenerRodeo(id) {
  const cab = await getRodeoById(id);
  if (!cab) return null;
  const det = await getRodeoDetalleByCabId(id);
  return { ...cab, detalle: det };
}

export async function eliminarRodeo(id) {
  await deleteRodeo(id);
}

export async function actualizarEstadoRodeo(id, estado) {
  await updateEstadoRodeo(id, estado);
}

export function procesarExcelRodeo(rows) {
  // rows: array de objetos con las columnas del Excel
  // Mapear columnas del Excel a nuestro schema
  const headersEsperados = ['Nro rodeo', 'X Coord', 'Y Coord', 'Especie', 'Faja', 'Nro arbol', 'seccion', 'D1 (M)', 'D2 (M)', 'Largo (M)', 'Vol (M3)', 'Para Transporte'];

  const detalle = rows.map(r => ({
    nro_rodeo: String(r['Nro rodeo'] ?? ''),
    x_coord: parseFloat(r['X Coord']) || null,
    y_coord: parseFloat(r['Y Coord']) || null,
    especie: String(r['Especie'] ?? ''),
    faja: String(r['Faja'] ?? ''),
    nro_arbol: String(r['Nro arbol'] ?? ''),
    seccion: String(r['seccion'] ?? ''),
    d1: parseFloat(r['D1 (M)']) || null,
    d2: parseFloat(r['D2 (M)']) || null,
    largo: parseFloat(r['Largo (M)']) || null,
    volumen: parseFloat(r['Vol (M3)']) || null,
    para_transporte: String(r['Para Transporte'] ?? ''),
  }));

  return detalle;
}
