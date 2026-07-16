import { formatFecha } from './fecha.js';

const ENCABEZADOS = [
  'NRO RODEO',
  'X COORD',
  'Y COORD',
  'ESPECIE',
  'FAJA',
  'NRO ARBOL',
  'SECCION',
  'D1 (M)',
  'D2 (M)',
  'LARGO (M)',
  'VOL (M3)',
  'PARA TRANSPORTE',
  'NRO DOCUMENTO',
  'FECHA DOCUMENTO',
  'PLACA',
  'CHOFER',
  'OBSERVACIONES',
];

const DIRECTORIO = 'CACHE';

function generarNombreArchivo(prefijo, cantidad) {
  const ahora = new Date();
  const fecha = [
    ahora.getFullYear(),
    String(ahora.getMonth() + 1).padStart(2, '0'),
    String(ahora.getDate()).padStart(2, '0'),
  ].join('');
  const hora = [
    String(ahora.getHours()).padStart(2, '0'),
    String(ahora.getMinutes()).padStart(2, '0'),
    String(ahora.getSeconds()).padStart(2, '0'),
  ].join('');
  return `${prefijo}_${fecha}_${hora}_${cantidad}reg.xlsx`;
}

function normalizarFileUri(uri) {
  if (!uri) return uri;
  if (uri.startsWith('file://') || uri.startsWith('file:')) return uri;
  return `file://${uri}`;
}

export async function exportarRegistrosArbolesAXLSX(registros, opciones = {}) {
  if (!registros || registros.length === 0) {
    throw new Error('No hay registros para exportar');
  }

  const XLSX = window.XLSX;
  if (!XLSX) throw new Error('SheetJS no está disponible');

  const {
    prefijoNombre = 'rodeo',
    nombreHoja = 'Arboles',
    campoDocumento = 'numero_completo',
    campoFecha = 'fecha_despacho',
    labelDocumento = 'NRO DOCUMENTO',
    labelFecha = 'FECHA DOCUMENTO',
  } = opciones;

  const aoa = [ENCABEZADOS];

  for (const reg of registros) {
    const cab = reg.cabecera || {};
    const detalle = reg.detalle || [];

    for (const d of detalle) {
      aoa.push([
        d.nro_rodeo ?? '',
        d.x_coord ?? '',
        d.y_coord ?? '',
        d.especie ?? '',
        d.faja ?? '',
        d.nro_arbol ?? '',
        d.seccion ?? '',
        d.d1 ?? d.diamayor ?? '',
        d.d2 ?? d.diamenor ?? '',
        d.largo ?? '',
        d.volumen ?? '',
        d.para_transporte ?? '',
        cab[campoDocumento] ?? '',
        formatFecha(cab[campoFecha]),
        cab.placa ?? '',
        cab.chofer ?? '',
        cab.observaciones ?? '',
      ]);
    }
  }

  if (aoa.length === 1) {
    throw new Error('Los registros seleccionados no tienen árboles para exportar');
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const colWidths = ENCABEZADOS.map((h, i) => {
    const maxData = aoa.slice(1).reduce((max, row) => {
      const val = String(row[i] ?? '');
      return Math.max(max, val.length);
    }, 0);
    return { wch: Math.max(h.length, maxData, 10) + 2 };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, nombreHoja);

  const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
  const nombreExcel = generarNombreArchivo(prefijoNombre, aoa.length - 1);

  const plugins = window.Capacitor?.Plugins;
  if (plugins?.Filesystem) {
    await plugins.Filesystem.writeFile({
      path: nombreExcel,
      data: base64,
      directory: DIRECTORIO,
      recursive: true,
    });

    const uriExcelResult = await plugins.Filesystem.getUri({
      path: nombreExcel,
      directory: DIRECTORIO,
    });

    const uriExcel = normalizarFileUri(uriExcelResult.uri);

    if (plugins.Share) {
      try {
        await plugins.Share.share({
          title: 'Exportación de árboles',
          files: [uriExcel],
          dialogTitle: 'Compartir exportación',
        });
      } catch (err) {
        console.warn('[EXPORT RODEO] Share con files falló, intentando con url:', err);
        await plugins.Share.share({
          title: 'Exportación de árboles',
          url: uriExcel,
          dialogTitle: 'Compartir exportación',
        });
      }
    }

    return { nombre: nombreExcel, uri: uriExcel };
  }

  // Fallback navegador
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreExcel;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { nombre: nombreExcel, uri: null };
}
