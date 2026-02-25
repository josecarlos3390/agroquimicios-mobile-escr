import {
  getLotesBySector,
  insertLote,
  updateLote,
  deleteLote
} from '../repositories/lotes.repo.js';

export async function listarLotesPorSector(sectorId) {
  return await getLotesBySector(sectorId);
}

export async function guardarLote(lote) {
  if (lote.id) {
    return await updateLote(lote);
  }
  return await insertLote(lote);
}

export async function eliminarLote(id) {
  return await deleteLote(id);
}
