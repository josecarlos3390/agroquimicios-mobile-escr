# AgroApp – Guía para Agentes de Código

> App Capacitor 8 offline-first para gestión agroquímica en Android. Cinco módulos funcionales: Agroquímicos (hojas de trabajo), Caña (plantación), Combustible (asignaciones), Corte de Semilla y Guía de Transporte de Caña.

## Stack

| Capa | Tecnología |
|------|------------|
| Framework | Capacitor 8 (Android target) |
| Frontend | HTML5 + CSS3 + vanilla JS (módulos ES) |
| Base de datos | SQLite vía `@capacitor-community/sqlite` |
| Excel | SheetJS (`xlsx.full.min.js`) cargado como `<script>` global — `window.XLSX` |
| Plugins extra | `@capacitor/filesystem`, `@capacitor/share` |

## Punto de entrada y recursos

- **Punto de entrada real**: `www/index.html` (contiene sidebar + todas las vistas como `<section id="view-{name}">`).
- `index.txt` en raíz es un archivo borrador de desarrollo — ignorarlo.
- `www/` es el directorio fuente (`capacitor.config.json` → `"webDir": "www"`).

---

## Comandos

```bash
npm install                  # Instalar dependencias
npx cap sync android         # Copiar www/ al proyecto Android y actualizar plugins
npx cap open android         # Abrir en Android Studio (compilar APK/AAB desde ahí)
npm test                     # No implementado — las pruebas se hacen manualmente en dispositivo/emulador
npm run build                # Roto (intenta copiar public/ → www/; el directorio real es www/)
```

No hay linter, formateador ni pruebas automatizadas configuradas. No existen archivos `.eslintrc`, `.prettierrc`, `.editorconfig` ni reglas de Cursor/Copilot.

---

## Arquitectura de capas

```
Vistas (DOM + eventos) → Servicios (lógica de negocio) → Repositorios (SQL crudo) → db/sqlite.js → CapacitorSQLite
```

### `www/js/db/`
- **`sqlite.js`**: wrapper singleton del plugin. Expone `executeQuery(sql, values?)`, `executeRun(sql, values?)`, `executeSet(statements)`. Conexión lazy-init, sin encriptación, DB llamada `agro.db`.
- **`schema.js`**: `CREATE TABLE IF NOT EXISTS` de **25 tablas** + migraciones con `PRAGMA table_info()`. Tablas principales: maestros (`empresas`, `cultivos`, `variedades`, `sectores`, `lotes`, `tecnicos`, `tipos_aplicacion`, `caudales`), catálogo de productos (`productos`, `tipos_producto`, `unidades_medida`, `productos_unidades`), hojas de trabajo (`hojas_cab`, `hojas_lotes`, `hojas_sectores`, `hojas_detalle`), caña (`cana_cab`, `cana_plantacion`, `cana_corte_semilla`, `cana_insumos`), combustible (`combustible_asignaciones`), corte de semilla (`corte_semilla_cab`, `corte_semilla_detalle`) y guía de transporte (`guia_transporte_cab`, `guia_transporte_cosecha_mec`). La tabla `aplicaciones` fue eliminada del schema (era huérfana).
- **`seed.js`**: datos iniciales si las tablas están vacías. Importa los arrays masivos desde `seed-data-lotes.js` (~337 lotes demo) y `seed-data-productos.js` (~196 productos de agroquímicos). También incluye cultivos, variedades, sectores, técnicos, caudales, tipos de aplicación, tipos de producto, unidades de medida y productos caña + biológicos.
- **`seed-data-lotes.js`** y **`seed-data-productos.js`**: archivos de datos puros exportados como arrays, separados de la lógica de inserción.

### `www/js/repositories/`
Archivos `{entidad}.repo.js` con funciones `export async function` que contienen SQL parametrizado (`?` placeholders). Siempre importan de `../db/sqlite.js`. Retornan datos planos (arrays, objetos, `lastId`).

- **`importacion.repo.js`**: repo especializado que centraliza todas las queries de importación masiva desde Excel (productos y lotes). Es el único lugar donde vive el SQL crudo de importación.

### `www/js/services/`
Archivos `{entidad}.service.js` con lógica de negocio y validación. Lanzan `throw new Error('mensaje')` para errores de validación.

### `www/js/views/` y `www/js/modules/`
Vistas de maestros en `views/`, módulos funcionales en `modules/agroquimicos/`, `modules/cana/`, `modules/combustible/`, `modules/corteSemilla/` y `modules/guiaTransporteCana/`.

