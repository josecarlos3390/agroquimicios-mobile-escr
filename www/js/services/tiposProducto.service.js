import {
  getTiposProducto,
  getTipoProductoById,
  createTipoProducto
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
