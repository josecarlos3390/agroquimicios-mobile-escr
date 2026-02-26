// services/caudales.service.js
import {
  getCaudales,
  createCaudal,
  updateCaudal,
  deleteCaudal
} from '../repositories/caudales.repo.js';

export async function listarCaudales() {
  return await getCaudales();
}

export async function guardarCaudal(caudal) {
  if (caudal.id) {
    await updateCaudal(caudal.id, caudal);
  } else {
    await createCaudal(caudal);
  }
}

export async function eliminarCaudal(id) {
  await deleteCaudal(id);
}