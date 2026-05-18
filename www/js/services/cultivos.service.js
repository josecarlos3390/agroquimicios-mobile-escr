import {
  getCultivos,
  saveCultivo,
  deleteCultivo
} from '../repositories/cultivos.repo.js';

export async function listarCultivos(empresaId) {
  return await getCultivos(empresaId);
}

export async function guardarCultivo(c) {
  return await saveCultivo(c);
}

export async function eliminarCultivo(id) {
  return await deleteCultivo(id);
}