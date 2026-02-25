import {
  obtenerVariedadesPorCultivo,
  insertarVariedad,
  actualizarVariedad,
  eliminarVariedad
} from '../repositories/variedades.repo.js';

export async function listarVariedades(cultivoId) {
  if (!cultivoId) return [];
  return await obtenerVariedadesPorCultivo(cultivoId);
}

export async function guardarVariedad(data) {
  if (data.id) {
    return actualizarVariedad(data);
  }
  return insertarVariedad(data);
}

export async function borrarVariedad(id) {
  return eliminarVariedad(id);
}

