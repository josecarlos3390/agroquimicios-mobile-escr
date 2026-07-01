import { getLineasExportacion } from '../repositories/exportacion.repo.js';

export async function exportarHojas(hojaIds) {
  if (!hojaIds || hojaIds.length === 0) {
    throw new Error('Debe seleccionar al menos una hoja');
  }

  const lineas = await getLineasExportacion(hojaIds);

  if (lineas.length === 0) {
    throw new Error('Las hojas seleccionadas no tienen productos cargados');
  }

  return lineas;
}

/* =========================
   EXPORTAR COMO CSV
   (Formato legado, 16 columnas)
========================= */
export function lineasACSV(lineas) {
  const headers = [
    'NRO_NOTA', 'FECHA_INICIO', 'CODIGO_PRODUCTO', 'DESCRIPCION',
    'CANTIDAD', 'SELECCION', 'GCA', 'CA', 'CUENTA',
    'HECTAREAS_APLICADAS', 'SELECCIONAR_LOTE', 'DOSIS',
    'HECTAREAS_REF', 'CULTIVO', 'SECTOR', 'CAUDAL'
  ];

  const filas = lineas.map(l =>
    headers.map(h => {
      const str = String(l[h] ?? '');
      return (str.includes(',') || str.includes('"') || str.includes('\n'))
        ? `"${str.replace(/"/g, '""')}"` 
        : str;
    }).join(',')
  );

  return [headers.join(','), ...filas].join('\n');
}

/* =========================
   EXPORTAR COMO XLSX (base64)
   Formato Gabriel:
   - Fila 1: encabezados oficiales.
   - Fila 2 en adelante: datos.
   Usa SheetJS cargado globalmente como window.XLSX.
========================= */
export function lineasAXLSX(lineas) {
  const XLSX = window.XLSX;
  if (!XLSX) throw new Error('SheetJS no está disponible');

  const COL_HEADERS = [
    'Fila (A)',
    ' Código Producto (*)      (B)',
    '    Descripción Producto (*)                   (C)',
    'Cantidad CUI (*) (D)',
    'Cantidad CUP (*) (E)',
    'Cuenta (*) (F)',
    'C.C. (*) (G)',
    'Grp. C.A. (*)  (H)',
    'C.A. (*) (I)',
    'R.S. / UN (*) (J)'
  ];

  const CANTIDAD_DEFAULT = 0;
  const CC_DEFAULT = 540;
  const RS_UN_DEFAULT = 1;

  // Muestra todos los decimales significativos sin ceros innecesarios al final
  const FMT_DECIMAL_COMPLETO = '0.###############';

  const aoa = [COL_HEADERS];

  lineas.forEach((l, idx) => {
    const cantidadRaw = l.CANTIDAD ?? CANTIDAD_DEFAULT;
    const cantidadNum = typeof cantidadRaw === 'number' ? cantidadRaw : parseFloat(cantidadRaw);
    const cantidad = isNaN(cantidadNum) ? CANTIDAD_DEFAULT : cantidadNum;

    aoa.push([
      idx + 1,                       // A: Fila
      l.CODIGO_PRODUCTO ?? '',       // B: Código Producto
      l.DESCRIPCION ?? '',           // C: Descripción Producto
      cantidad,                      // D: Cantidad CUI
      cantidad,                      // E: Cantidad CUP (igual a D)
      l.CUENTA ?? '',                // F: Cuenta
      CC_DEFAULT,                    // G: C.C.
      '',                            // H: Grp. C.A. (vacío)
      '',                            // I: C.A. (vacío)
      RS_UN_DEFAULT                  // J: R.S. / UN
    ]);
  });

  // Crear hoja a partir de array de arrays (AOA)
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Aplicar formato numérico completo a las columnas de cantidad (D y E)
  // Las filas de datos comienzan en el índice 1 (fila 2 del Excel).
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let rowIdx = 1; rowIdx <= range.e.r; rowIdx++) {
    [3, 4].forEach(colIdx => {
      const cellAddr = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
      if (ws[cellAddr]) {
        ws[cellAddr].t = 'n';          // número real
        ws[cellAddr].z = FMT_DECIMAL_COMPLETO;
      }
    });
  }

  // Ancho de columnas automático
  const colWidths = COL_HEADERS.map((h, i) => {
    const maxData = aoa.slice(1).reduce((max, row) => {
      const val = String(row[i] ?? '');
      return Math.max(max, val.length);
    }, 0);
    return { wch: Math.max(h.length, maxData, 8) + 2 };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Hojas de Trabajo');

  // Devolver como base64 (lo que Capacitor Filesystem necesita)
  return XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
}
