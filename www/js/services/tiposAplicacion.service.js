import {
  getTiposAplicacion,
  createTipoAplicacion,
  updateTipoAplicacion,
  deleteTipoAplicacion
} from '../repositories/tiposAplicacion.repo.js';

export async function listarTiposAplicacion() {
  return await getTiposAplicacion();
}

export async function crearTipoAplicacion(nombre) {
  if (!nombre) throw new Error('El nombre es obligatorio');
  return await createTipoAplicacion(nombre);
}

export async function actualizarTipoAplicacion(id, nombre) {
  if (!nombre) throw new Error('El nombre es obligatorio');
  return await updateTipoAplicacion(id, nombre);
}

export async function eliminarTipoAplicacion(id) {
  return await deleteTipoAplicacion(id);
}