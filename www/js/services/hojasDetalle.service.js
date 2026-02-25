import { uuid } from '../utils/uuid.js';
import { createHojaDetalle, getNextLineaByHoja } from '../repositories/hojasDetalle.repo.js';
import { getHojaCabById } from '../repositories/hojasCab.repo.js';
import { getProductoById } from '../repositories/productos.repo.js';

export async function agregarDetalleHoja(data) {

  if (!data.hoja_id) {
    throw new Error('Hoja no válida');
  }

  if (!data.producto_id) {
    throw new Error('Debe seleccionar un producto');
  }

  if (!data.cantidad || data.cantidad <= 0) {
    throw new Error('Cantidad inválida');
  }

  // 1️⃣ obtener cabecera
  const hoja = await getHojaCabById(data.hoja_id);

  if (!hoja) {
    throw new Error('No existe la cabecera');
  }

  if (!hoja.cantidad_hectareas || hoja.cantidad_hectareas <= 0) {
    throw new Error('La hoja no tiene hectáreas válidas');
  }

  // 2️⃣ obtener producto
  const producto = await getProductoById(data.producto_id);

  if (!producto) {
    throw new Error('Producto no encontrado');
  }

  // 3️⃣ calcular línea
  const linea = await getNextLineaByHoja(data.hoja_id);

  // 4️⃣ calcular dosis
  const dosis = data.cantidad / hoja.cantidad_hectareas;
  // 5️⃣ guardar detalle
  await createHojaDetalle({
    id: uuid(),
    hoja_id: data.hoja_id,
    linea,
    producto_id: producto.id,
    producto_codigo: producto.codigo,
    producto_nombre: producto.nombre,
    cantidad: data.cantidad,
    unidad_medida_id: data.unidad_medida_id,
    dosis
  });

  return true;
}
