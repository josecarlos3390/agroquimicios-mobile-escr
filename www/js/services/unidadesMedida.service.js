import {
  getUnidadesMedida,
  createUnidadMedida,
  updateUnidadMedida,
  deleteUnidadMedida
} from '../repositories/unidadesMedida.repo.js';
import { getUnidadesByProducto } from '../repositories/productosUnidades.repo.js';

export async function listarUnidadesMedida() {
  return await getUnidadesMedida();
}

export async function listarUnidadesByProducto(productoId) {
  if (!productoId) throw new Error('productoId es requerido');
  return await getUnidadesByProducto(productoId);
}

export async function crearUnidadMedida(data) {
  if (!data.codigo || !data.nombre) throw new Error('Código y nombre son obligatorios');
  return await createUnidadMedida(data);
}

export async function actualizarUnidadMedida(id, data) {
  if (!data.codigo || !data.nombre) throw new Error('Código y nombre son obligatorios');
  return await updateUnidadMedida(id, data);
}

export async function eliminarUnidadMedida(id) {
  return await deleteUnidadMedida(id);
}