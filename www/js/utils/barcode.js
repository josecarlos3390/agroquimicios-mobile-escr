/* =========================================================
   UTILIDAD DE ESCANEO DE CÓDIGOS DE BARRAS
   En tiempo real vía getUserMedia + BarcodeDetector nativo
   Fallback: input file + BarcodeDetector
========================================================= */

let modalScan = null;
let streamActivo = null;
let rafId = null;
let timeoutId = null;

/* ---------------------------------------------------------
   DETECTAR CAPACIDADES
   --------------------------------------------------------- */
function tieneGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

function tieneBarcodeDetector() {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

/* ---------------------------------------------------------
   MODAL DE ESCANEO
   --------------------------------------------------------- */
function crearModalScan() {
  if (modalScan) return modalScan;

  const el = document.createElement('div');
  el.id = 'scan-modal';
  el.innerHTML = `
    <div class="scan-modal-backdrop"></div>
    <div class="scan-modal-content">
      <video id="scan-video" playsinline muted autoplay></video>
      <div class="scan-frame">
        <div class="scan-corner scan-corner-tl"></div>
        <div class="scan-corner scan-corner-tr"></div>
        <div class="scan-corner scan-corner-bl"></div>
        <div class="scan-corner scan-corner-br"></div>
        <div class="scan-laser"></div>
      </div>
      <div class="scan-hint">Apuntá al código dentro del recuadro</div>
      <button type="button" class="scan-btn-cancel">✕ Cancelar</button>
    </div>
  `;
  document.body.appendChild(el);
  modalScan = el;
  return el;
}

function mostrarModal() {
  const el = crearModalScan();
  el.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function ocultarModal() {
  if (modalScan) {
    modalScan.style.display = 'none';
    document.body.style.overflow = '';
  }
}

function detenerTodoScan() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
  if (streamActivo) { streamActivo.getTracks().forEach(t => t.stop()); streamActivo = null; }
  const video = document.getElementById('scan-video');
  if (video) video.srcObject = null;
  ocultarModal();
}

/* ---------------------------------------------------------
   ESCANEO EN TIEMPO REAL
   --------------------------------------------------------- */
export async function escanearEnTiempoReal() {
  if (!tieneGetUserMedia()) {
    throw new Error('Cámara no disponible en este dispositivo');
  }
  if (!tieneBarcodeDetector()) {
    throw new Error('Detector de códigos no disponible');
  }

  mostrarModal();
  const video = document.getElementById('scan-video');
  const btnCancel = document.querySelector('#scan-modal .scan-btn-cancel');

  return new Promise((resolve, reject) => {
    let resuelto = false;

    function finalizar(valor, error) {
      if (resuelto) return;
      resuelto = true;
      detenerTodoScan();
      if (error) reject(error);
      else resolve(valor);
    }

    btnCancel.onclick = () => finalizar(null, new Error('Escaneo cancelado'));

    // Timeout de 60 segundos para no drainear batería
    timeoutId = setTimeout(() => {
      finalizar(null, new Error('Tiempo agotado. Probá de nuevo.'));
    }, 60000);

    const detector = new window.BarcodeDetector({
      formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code']
    });

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    }).then(stream => {
      streamActivo = stream;
      video.srcObject = stream;
      video.play();

      async function tick() {
        if (resuelto) return;
        if (video.readyState < 2) {
          rafId = requestAnimationFrame(tick);
          return;
        }

        try {
          const barcodes = await detector.detect(video);
          if (barcodes && barcodes.length > 0) {
            const valor = barcodes[0].rawValue;
            if (valor) {
              finalizar(valor);
              return;
            }
          }
        } catch (e) {
          // ignorar frames con error de detección
        }

        rafId = requestAnimationFrame(tick);
      }

      rafId = requestAnimationFrame(tick);
    }).catch(err => {
      console.error('[SCAN] Error cámara:', err);
      finalizar(null, new Error('No se pudo acceder a la cámara. Verificá los permisos.'));
    });
  });
}

/* ---------------------------------------------------------
   FALLBACK: archivo + BarcodeDetector
   --------------------------------------------------------- */
export async function escanearDesdeArchivo(file) {
  if (!file) return null;
  if (!tieneBarcodeDetector()) {
    console.warn('[BARCODE] BarcodeDetector no disponible');
    return null;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const detector = new window.BarcodeDetector({
      formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code']
    });
    const barcodes = await detector.detect(bitmap);
    bitmap.close?.();

    if (barcodes && barcodes.length > 0) {
      return barcodes[0].rawValue || null;
    }
    return null;
  } catch (err) {
    console.error('[BARCODE] Error detectando:', err);
    return null;
  }
}

/* ---------------------------------------------------------
   BOTÓN SCAN
   --------------------------------------------------------- */
export function crearBotonEscanear(inputId, onDetectado) {
  const wrap = document.createElement('div');
  wrap.style.display = 'contents';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-scan';
  btn.title = 'Escanear con cámara';
  btn.innerHTML = '📷';

  wrap.appendChild(btn);

  const puedeScanLive = tieneGetUserMedia() && tieneBarcodeDetector();

  if (puedeScanLive) {
    btn.addEventListener('click', async () => {
      try {
        const valor = await escanearEnTiempoReal();
        if (valor) {
          onDetectado(valor);
        }
      } catch (err) {
        if (!err.message?.includes('cancelado')) {
          console.error('[SCAN] Error:', err);
          alert('❌ ' + err.message);
        }
      }
    });
  } else {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.capture = 'environment';
    fileInput.style.display = 'none';
    wrap.appendChild(fileInput);

    btn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const valor = await escanearDesdeArchivo(file);
      if (valor) {
        onDetectado(valor);
      } else {
        alert('❌ No se detectó código de barras. Probá de nuevo o escribí manualmente.');
      }
      fileInput.value = '';
    });
  }

  return { btn, extra: wrap };
}
