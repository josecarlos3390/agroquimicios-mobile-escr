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

export async function crearSalida(datos) {
  const empresa = getEmpresaActiva();
  if (!empresa) throw new Error('No hay empresa activa');

  const nroCfoDespacho = datos.nroCfoDespacho?.trim().toUpperCase();
  const fechaDespacho = datos.fechaDespacho || null;
  const placa = datos.placa?.trim().toUpperCase() || '';
  const chofer = datos.chofer?.trim().toUpperCase() || '';

  if (!nroCfoDespacho) {
    throw new Error('El número de CFO de despacho es obligatorio');
  }

  if (!datos.lineas || datos.lineas.length === 0) {
    throw new Error('Debe agregar al menos una línea');
  }

  const salidaId = uuid();

  await insertarSalidaCab(salidaId, empresa.id, nroCfoDespacho, fechaDespacho, placa, chofer);

  for (const linea of datos.lineas) {
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
  }

  return { id: salidaId };
}
