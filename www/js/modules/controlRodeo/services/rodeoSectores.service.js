import {
  getRodeoSectores,
  insertRodeoSector,
  updateRodeoSector,
  deleteRodeoSector,
} from '../repositories/rodeoSectores.repo.js';

export async function listarRodeoSectores(empresaId) {
  return await getRodeoSectores(empresaId);
}

export async function guardarRodeoSector(sector) {
  if (!sector.nombre?.trim()) throw new Error('El nombre del sector es obligatorio');
  if (sector.id) {
    return await updateRodeoSector(sector);
  }
  return await insertRodeoSector(sector);
}

export async function eliminarRodeoSector(id) {
  return await deleteRodeoSector(id);
}
