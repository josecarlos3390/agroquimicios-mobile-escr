import {
  getProductos,
  getProductosActivos,
  getProductoById,
  createProducto,
  desactivarProducto,
  updateProducto
} from '../repositories/productos.repo.js';

import { addUnidadToProducto } from '../repositories/productosUnidades.repo.js';

import { uuid } from '../utils/uuid.js';

export async function listarProductos() {
  return await getProductos();
}

export async function listarProductosActivos() {
  return await getProductosActivos();
}

export async function obtenerProducto(id) {
  return await getProductoById(id);
}

export async function crearProducto(data) {
  if (!data.codigo || !data.nombre || !data.tipo_producto_id) {
    throw new Error('Código, nombre y tipo de producto son obligatorios');
  }

  const producto = {
    id: uuid(),
    codigo: data.codigo,
    nombre: data.nombre,
    tipo_producto_id: data.tipo_producto_id,
    activo: 1
  };

  await createProducto(producto);
  return producto.id;
}

export async function eliminarProducto(id) {
  return await desactivarProducto(id);
}

export async function asignarUnidadesAProducto(productoId, unidades) {
  if (!unidades || unidades.length === 0) {
    throw new Error('Debe asignar al menos una unidad');
  }

  let defaultSet = false;

  for (const u of unidades) {
    const esDefault = u.es_default && !defaultSet ? 1 : 0;
    if (esDefault) defaultSet = true;

    await addUnidadToProducto(
      productoId,
      u.unidad_medida_id,
      esDefault
    );
  }
}

export async function actualizarProducto(id, data) {
  return await updateProducto(id, data);
}