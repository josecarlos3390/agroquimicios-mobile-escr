import { uuid } from '../../../utils/uuid.js';
import { getModeloDispositivo } from '../../../utils/device.js';
import {
  createGuia,
  createCosechaMecanizada,
  getGuias,
  getGuiaById,
  getCosechaMecanizadaByGuiaId,
  deleteGuia,
  updateGuia,
  deleteCosechaMecanizadaByGuiaId,
  getNextNumeroSecuencial,
} from '../repositories/guiaTransporteCana.repo.js';

export async function crearGuiaTransporte(data) {
  if (!data.fecha) throw new Error('La fecha es obligatoria');
  if (!data.boletario?.trim()) throw new Error('El nombre del boletario es obligatorio');

  const id = uuid();
  const dispositivo = await getModeloDispositivo({ maxLength: 8, fallback: 'DISP' });
  const secuencial = await getNextNumeroSecuencial();
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  const corr = String(secuencial).padStart(3, '0');
  const numero_completo = `GTC-${dispositivo}-${mes}${dia}${corr}`;

  await createGuia({ ...data, id, numero_secuencial: secuencial, numero_completo, dispositivo_id: dispositivo });

  if (data.cosechas_mecanizadas && data.cosechas_mecanizadas.length > 0) {
    await createCosechaMecanizada(id, data.cosechas_mecanizadas);
  }

  return id;
}

export async function listarGuias(empresaId = null) {
  return await getGuias(empresaId);
}

export async function obtenerGuia(id) {
  const cab = await getGuiaById(id);
  if (!cab) return null;
  const mec = await getCosechaMecanizadaByGuiaId(id);
  return { ...cab, cosechas_mecanizadas: mec };
}

export async function eliminarGuia(id) {
  await deleteGuia(id);
}

export async function actualizarGuiaTransporte(id, data) {
  if (!data.fecha) throw new Error('La fecha es obligatoria');
  if (!data.boletario?.trim()) throw new Error('El nombre del boletario es obligatorio');

  await updateGuia(id, data);

  if (data.cosechas_mecanizadas) {
    await deleteCosechaMecanizadaByGuiaId(id);
    if (data.cosechas_mecanizadas.length > 0) {
      await createCosechaMecanizada(id, data.cosechas_mecanizadas);
    }
  }
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
