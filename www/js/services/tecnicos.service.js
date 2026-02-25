// services/tecnicos.service.js
import {
  getTecnicos,
  createTecnico,
  updateTecnico,
  deleteTecnico
} from '../repositories/tecnicos.repo.js';

export async function listarTecnicos() {
  return await getTecnicos();
}

export async function guardarTecnico(tecnico) {
  if (tecnico.id) {
    await updateTecnico(tecnico.id, tecnico);
  } else {
    await createTecnico(tecnico);
  }
}

export async function eliminarTecnico(id) {
  await deleteTecnico(id);
}
