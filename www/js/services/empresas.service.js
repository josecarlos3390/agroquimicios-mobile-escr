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
}

export function getEmpresaActiva() {
  return empresaActiva;
}
