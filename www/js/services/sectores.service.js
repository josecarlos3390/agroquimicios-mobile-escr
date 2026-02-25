// www/js/services/sectores.service.js
import {
  getSectoresByEmpresa,
  createSector,
  updateSector,
  deleteSector
} from '../repositories/sectores.repo.js';

export async function listarSectores(empresaId) {
  return await getSectoresByEmpresa(empresaId);
}

export async function guardarSector(sector) {
  if (sector.id) {
    await updateSector(sector.id, sector);
  } else {
    await createSector(sector);
  }
}

export async function eliminarSector(id) {
  await deleteSector(id);
}
