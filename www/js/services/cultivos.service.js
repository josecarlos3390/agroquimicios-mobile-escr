// www/js/services/empresas.service.js
import * as repo from '../repositories/cultivos.repo.js';

export const listarCultivos = repo.getCultivos;
export const guardarCultivo = repo.saveCultivo;
export const eliminarCultivo = repo.deleteCultivo;