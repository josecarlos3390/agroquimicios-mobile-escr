import {
  insertarCefoCab,
  insertarCefoDetalle,
  listarCefos,
  obtenerCefoPorId,
  eliminarCefo,
} from '../repositories/cefo.repo.js';
import { getEmpresaActiva } from './empresas.service.js';
import { uuid } from '../utils/uuid.js';

export async function getCefos() {
  const empresa = getEmpresaActiva();
  if (!empresa) throw new Error('No hay empresa activa');
  return listarCefos(empresa.id);
}

export async function getCefo(id) {
  return obtenerCefoPorId(id);
}

export async function borrarCefo(id) {
  return eliminarCefo(id);
}

export async function importarCefoDesdeExcel(filas) {
  const empresa = getEmpresaActiva();
  if (!empresa) throw new Error('No hay empresa activa');

  // Agrupar filas por nro_cfo_recib
  const grupos = {};
  for (const f of filas) {
    const cfo = String(f.nro_cfo_recib || '').trim();
    if (!cfo) continue;
    if (!grupos[cfo]) {
      grupos[cfo] = {
        nro_cfo_recib: cfo,
        fecha_recep: f.fecha_recep,
        placa: f.placa,
        chofer: f.chofer,
        arboles: [],
      };
    }
    grupos[cfo].arboles.push(f);
  }

  let cefosCreados = 0;
  let arbolesCreados = 0;

  for (const key in grupos) {
    const g = grupos[key];
    const id = uuid();

    const fecha = g.fecha_recep instanceof Date
      ? g.fecha_recep.toISOString().split('T')[0]
      : (g.fecha_recep || null);

    await insertarCefoCab(
      id,
      empresa.id,
      g.nro_cfo_recib,
      fecha,
      g.placa || '',
      g.chofer || ''
    );
    cefosCreados++;

    for (const a of g.arboles) {
      await insertarCefoDetalle(
        id,
        a.especie || '',
        a.faja || null,
        a.nro_arbol || '',
        a.seccion || '',
        a.diamayor || null,
        a.diamenor || null,
        a.largo || null,
        a.volumen || null
      );
      arbolesCreados++;
    }
  }

  return { cefosCreados, arbolesCreados };
}
