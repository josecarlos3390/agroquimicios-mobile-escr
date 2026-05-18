import {
  getTiposProducto,
  getTipoProductoById,
  createTipoProducto,
  updateTipoProducto,
  deleteTipoProducto
} from '../repositories/tiposProducto.repo.js';

export async function listarTiposProducto() {
  return await getTiposProducto();
}

export async function obtenerTipoProducto(id) {
  return await getTipoProductoById(id);
}

export async function crearTipoProducto(data) {
  if (!data.nombre || !data.cuenta_contable) {
    throw new Error('Nombre y cuenta contable son obligatorios');
  }

  return await createTipoProducto(data);
}

export async function actualizarTipoProducto(id, data) {
  if (!id) throw new Error('ID requerido');
  if (!data.nombre || !data.cuenta_contable) {
    throw new Error('Nombre y cuenta contable son obligatorios');
  }

  return await updateTipoProducto(id, data);
}

export async function eliminarTipoProducto(id) {
  if (!id) throw new Error('ID requerido');
  return await deleteTipoProducto(id);
}
