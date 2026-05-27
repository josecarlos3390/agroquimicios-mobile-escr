import {
  insertarCefoCab,
  insertarCefoDetalle,
  listarCefos,
  obtenerCefoPorId,
  actualizarCefoCab,
  eliminarCefo,
} from '../repositories/cefo.repo.js';
import { getEmpresaActiva } from './empresas.service.js';
import { reservarNumeroSecuencial } from '../db/sqlite.js';
import { uuid } from '../utils/uuid.js';

export async function getCefos() {
  const empresa = getEmpresaActiva();
  if (!empresa) throw new Error('No hay empresa activa');
  return listarCefos(empresa.id);
}

export async function getCefo(id) {
  return obtenerCefoPorId(id);
}

export async function borrarCefo(id) {
  return eliminarCefo(id);
}

export async function crearCefoCabecera(datos) {
  const empresa = getEmpresaActiva();
  if (!empresa) throw new Error('No hay empresa activa');

  const nroCfo = datos.nroCfoRecib?.trim().toUpperCase();
  if (!nroCfo) throw new Error('El número de CFO es obligatorio');

  const secuencial = await reservarNumeroSecuencial('cefo_cab');
  const numeroCompleto = `CEFO-${String(secuencial).padStart(4, '0')}`;
  const id = uuid();

  const fecha = datos.fechaRecep || null;
  const placa = datos.placa?.trim().toUpperCase() || '';
  const chofer = datos.chofer?.trim().toUpperCase() || '';
  const observaciones = datos.observaciones?.trim() || '';

  await insertarCefoCab(id, empresa.id, secuencial, numeroCompleto, nroCfo, fecha, placa, chofer, observaciones);
  return { id, numeroCompleto };
}

export async function actualizarCefoCabecera(id, datos) {
  const nroCfo = datos.nroCfoRecib?.trim().toUpperCase();
  if (!nroCfo) throw new Error('El número de CFO es obligatorio');

  const fecha = datos.fechaRecep || null;
  const placa = datos.placa?.trim().toUpperCase() || '';
  const chofer = datos.chofer?.trim().toUpperCase() || '';
  const observaciones = datos.observaciones?.trim() || '';

  await actualizarCefoCab(id, nroCfo, fecha, placa, chofer, observaciones);
}

export async function importarLineasCefo(cefoId, filas) {
  let creados = 0;
  for (const f of filas) {
    await insertarCefoDetalle(
      cefoId,
      f.especie || '',
      f.faja || null,
      f.nro_arbol || '',
      f.seccion || '',
      f.diamayor || null,
      f.diamenor || null,
      f.largo || null,
      f.volumen || null
    );
    creados++;
  }
  return { creados };
}
