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
   Usa SheetJS cargado globalmente como window.XLSX
========================= */
export function lineasAXLSX(lineas) {
  const XLSX = window.XLSX;
  if (!XLSX) throw new Error('SheetJS no está disponible');

  const headers = [
    'NRO_NOTA', 'FECHA_INICIO', 'CODIGO_PRODUCTO', 'DESCRIPCION',
    'CANTIDAD', 'SELECCION', 'GCA', 'CA', 'CUENTA',
    'HECTAREAS_APLICADAS', 'SELECCIONAR_LOTE', 'DOSIS',
    'HECTAREAS_REF', 'CULTIVO', 'SECTOR', 'CAUDAL'
  ];

  // Encabezados amigables para la primera fila
  const headersLegibles = [
    'Nro. Nota', 'Fecha Inicio', 'Código Producto', 'Descripción',
    'Cantidad', 'Selección', 'GCA', 'CA', 'Cuenta',
    'Hectáreas Aplicadas', 'Lote', 'Dosis',
    'Hectáreas Ref.', 'Cultivo', 'Sector', 'Caudal'
  ];

  // Columnas numéricas con decimales — se escriben como número real en Excel
  // usando toPrecision(15) que es la máxima precisión de un float64,
  // y formato de celda '0.###############' para mostrar hasta 15 decimales
  // significativos sin ceros innecesarios al final.
  const colsNumericas = new Set([
    'CANTIDAD', 'HECTAREAS_APLICADAS', 'DOSIS', 'HECTAREAS_REF'
  ]);
  // 15 '#' = hasta 15 decimales significativos, sin ceros al final
  const FMT_DECIMAL = '0.###############';

  const filas = lineas.map(l => {
    const fila = {};
    headers.forEach((h, i) => {
      const val = l[h] ?? '';
      if (colsNumericas.has(h) && val !== '' && val !== null) {
        // parseFloat(toPrecision(15)): número real con máxima precisión float64
        const n = typeof val === 'number' ? val : parseFloat(val);
        fila[headersLegibles[i]] = isNaN(n) ? val : parseFloat(n.toPrecision(15));
      } else {
        fila[headersLegibles[i]] = val ?? '';
      }
    });
    return fila;
  });

  // Crear hoja
  const ws = XLSX.utils.json_to_sheet(filas, { header: headersLegibles });

  // Aplicar formato numérico con decimales completos a cada celda numérica
  // t:'n' = tipo número, z = formato de visualización de Excel
  const range = XLSX.utils.decode_range(ws['!ref']);
  headers.forEach((h, colIdx) => {
    if (!colsNumericas.has(h)) return;
    for (let rowIdx = range.s.r + 1; rowIdx <= range.e.r; rowIdx++) {
      const cellAddr = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
      if (ws[cellAddr]) {
        ws[cellAddr].t = 'n';       // número real — permite sumar, calcular
        ws[cellAddr].z = FMT_DECIMAL; // muestra todos los decimales sin redondear
      }
    }
  });

  // Ancho de columnas automático
  const colWidths = headersLegibles.map((h, i) => {
    const maxData = lineas.reduce((max, l) => {
      const val = String(l[headers[i]] ?? '');
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