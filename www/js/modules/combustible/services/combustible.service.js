import { uuid } from '../../../utils/uuid.js';
import { getModeloDispositivo } from '../../../utils/device.js';
import {
  createAsignacion,
  getAsignaciones,
  getAsignacionById,
  getAsignacionesByIds,
  deleteAsignacion,
  updateAsignacion,
  getNextNumeroSecuencial,
} from '../repositories/combustible.repo.js';

export async function crearAsignacionCombustible(data) {
  if (!data.fecha) throw new Error('La fecha es obligatoria');
  if (!data.placa_codigo) throw new Error('La placa o código es obligatorio');
  if (!data.persona_recibe) throw new Error('La persona que recibe es obligatoria');
  if (!data.persona_entrega) throw new Error('La persona que entrega es obligatoria');
  if (!data.cantidad || parseFloat(data.cantidad) <= 0) throw new Error('La cantidad debe ser mayor a 0');
  if (!data.tipo_combustible) throw new Error('El tipo de combustible es obligatorio');

  const id = uuid();
  const dispositivo = await getModeloDispositivo({ maxLength: 8, fallback: 'DISP' });
  const secuencial = await getNextNumeroSecuencial();
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  const corr = String(secuencial).padStart(3, '0');
  const numero_completo = `COMB-${dispositivo}-${mes}${dia}${corr}`;

  await createAsignacion({ ...data, id, numero_secuencial: secuencial, numero_completo });
  return id;
}

export async function listarAsignaciones(empresaId = null) {
  return await getAsignaciones(empresaId);
}

export async function obtenerAsignacion(id) {
  return await getAsignacionById(id);
}

export async function obtenerAsignacionesPorIds(ids) {
  return await getAsignacionesByIds(ids);
}

export async function eliminarAsignacion(id) {
  await deleteAsignacion(id);
}

export async function actualizarAsignacionCombustible(id, data) {
  if (!data.fecha) throw new Error('La fecha es obligatoria');
  if (!data.placa_codigo) throw new Error('La placa o código es obligatorio');
  if (!data.persona_recibe) throw new Error('La persona que recibe es obligatoria');
  if (!data.persona_entrega) throw new Error('La persona que entrega es obligatoria');
  if (!data.cantidad || parseFloat(data.cantidad) <= 0) throw new Error('La cantidad debe ser mayor a 0');
  if (!data.tipo_combustible) throw new Error('El tipo de combustible es obligatorio');

  await updateAsignacion(id, data);
}

export function aplicarMarcaAgua(imagenBase64, textoMarca) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxW = 1200;
      let w = img.width;
      let h = img.height;
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      ctx.save();
      ctx.font = `bold ${Math.max(20, Math.round(w / 20))}px sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = 2;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const cx = w / 2;
      const cy = h / 2;
      const angle = -25 * Math.PI / 180;
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      ctx.strokeText(textoMarca, 0, 0);
      ctx.fillText(textoMarca, 0, 0);
      ctx.restore();

      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    img.src = imagenBase64;
  });
}
