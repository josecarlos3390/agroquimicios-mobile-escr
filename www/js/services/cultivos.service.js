// www/js/services/cultivos.service.js
import * as repo from '../repositories/cultivos.repo.js';

export async function listarCultivos(empresaId) {
  return await repo.getCultivos(empresaId);
}

export const guardarCultivo = repo.saveCultivo;
export const eliminarCultivo = repo.deleteCultivo;