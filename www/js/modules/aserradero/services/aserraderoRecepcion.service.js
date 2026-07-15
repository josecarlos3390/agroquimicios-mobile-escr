import {
  insertarRecepcionCab,
  insertarRecepcionDetalle,
  listarRecepciones,
  obtenerRecepcionPorId,
  actualizarRecepcionCab,
  eliminarRecepcion,
  eliminarRecepcionDetalle,
  buscarArbolesDisponibles,
  confirmarRecepcion,
  marcarArbolesRecepcionadosPorRecepcion,
  desmarcarArbolesRecepcionadosPorRecepcion,
} from '../repositories/aserraderoRecepcion.repo.js';
import { getEmpresaActiva } from '../../../services/empresas.service.js';
import { reservarNumeroSecuencial } from '../../../db/sqlite.js';
import { uuid } from '../../../utils/uuid.js';

export async function getRecepciones() {
  const empresa = getEmpresaActiva();
  if (!empresa) throw new Error('No hay empresa activa');
  return listarRecepciones(empresa.id);
}

export async function getRecepcion(id) {
  return obtenerRecepcionPorId(id);
}

export async function borrarRecepcion(id) {
  const actual = await obtenerRecepcionPorId(id);
  if (actual && actual.cabecera.estado === 'CONFIRMADO') {
    throw new Error('No se puede eliminar una recepción confirmada');
  }
  await eliminarRecepcion(id);
  await desmarcarArbolesRecepcionadosPorRecepcion(id);
}

export async function confirmarRecepcionCab(id) {
  const actual = await obtenerRecepcionPorId(id);
  if (!actual) throw new Error('Recepción no encontrada');
  if (actual.cabecera.estado === 'CONFIRMADO') throw new Error('La recepción ya está confirmada');
  await confirmarRecepcion(id);
  await marcarArbolesRecepcionadosPorRecepcion(id);
}

export async function buscarArboles(filtros) {
  const empresa = getEmpresaActiva();
  if (!empresa) throw new Error('No hay empresa activa');
  return buscarArbolesDisponibles(empresa.id, filtros);
}

export async function crearRecepcionCabecera(datos) {
  const empresa = getEmpresaActiva();
  if (!empresa) throw new Error('No hay empresa activa');

  const nroRecepcion = datos.nroRecepcion?.trim().toUpperCase();
  if (!nroRecepcion) throw new Error('El número de recepción es obligatorio');

  const secuencial = await reservarNumeroSecuencial('aserradero_recepcion_cab');
  const numeroCompleto = `AREC-${String(secuencial).padStart(4, '0')}`;
  const id = uuid();

  const fecha = datos.fechaRecepcion || null;
  const placa = datos.placa?.trim().toUpperCase() || '';
  const chofer = datos.chofer?.trim().toUpperCase() || '';
  const observaciones = datos.observaciones?.trim() || '';

  await insertarRecepcionCab(id, empresa.id, secuencial, numeroCompleto, nroRecepcion, fecha, placa, chofer, observaciones);
  return { id, numeroCompleto };
}

export async function actualizarRecepcionCabecera(id, datos) {
  const actual = await obtenerRecepcionPorId(id);
  if (actual && actual.cabecera.estado === 'CONFIRMADO') {
    throw new Error('No se puede editar una recepción confirmada');
  }

  const nroRecepcion = datos.nroRecepcion?.trim().toUpperCase();
  if (!nroRecepcion) throw new Error('El número de recepción es obligatorio');

  const fecha = datos.fechaRecepcion || null;
  const placa = datos.placa?.trim().toUpperCase() || '';
  const chofer = datos.chofer?.trim().toUpperCase() || '';
  const observaciones = datos.observaciones?.trim() || '';

  await actualizarRecepcionCab(id, nroRecepcion, fecha, placa, chofer, observaciones);
}

export async function quitarLineaRecepcion(recepcionId, recepcionDetalleId, rodeoDetalleId) {
  if (!recepcionDetalleId || !rodeoDetalleId) {
    throw new Error('Faltan datos para quitar la línea');
  }
  const actual = await obtenerRecepcionPorId(recepcionId);
  if (actual && actual.cabecera.estado === 'CONFIRMADO') {
    throw new Error('No se puede quitar árboles de una recepción confirmada');
  }
  await eliminarRecepcionDetalle(recepcionDetalleId, rodeoDetalleId);
}

export async function agregarLineasRecepcion(recepcionId, lineas) {
  const actual = await obtenerRecepcionPorId(recepcionId);
  if (actual && actual.cabecera.estado === 'CONFIRMADO') {
    throw new Error('No se puede agregar árboles a una recepción confirmada');
  }
  const empresa = getEmpresaActiva();
  if (!empresa) throw new Error('No hay empresa activa');

  if (!lineas || lineas.length === 0) {
    throw new Error('Debe agregar al menos una línea');
  }

  let creados = 0;
  for (const linea of lineas) {
    await insertarRecepcionDetalle(
      recepcionId,
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
