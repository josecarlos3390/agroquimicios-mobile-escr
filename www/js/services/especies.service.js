import {
  listarEspecies,
  obtenerEspeciePorId,
  insertarEspecie,
  actualizarEspecie,
  eliminarEspecie,
  obtenerUltimoCodigoEspecie,
} from '../repositories/especies.repo.js';
import { getEmpresaActiva } from './empresas.service.js';

export async function getEspecies() {
  const empresa = getEmpresaActiva();
  if (!empresa) throw new Error('No hay empresa activa');
  return listarEspecies(empresa.id);
}

export async function getEspecie(id) {
  return obtenerEspeciePorId(id);
}

function generarSiguienteCodigo(ultimoCodigo) {
  if (!ultimoCodigo) return 'ESP-0001';
  const match = ultimoCodigo.match(/ESP-(\d+)/);
  if (!match) return 'ESP-0001';
  const num = parseInt(match[1], 10) + 1;
  return `ESP-${String(num).padStart(4, '0')}`;
}

export async function crearEspecie(datos) {
  const empresa = getEmpresaActiva();
  if (!empresa) throw new Error('No hay empresa activa');

  const nombreComun = datos.nombreComun?.trim().toUpperCase();
  const nombreCientifico = datos.nombreCientifico?.trim() || '';

  if (!nombreComun) {
    throw new Error('El nombre común es obligatorio');
  }

  const ultimo = await obtenerUltimoCodigoEspecie(empresa.id);
  const codigo = generarSiguienteCodigo(ultimo);

  const result = await insertarEspecie(empresa.id, codigo, nombreComun, nombreCientifico);
  return { id: result.lastId, codigo };
}

export async function editarEspecie(id, datos) {
  const nombreComun = datos.nombreComun?.trim().toUpperCase();
  const nombreCientifico = datos.nombreCientifico?.trim() || '';

  if (!nombreComun) {
    throw new Error('El nombre común es obligatorio');
  }

  await actualizarEspecie(id, nombreComun, nombreCientifico);
  return true;
}

export async function borrarEspecie(id) {
  return eliminarEspecie(id);
}
