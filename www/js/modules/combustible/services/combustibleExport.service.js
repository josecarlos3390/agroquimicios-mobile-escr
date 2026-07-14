import { formatFecha } from '../../../utils/fecha.js';

const ENCABEZADOS = [
  'Número',
  'Propiedad',
  'Fecha',
  'Placa / Código',
  'Tipo combustible',
  'Cantidad (L)',
  'Horómetro (Km)',
  'Recibe',
  'Entrega',
  'Observaciones',
  'Estado',
  'Foto',
];

const DIRECTORIO = 'CACHE';
const FILA_ALTO_PX = 90;
const COL_ANCHO_FOTO = 22;
const FOTO_ANCHO_PX = 160;
const FOTO_ALTO_PX = 120;

function parseDataUrl(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], base64: match[2] };
}

function extensionDesdeMime(mime) {
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
}

function generarNombreArchivo(cantidad) {
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
  return `combustible_${fecha}_${hora}_${cantidad}reg.xlsx`;
}

function normalizarFileUri(uri) {
  if (!uri) return uri;
  if (uri.startsWith('file://') || uri.startsWith('file:')) return uri;
  return `file://${uri}`;
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export async function exportarAsignacionesAExcel(asignaciones) {
  if (!asignaciones || asignaciones.length === 0) {
    throw new Error('No hay asignaciones para exportar');
  }

  const ExcelJS = window.ExcelJS;
  if (!ExcelJS) throw new Error('ExcelJS no está disponible');

  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Asignaciones Combustible');

  worksheet.addRow(ENCABEZADOS);
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  ENCABEZADOS.forEach((h, i) => {
    worksheet.getColumn(i + 1).width = Math.max(h.length + 2, 14);
  });
  worksheet.getColumn(ENCABEZADOS.length).width = COL_ANCHO_FOTO;

  for (let idx = 0; idx < asignaciones.length; idx++) {
    const a = asignaciones[idx];
    const filaExcel = idx + 2; // fila 1 es header

    worksheet.addRow([
      a.numero_completo ?? '',
      a.empresa_nombre ?? '',
      formatFecha(a.fecha),
      a.placa_codigo ?? '',
      a.tipo_combustible ?? '',
      a.cantidad ?? 0,
      a.horometro ?? '',
      a.persona_recibe ?? '',
      a.persona_entrega ?? '',
      a.observaciones ?? '',
      a.estado ?? '',
      a.foto_base64 ? 'SÍ' : 'NO',
    ]);

    worksheet.getRow(filaExcel).height = FILA_ALTO_PX;
    worksheet.getRow(filaExcel).alignment = { vertical: 'middle', wrapText: true };

    if (a.foto_base64) {
      const parsed = parseDataUrl(a.foto_base64);
      if (parsed) {
        const ext = extensionDesdeMime(parsed.mime);
        const imageId = workbook.addImage({
          base64: parsed.base64,
          extension: ext,
        });

        const colIndex = ENCABEZADOS.length; // columna L = 12
        worksheet.addImage(imageId, {
          tl: { col: colIndex - 1, row: filaExcel - 1, colOff: 0, rowOff: 0 },
          ext: { width: FOTO_ANCHO_PX, height: FOTO_ALTO_PX },
          editAs: 'oneCell',
        });
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const base64 = arrayBufferToBase64(buffer);
  const nombreExcel = generarNombreArchivo(asignaciones.length);

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
          title: 'Asignaciones de combustible',
          files: [uriExcel],
          dialogTitle: 'Compartir exportación',
        });
      } catch (err) {
        console.warn('[EXPORT] Share con files falló, intentando con url:', err);
        await plugins.Share.share({
          title: 'Asignaciones de combustible',
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
