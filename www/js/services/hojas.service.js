import { createHojaCab, getNextNumeroSecuencial, getHojas, deleteHojaCab, updateHojaCab, updateEstadoHoja } from '../repositories/hojasCab.repo.js';
import { addLotesToHoja, replaceLotesHoja } from '../repositories/hojasLotes.repo.js';
import { addSectoresToHoja, replaceSectoresHoja } from '../repositories/hojasSectores.repo.js';
import { recalcularDosisHoja } from '../repositories/hojasDetalle.repo.js';
import { executeQuery } from '../db/sqlite.js';
import { uuid } from '../utils/uuid.js';

export async function crearHojaTrabajoCabecera(data) {

  if (!data.lotes || data.lotes.length === 0) {
    throw new Error('Debe seleccionar al menos un lote');
  }

  if (!data.sectores || data.sectores.length === 0) {
    throw new Error('Debe seleccionar al menos un sector');
  }

  if (!data.fecha_inicio || !data.fecha_fin) {
    throw new Error('Debe indicar fecha de inicio y fin');
  }

  const hojaId           = uuid();
  const numeroSecuencial = await getNextNumeroSecuencial();

  // Fecha + hora + minuto
  const ahora  = new Date();
  const fecha  = ahora.toISOString().slice(0, 10).replace(/-/g, ''); // 20250219
  const hora   = String(ahora.getHours()).padStart(2, '0');
  const minuto = String(ahora.getMinutes()).padStart(2, '0');
  const corr   = String(numeroSecuencial).padStart(5, '0');

  // Modelo del dispositivo
  const modelo = await getModeloDispositivo();

  const numeroCompleto = `${modelo}-${fecha}${hora}${minuto}${corr}`;

  await createHojaCab({
    id:                      hojaId,
    numero_secuencial:       numeroSecuencial,
    numero_completo:         numeroCompleto,
    dispositivo_id:          modelo,
    campana:                 data.campana ?? String(ahora.getFullYear()),
    empresa_id:              data.empresa_id,
    cultivo_id:              data.cultivo_id,
    tecnico_id:              data.tecnico_id,
    tipo_aplicacion_id:      data.tipo_aplicacion_id,
    caudal_id:               data.caudal_id ?? null,
    caudal_descripcion:      data.caudal_descripcion ?? null,
    mes:                     data.mes,
    fecha_inicio:            data.fecha_inicio,
    fecha_fin:               data.fecha_fin,
    cantidad_hectareas:      data.cantidad_hectareas,
    cantidad_hectareas_lotes: data.cantidad_hectareas_lotes ?? data.cantidad_hectareas,
    observaciones:           data.observaciones
  });

  // Insertar sectores y lotes en batch
  await addSectoresToHoja(hojaId, data.sectores);
  await addLotesToHoja(hojaId, data.lotes);
  return hojaId;
}

export async function actualizarHojaCabecera(id, data) {
  if (!id) throw new Error('Hoja inválida');
  if (!data.empresa_id) throw new Error('Empresa requerida');
  if (!data.campana) throw new Error('Campaña requerida');
  if (!data.sectores || data.sectores.length === 0) throw new Error('Debe seleccionar al menos un sector');

  // Obtener hectáreas anteriores para detectar si cambiaron
  const [anterior] = await executeQuery(
    'SELECT cantidad_hectareas FROM hojas_cab WHERE id = ?', [id]
  );

  await updateHojaCab(id, data);
  await replaceSectoresHoja(id, data.sectores);

  // Reemplazar lotes con sus hectáreas parciales si vienen en data
  if (data.lotes && data.lotes.length > 0) {
    await replaceLotesHoja(id, data.lotes);
  }

  // Recalcular dosis si las hectáreas cambiaron
  const hectareasNuevas = parseFloat(data.cantidad_hectareas);
  if (anterior && parseFloat(anterior.cantidad_hectareas) !== hectareasNuevas) {
    await recalcularDosisHoja(id, hectareasNuevas);
  }
}

export async function listarHojas(estado = null) {
  return await getHojas(estado);
}

export async function marcarComoExportado(ids) {
  for (const id of ids) {
    await updateEstadoHoja(id, 'EXPORTADO');
  }
}

export async function eliminarHoja(id) {
  return await deleteHojaCab(id);
}

// Función helper para obtener modelo del dispositivo
async function getModeloDispositivo() {
  try {
    // Forma 1: API moderna de Capacitor
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Device) {
      const info = await window.Capacitor.Plugins.Device.getInfo();
      return info.model
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 10);
    }

    // Forma 2: fallback con userAgent
    const ua = navigator.userAgent;
    // Android: busca el modelo entre paréntesis
    const match = ua.match(/\(.*?;\s*([^;)]+)\s*Build/);
    if (match && match[1]) {
      return match[1]
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 10);
    }

    return 'LOCAL';

  } catch (err) {
    console.error('❌ getModeloDispositivo error:', err);
    return 'LOCAL';
  }
}