// www/js/services/caudales.service.js
import { getCaudales } from '../repositories/caudales.repo.js';

export async function listarCaudales() {
  return await getCaudales();
}