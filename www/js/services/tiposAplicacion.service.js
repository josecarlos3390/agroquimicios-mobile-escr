import {
  getTiposAplicacion,
  createTipoAplicacion,
  updateTipoAplicacion,
  deleteTipoAplicacion
} from '../repositories/tiposAplicacion.repo.js';

export async function listarTiposAplicacion(empresaId) {
  return await getTiposAplicacion(empresaId);
}

export async function crearTipoAplicacion(nombre, empresaId) {
  if (!nombre || !empresaId) throw new Error('El nombre y empresa son obligatorios');
  return await createTipoAplicacion(nombre, empresaId);
}

export async function actualizarTipoAplicacion(id, nombre) {
  if (!nombre) throw new Error('El nombre es obligatorio');
  return await updateTipoAplicacion(id, nombre);
}

export async function eliminarTipoAplicacion(id) {
  return await deleteTipoAplicacion(id);
}