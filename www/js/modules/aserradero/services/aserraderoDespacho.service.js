import {
  insertarDespachoCab,
  insertarDespachoDetalle,
  listarDespachos,
  obtenerDespachoPorId,
  actualizarDespachoCab,
  eliminarDespacho,
  eliminarDespachoDetalle,
  confirmarDespacho,
  marcarRecepcionDetallesDespachados,
  obtenerDatosExportacionDespacho,
} from '../repositories/aserraderoDespacho.repo.js';
import {
  buscarArbolesRecepcionDisponibles,
} from '../repositories/aserraderoRecepcion.repo.js';
import { getEmpresaActiva } from '../../../services/empresas.service.js';
import { reservarNumeroSecuencial } from '../../../db/sqlite.js';
import { uuid } from '../../../utils/uuid.js';

export async function getDespachos() {
  const empresa = getEmpresaActiva();
  if (!empresa) throw new Error('No hay empresa activa');
  return listarDespachos(empresa.id);
}

export async function getDespacho(id) {
  return obtenerDespachoPorId(id);
}

export async function borrarDespacho(id) {
  const actual = await obtenerDespachoPorId(id);
  if (actual && actual.cabecera.estado === 'CONFIRMADO') {
    throw new Error('No se puede eliminar un despacho confirmado');
  }
  await eliminarDespacho(id);
}

export async function confirmarDespachoCab(id) {
  const actual = await obtenerDespachoPorId(id);
  if (!actual) throw new Error('Despacho no encontrado');
  if (actual.cabecera.estado === 'CONFIRMADO') throw new Error('El despacho ya está confirmado');
  await confirmarDespacho(id);
  await marcarRecepcionDetallesDespachados(id);
}

export async function buscarArboles(filtros) {
  const empresa = getEmpresaActiva();
  if (!empresa) throw new Error('No hay empresa activa');
  return buscarArbolesRecepcionDisponibles(empresa.id, filtros);
}

export async function getDatosExportacionDespacho(id) {
  return obtenerDatosExportacionDespacho(id);
}

export async function crearDespachoCabecera(datos) {
  const empresa = getEmpresaActiva();
  if (!empresa) throw new Error('No hay empresa activa');

  const nroDespacho = datos.nroDespacho?.trim().toUpperCase();
  if (!nroDespacho) throw new Error('El número de despacho es obligatorio');

  const secuencial = await reservarNumeroSecuencial('aserradero_despacho_cab');
  const numeroCompleto = `ADES-${String(secuencial).padStart(4, '0')}`;
  const id = uuid();

  const fecha = datos.fechaDespacho || null;
  const placa = datos.placa?.trim().toUpperCase() || '';
  const chofer = datos.chofer?.trim().toUpperCase() || '';
  const observaciones = datos.observaciones?.trim() || '';

  await insertarDespachoCab(id, empresa.id, secuencial, numeroCompleto, nroDespacho, fecha, placa, chofer, observaciones);
  return { id, numeroCompleto };
}

export async function actualizarDespachoCabecera(id, datos) {
  const actual = await obtenerDespachoPorId(id);
  if (actual && actual.cabecera.estado === 'CONFIRMADO') {
    throw new Error('No se puede editar un despacho confirmado');
  }

  const nroDespacho = datos.nroDespacho?.trim().toUpperCase();
  if (!nroDespacho) throw new Error('El número de despacho es obligatorio');

  const fecha = datos.fechaDespacho || null;
  const placa = datos.placa?.trim().toUpperCase() || '';
  const chofer = datos.chofer?.trim().toUpperCase() || '';
  const observaciones = datos.observaciones?.trim() || '';

  await actualizarDespachoCab(id, nroDespacho, fecha, placa, chofer, observaciones);
}

export async function quitarLineaDespacho(despachoId, despachoDetalleId, recepcionDetalleId) {
  if (!despachoDetalleId) {
    throw new Error('Faltan datos para quitar la línea');
  }
  const actual = await obtenerDespachoPorId(despachoId);
  if (actual && actual.cabecera.estado === 'CONFIRMADO') {
    throw new Error('No se puede quitar árboles de un despacho confirmado');
  }
  await eliminarDespachoDetalle(despachoDetalleId);
}

export async function agregarLineasDespacho(despachoId, lineas) {
  const actual = await obtenerDespachoPorId(despachoId);
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
    await insertarDespachoDetalle(
      despachoId,
      linea.recepcionDetalleId,
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
