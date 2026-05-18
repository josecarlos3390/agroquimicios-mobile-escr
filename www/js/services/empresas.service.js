// www/js/services/empresas.service.js
import {
  getEmpresas,
  getEmpresaById,
  createEmpresa,
  updateEmpresa,
  deleteEmpresa
} from '../repositories/empresas.repo.js';

let empresaActiva = null;

export async function listarEmpresas() {
  return await getEmpresas();
}

export async function obtenerEmpresa(id) {
  return await getEmpresaById(id);
}

export async function guardarEmpresa(data) {
  if (data.id) {
    return await updateEmpresa(data.id, data);
  }
  return await createEmpresa(data);
}

export async function eliminarEmpresa(id) {
  return await deleteEmpresa(id);
}

export function setEmpresaActiva(empresa) {
  empresaActiva = empresa;
  if (empresa) {
    localStorage.setItem('empresaActivaId', empresa.id);
  } else {
    localStorage.removeItem('empresaActivaId');
  }
}

export function getEmpresaActiva() {
  return empresaActiva;
}

export async function restaurarEmpresaActiva() {
  if (empresaActiva) return empresaActiva;
  const id = localStorage.getItem('empresaActivaId');
  if (!id) return null;
  try {
    empresaActiva = await getEmpresaById(id);
    return empresaActiva;
  } catch {
    localStorage.removeItem('empresaActivaId');
    return null;
  }
}