**Importante**: las vistas activas de Agroquímicos están en `www/js/modules/agroquimicos/` (`hojas.view.js`, `hojaNueva.view.js`, `hojaEditar.view.js`, `hojaDetalle.view.js`). `app.js` importa desde ahí. Las versiones en `www/js/views/` (`hojaNueva.view.js`, etc.) fueron eliminadas.

### `www/js/modules/agroquimicos/`
Contiene las vistas activas del módulo de hojas de trabajo. Los servicios y repositorios viven en `www/js/services/` y `www/js/repositories/` respectivamente.

### `www/js/modules/cana/`
El módulo Caña tiene su propia estructura anidada `repositories/cana.repo.js`, `services/cana.service.js`, `views/`. Sigue el mismo patrón de capas pero con imports relativos de 3 niveles (`../../../db/sqlite.js`).

### `www/js/modules/combustible/`
El módulo Combustible sigue la misma estructura anidada que Caña: `repositories/combustible.repo.js`, `services/combustible.service.js`, `views/`. La tabla `combustible_asignaciones` almacena las asignaciones con campos: fecha, placa_codigo, persona_recibe, persona_entrega, cantidad, tipo_combustible (DIESEL/GASOLINA), foto_base64 con marca de agua, horometro y numero_secuencial. Las fotos se capturan vía `<input type="file" capture="environment">` y se procesan con Canvas API para agregar la marca de agua.

### `www/js/modules/corteSemilla/`
El módulo Corte de Semilla sigue la misma estructura anidada: `repositories/corteSemilla.repo.js`, `services/corteSemilla.service.js`, `views/`. Tablas: `corte_semilla_cab` y `corte_semilla_detalle`. Genera números de documento `CSEM-MESDD-NNN`. Exporta Excel con cálculos de rendimiento y consumo de semilla.

### `www/js/modules/guiaTransporteCana/`
Nuevo módulo para registro de guías de transporte de caña. Estructura anidada: `repositories/guiaTransporteCana.repo.js`, `services/guiaTransporteCana.service.js`, `views/` (`registros.view.js`, `nuevaGuia.view.js`, `detalleGuia.view.js`). Tablas: `guia_transporte_cab` (cabecera con datos de boletario, turno, frente, propiedad, fechas/horas, liberación, camión, chofer, chata, transportista, cosecha semi-mecanizada, fotos) y `guia_transporte_cosecha_mec` (múltiples cosechadoras mecanizadas con grilla 2×3, cosechadora, operador, tractor transbordo, tractorista). El formulario usa secciones desplegables (acordeón), escaneo de códigos de barras en tiempo real vía `getUserMedia` + `BarcodeDetector`, y fotos con marca de agua.

### `www/js/app.js`
Orquestador central: inicializa DB, splash screen con selección de propiedad → tipo de uso (agroquímicos/caña/combustible/corte-semilla/guia-transporte-cana), `window.showView(viewName, param?)` como router SPA con pila de historial, botón back con doble toque para salir.

- **Claves de localStorage usadas**: `empresaActivaId`, `tipoUsoActivo`, `darkMode`, `cana_plantilla_insumos`.
- El sidebar se renderiza dinámicamente según el módulo activo (`renderMenuModulo()` usa plantillas HTML definidas en `sidebar.js`).

### `www/js/utils/`
- **`confirm.js`**: modal custom `confirmar(opciones)` que retorna `Promise<boolean>`. Reemplaza `window.confirm()`.
- **`uuid.js`**: generador UUID v4. Usa `crypto.getRandomValues` si está disponible; fallback a `Math.random()`.
- **`device.js`**: `getModeloDispositivo({ maxLength, fallback })` — obtiene modelo del dispositivo vía Capacitor Device API o userAgent.
- **`fecha.js`**: `MESES` (array de 12 meses en español) y `formatFecha(iso)` → `dd/mm/yyyy`.
- **`barcode.js`**: escaneo de códigos de barras en tiempo real usando `getUserMedia` + `BarcodeDetector` nativo del navegador. Fallback a input file + `BarcodeDetector` si no hay cámara disponible. Incluye viewfinder CSS con marco de escaneo y timeout de 60 segundos.

---

## Convenciones de código

### Módulos ES
- Solo **exportaciones nombradas** (`export async function`, `export function`). **Nunca `export default`.**
- Imports con llaves y rutas relativas **siempre con extensión `.js`**: `import { executeQuery } from '../db/sqlite.js'`.
- Los imports van al inicio del archivo, sin comentarios intermedios.

