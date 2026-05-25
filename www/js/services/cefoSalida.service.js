import {
  insertarSalidaCab,
  insertarSalidaDetalle,
  marcarDetalleDespachado,
  listarSalidas,
  obtenerSalidaPorId,
  eliminarSalida,
  buscarArbolesDisponibles,
} from '../repositories/cefoSalida.repo.js';
import { getEmpresaActiva } from './empresas.service.js';
import { reservarNumeroSecuencial } from '../db/sqlite.js';
import { uuid } from '../utils/uuid.js';

export async function getSalidas() {
  const empresa = getEmpresaActiva();
  if (!empresa) throw new Error('No hay empresa activa');
  return listarSalidas(empresa.id);
}

export async function getSalida(id) {
  return obtenerSalidaPorId(id);
}

export async function borrarSalida(id) {
  return eliminarSalida(id);
}

export async function buscarArboles(termino) {
  const empresa = getEmpresaActiva();
  if (!empresa) throw new Error('No hay empresa activa');
  return buscarArbolesDisponibles(empresa.id, termino);
}

export async function crearSalidaCabecera(datos) {
  const empresa = getEmpresaActiva();
  if (!empresa) throw new Error('No hay empresa activa');

  const nroCfoDespacho = datos.nroCfoDespacho?.trim().toUpperCase();
  if (!nroCfoDespacho) throw new Error('El número de CFO de despacho es obligatorio');

  const secuencial = await reservarNumeroSecuencial('cefo_salida_cab');
  const numeroCompleto = `DESP-${String(secuencial).padStart(4, '0')}`;
  const id = uuid();

  const fecha = datos.fechaDespacho || null;
  const placa = datos.placa?.trim().toUpperCase() || '';
  const chofer = datos.chofer?.trim().toUpperCase() || '';
  const observaciones = datos.observaciones?.trim() || '';

  await insertarSalidaCab(id, empresa.id, secuencial, numeroCompleto, nroCfoDespacho, fecha, placa, chofer, observaciones);
  return { id, numeroCompleto };
}

export async function agregarLineasSalida(salidaId, lineas) {
  const empresa = getEmpresaActiva();
  if (!empresa) throw new Error('No hay empresa activa');

  if (!lineas || lineas.length === 0) {
    throw new Error('Debe agregar al menos una línea');
  }

  let creados = 0;
  for (const linea of lineas) {
    await insertarSalidaDetalle(
      salidaId,
      linea.cefoDetalleId,
      linea.especie,
      linea.faja,
      linea.nroArbol,
      linea.seccion,
      linea.diamayor,
      linea.diamenor,
      linea.largo,
      linea.volumen
    );
    await marcarDetalleDespachado(linea.cefoDetalleId);
    creados++;
  }

  return { creados };
}
