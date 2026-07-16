import {
  insertarSalidaCab,
  insertarSalidaDetalle,
  listarSalidas,
  obtenerSalidaPorId,
  actualizarSalidaCab,
  eliminarSalida,
  eliminarSalidaDetalle,
  buscarArbolesDisponibles,
  confirmarSalida,
  marcarArbolesDespachadosPorSalida,
  desmarcarArbolesDespachadosPorSalida,
  obtenerDatosExportacionSalida,
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
  const actual = await obtenerSalidaPorId(id);
  if (actual && actual.cabecera.estado === 'CONFIRMADO') {
    throw new Error('No se puede eliminar un despacho confirmado');
  }
  await eliminarSalida(id);
  await desmarcarArbolesDespachadosPorSalida(id);
}

export async function confirmarSalidaCab(id) {
  const actual = await obtenerSalidaPorId(id);
  if (!actual) throw new Error('Despacho no encontrado');
  if (actual.cabecera.estado === 'CONFIRMADO') throw new Error('El despacho ya está confirmado');
  await confirmarSalida(id);
  await marcarArbolesDespachadosPorSalida(id);
}

export async function buscarArboles(filtros) {
  const empresa = getEmpresaActiva();
  if (!empresa) throw new Error('No hay empresa activa');
  return buscarArbolesDisponibles(empresa.id, filtros);
}

export async function getDatosExportacionSalida(id) {
  return obtenerDatosExportacionSalida(id);
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

export async function actualizarSalidaCabecera(id, datos) {
  const actual = await obtenerSalidaPorId(id);
  if (actual && actual.cabecera.estado === 'CONFIRMADO') {
    throw new Error('No se puede editar un despacho confirmado');
  }

  const nroCfoDespacho = datos.nroCfoDespacho?.trim().toUpperCase();
  if (!nroCfoDespacho) throw new Error('El número de CFO de despacho es obligatorio');

  const fecha = datos.fechaDespacho || null;
  const placa = datos.placa?.trim().toUpperCase() || '';
  const chofer = datos.chofer?.trim().toUpperCase() || '';
  const observaciones = datos.observaciones?.trim() || '';

  await actualizarSalidaCab(id, nroCfoDespacho, fecha, placa, chofer, observaciones);
}

export async function quitarLineaSalida(salidaId, salidaDetalleId, rodeoDetalleId) {
  if (!salidaDetalleId || !rodeoDetalleId) {
    throw new Error('Faltan datos para quitar la línea');
  }
  const actual = await obtenerSalidaPorId(salidaId);
  if (actual && actual.cabecera.estado === 'CONFIRMADO') {
    throw new Error('No se puede quitar árboles de un despacho confirmado');
  }
  await eliminarSalidaDetalle(salidaDetalleId, rodeoDetalleId);
}

export async function agregarLineasSalida(salidaId, lineas) {
  const actual = await obtenerSalidaPorId(salidaId);
  if (actual && actual.cabecera.estado === 'CONFIRMADO') {
    throw new Error('No se puede agregar árboles a un despacho confirmado');
  }
  const empresa = getEmpresaActiva();
  if (!empresa) throw new Error('No hay empresa activa');

  if (!lineas || lineas.length === 0) {
    throw new Error('Debe agregar al menos una línea');
  }

  let creados = 0;
  for (const linea of lineas) {
    await insertarSalidaDetalle(
      salidaId,
      linea.rodeoDetalleId,
      linea.especie,
      linea.faja,
      linea.nroArbol,
      linea.seccion,
      linea.diamayor,
      linea.diamenor,
      linea.largo,
      linea.volumen
    );
    creados++;
  }

  return { creados };
}