### Nombrado
- **Archivos**: `{entidad}.{capa}.js` en camelCase — `empresas.repo.js`, `hojas.service.js`, `lotes.view.js`.
- **Funciones**: camelCase — `cargarEmpresas()`, `crearHojaTrabajoCabecera()`. Funciones privadas con prefijo `_`: `_manejarBack()`, `_historial`.
- **Constantes**: UPPER_SNAKE_CASE — `const TIPOS_USO = [...]`, `const MESES = [...]`.
- **IDs del DOM**: kebab-case — `view-hojas`, `empresa-select`, `btn-nueva-hoja`.
- **Tablas/columnas DB**: snake_case — `hojas_cab`, `empresa_id`, `numero_secuencial`.

### Funciones
- **`async function`** para funciones exportadas y funciones privadas que usan `await`.
- **Funciones flecha** para callbacks inline y manejadores de eventos: `.addEventListener('click', e => { ... })`, `.map(i => \`...\`)`.
- No se usan `function*`, `Symbol`, proxies ni patrones funcionales avanzados.

### Acceso a datos
- Solo `db/sqlite.js` importa del plugin Capacitor. El resto usa sus envoltorios.
- Siempre consultas parametrizadas con `?` — **nunca** interpolación de strings para valores de usuario.
- SELECT retorna `result[0] || null` para fila única, el array completo para múltiples filas.
- INSERT retorna `result.lastId`. UPDATE/DELETE retorna `result.changes` o `true`.

### Excepciones arquitecturales reales
- ~~Acceso directo a BD desde servicios~~ **Resuelto**: `importacion.service.js` ahora delega en `importacion.repo.js`.
- ~~Acceso directo a BD desde vistas~~ **Resuelto**: `tiposProducto.view.js`, `hojaDetalle.view.js`, `productos.view.js`, `variedades.view.js` y `hojas.service.js` ya no ejecutan SQL crudo; usan sus servicios/repositorios.
- ~~UUID/device ID propios por módulo~~ **Resuelto**: todos los módulos importan `uuid()` desde `utils/uuid.js` y `getModeloDispositivo()` desde `utils/device.js`.
- **`localStorage` como persistencia**: `plantillaInsumos.view.js` (Caña) guarda la configuración de insumos solo en `localStorage` (`cana_plantilla_insumos`) y nunca toca SQLite.
- ~~Duplicación de funciones~~ **Resuelto**: `getUnidadesByProducto` solo vive en `productosUnidades.repo.js`; se eliminó de `unidadesMedida.repo.js`.
- ~~CRUD incompleto~~ **Resuelto**: `tipos_producto` ahora tiene `update` y `delete` en repo + service. `productos` tiene `activarProducto` además de `desactivarProducto`.
- ~~Números secuenciales sin transacción~~ **Resuelto**: se creó la tabla `secuencias` y la función `reservarNumeroSecuencial(tabla)` en `sqlite.js`. Los repos de los 5 módulos usan este mecanismo atómico en lugar de `MAX() + 1`.
- ~~MESES y `formatFecha` duplicados~~ **Resuelto**: centralizados en `utils/fecha.js`. Eliminadas las definiciones locales de cada servicio/vista.

### Deuda técnica conocida (mejoras futuras)
- **Vistas multimodo muy grandes** — `nuevaNota.view.js`, `nuevoCorte.view.js`, `nuevaAsignacion.view.js` y `nuevaGuia.view.js` manejan crear/editar/detalle en un solo archivo (400+ líneas). Podrían separarse en helpers o en archivos dedicados.
- **`alert()` en UX** — hay ~53 `alert()` en el proyecto. Funcionalmente correcto según convenciones, pero en mobile nativo es una experiencia brusca. Migración progresiva a toast inline o snackbar mejoraría la UX.

### Manejo de errores
- Servicios lanzan `throw new Error('mensaje legible')` para errores de negocio/validación.
- Vistas capturan con `try/catch` y muestran `alert('❌ ' + err.message)` al usuario.
- `console.error('[MODULO] descripción:', error)` para errores de sistema/DB.
- Catch silencioso solo para casos esperados (ej. ALTER TABLE si columna ya existe).

### Vistas (patrones)
- Plantilla HTML inline en `index.html` como `<section id="view-{name}">`.
- Guarda de inicialización única: `let inicializado = false; if (inicializado) return; inicializado = true;`.
- Función `cargar*()` que se llama cada vez que la vista se muestra, re-pobla el DOM.
- Delegación de eventos sobre el `#view-{name}` raíz en vez de listeners individuales.
- Formularios: `e.preventDefault()`, validación manual con `alert()` + `return` temprano, botón se deshabilita y cambia texto durante el guardado.
- Navegación entre vistas: `window.showView('hoja-detalle', hojaId)`.
- Confirmación de borrado: `const ok = await confirmar({ titulo: '...', msg: '...' }); if (!ok) return;`.

### Renderizado del DOM
- **`innerHTML` con template literals** para listas, cards, skeleton loaders. Usar `.map().join('')`.
- **`document.createElement()` + `appendChild()`** para elementos dinámicos de formularios (filas extras, options de select).
- Texto de inputs se normaliza con `.trim().toUpperCase()` antes de guardar.

### Retroalimentación de UI
- **Skeleton cards**: 3 placeholders con clase `.skeleton-card` inyectados antes del fetch, reemplazados por datos reales.
- **Botones**: `btn.disabled = true; btn.textContent = '⏳'` / `'Guardando...'`.
- **Fases**: máquina de estados con `setFase('idle' | 'leyendo' | 'importando' | 'preview' | 'resultado')`.
- **Modal de confirmación**: `confirmar()` del util retorna `Promise<boolean>` — **nunca usar `window.confirm()`**.
- **Toast**: div temporal con estilos inline, `appendChild` al body, eliminado con `setTimeout`.
- **Splash**: transición CSS con `transitionend` para remover el elemento limpiamente.

### CSS
- Variables CSS en `:root` (colores, sombras, radios, tipografía). Dark mode en `body.dark {}` redefine las mismas variables.
- Clases principales: `.card`, `.grid`, `.modal`, `.modal-confirm`, `.btn-primary`, `.btn-secondary`, `.hoja-card`, `.vista-header`, `.empty-state`, `.skeleton-card`, `.sector-chip`, `.sector-acordeon`.
- Sidebar usa `transform: translateX()` (GPU) para animación, nunca `left`/`right`.

### Español
- **Todo el código, comentarios, nombres de variables/funciones, mensajes de error y UI en español.**

---

## Archivos clave por tarea

| Tarea | Archivos |
|-------|----------|
| Agregar tabla | `www/js/db/schema.js` + `www/js/db/seed.js` |
| Nuevo maestro CRUD | `www/js/repositories/{x}.repo.js` + `www/js/services/{x}.service.js` + `www/js/views/{x}.view.js` + `index.html` (section) + `app.js` (showView case) + `sidebar.js` (menú) |
| Cambiar lógica de hojas | `www/js/services/hojas.service.js` |
| Cambiar UI de creación de hojas | `www/js/modules/agroquimicos/hojaNueva.view.js` |
| Cambiar lógica de caña | `www/js/modules/cana/services/cana.service.js` |
| Cambiar UI de caña | `www/js/modules/cana/views/nuevaNota.view.js` |
| Cambiar lógica de combustible | `www/js/modules/combustible/services/combustible.service.js` |
| Cambiar UI de combustible | `www/js/modules/combustible/views/nuevaAsignacion.view.js` |
| Cambiar lógica de corte de semilla | `www/js/modules/corteSemilla/services/corteSemilla.service.js` |
| Cambiar UI de corte de semilla | `www/js/modules/corteSemilla/views/nuevoCorte.view.js` |
| Cambiar lógica de guía de transporte | `www/js/modules/guiaTransporteCana/services/guiaTransporteCana.service.js` |
| Cambiar UI de guía de transporte | `www/js/modules/guiaTransporteCana/views/nuevaGuia.view.js` |
| Cambiar escaneo de códigos | `www/js/utils/barcode.js` |
| Agregar plugin nativo | `npm install <plugin>` → `npx cap sync android` |
| Cambiar estilos globales | `www/css/main.css` |
| Cambiar menú lateral | `www/js/ui/sidebar.js` |
| Cambiar versión/appId | `capacitor.config.json` + `android/app/build.gradle` |

---

## Seguridad y despliegue

- SQLite sin encriptación (`mode: 'no-encryption'`). Datos sensibles en texto claro.
- Sin autenticación. `localStorage` solo para preferencias UI (dark mode, empresa activa).
- `android:allowBackup="true"` en AndroidManifest.
- Despliegue: `npx cap sync android` → `npx cap open android` → compilar APK/AAB desde Android Studio.
- Sin CI/CD configurado.
