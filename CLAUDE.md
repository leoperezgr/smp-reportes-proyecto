# SMP Reportes — Generador de Reportes de Operación

## ¿Qué es esto?

Aplicación de escritorio (Electron) para **Naviera SMP, S.A. de C.V.** (logística portuaria, Veracruz, México). Automatiza la creación de un documento Word (.docx) de ~40 páginas llamado "Reporte de Operación". El problema actual: el usuario tarda **5 horas** encuadrando ~60 fotos manualmente en Word. Esta app lo reduce a **15-20 minutos**.

El archivo de referencia que define el formato exacto es:
`REPORTE_VER_001-2026_MV_STELLAR_INDIGO__V01_VER_IMP.docx`

---

## Stack

- **React 18** (app de una sola página, 5 pasos tipo wizard + homepage)
- **Vite** para desarrollo y build del frontend
- **Electron** como shell de escritorio (Windows .exe, macOS .dmg)
- **electron-updater** para auto-actualizaciones vía GitHub Releases
- **electron-builder** para empaquetar los instaladores
- **Tailwind CSS 3** para estilos
- **docx** (npm, v9+) para generar el body del .docx en el navegador
- **jszip** para post-procesar el .docx con el template de DEACERO
- **file-saver** para la descarga
- **lucide-react** para íconos
- **Sin backend** — todo corre 100% en el cliente
- **Persistencia**: localStorage (datos) + IndexedDB (fotos)
- **CI/CD**: GitHub Actions (build Windows .exe en push a main o tags `v*`)
- **Idioma de la interfaz**: TODO en español (componentes, variables, comentarios, UI)

---

## Cómo arrancar

```bash
npm install
npm run dev              # Vite dev server en localhost:5173 (solo web)
npm run build            # Build de producción en dist/
npm run electron:dev     # Build Vite + abre Electron en modo dev
npm run electron:build   # Build Vite + genera .exe Windows (publica a GitHub Releases)
npm run electron:build:mac  # Build Vite + genera .dmg macOS
```

---

## Electron

### Proceso principal (`electron/main.cjs`)

- Ventana: 1280×900 (mínimo 1024×700), sin menú
- Dev: carga `VITE_DEV_SERVER_URL`, abre DevTools
- Producción: carga `dist/index.html`
- Auto-update: `autoUpdater.checkForUpdatesAndNotify()` al iniciar
- Diálogo de actualización: al descargar nueva versión, pregunta "Reiniciar ahora"

### Build y distribución

- **electron-builder** configurado en `package.json` → sección `"build"`
- AppId: `com.navierasmp.reportes`
- Output: carpeta `release/`
- Windows: instalador NSIS one-click
- macOS: DMG
- Publica a GitHub Releases (owner: `leoperezgr`, repo: `smp-reportes-proyecto`)
- El template `TEMPLATE-DEACERO.docx` se incluye como `extraResources`

### CI/CD (`.github/workflows/build-exe.yml`)

- Trigger: push a `main`, tags `v*`, o `workflow_dispatch`
- Runner: `windows-latest`, Node 22
- Pasos: checkout → npm ci → `npm run electron:build` → sube .exe como artifact
- Requiere `GH_TOKEN` para publicar releases

---

## Design System

| Token           | Valor     | Uso                                    |
|-----------------|-----------|----------------------------------------|
| Navy            | `#0C1D2E` | Color principal, textos, fondos oscuros |
| Accent          | `#EA580C` | Botones, badges, acentos de UI         |
| Accent Light    | `#FFF7ED` | Fondos de filas resaltadas             |
| Barra doc       | `#FF6600` | Barra naranja del header del .docx     |
| Fuente títulos  | `Lexend`  | Headers, botones, labels               |
| Fuente cuerpo   | `Source Sans 3` | Inputs, textos, contenido        |

El usuario tiene nivel técnico bajo. La UX debe ser:
- Botones grandes y claros
- Drag & drop visual para fotos
- Sin diálogos complicados
- Flujo lineal de 5 pasos

---

## Estructura de archivos

```
smp-reportes-proyecto/
├── CLAUDE.md
├── package.json
├── vite.config.js           ← base: './' para compatibilidad con Electron
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── electron/
│   └── main.cjs             ← Proceso principal de Electron
├── public/
│   ├── favicon.svg
│   ├── icon.png              ← Ícono de la ventana Electron
│   └── TEMPLATE-DEACERO.docx
├── src/
│   ├── main.jsx              ← Entry point React
│   ├── App.jsx               ← Estado global + routing de pasos (~280 líneas)
│   ├── almacenamiento.js     ← Persistencia (localStorage + IndexedDB)
│   ├── constantes.js         ← Puertos, eventos, meses, medidas del doc, datos DEACERO
│   ├── utilidades.js         ← Helpers: uid, leerImagen, formatearHora, etc.
│   ├── validacion.js         ← Validación por paso (campos faltantes)
│   ├── index.css             ← Tailwind + estilos base
│   ├── componentes/
│   │   ├── ui.jsx            ← Componentes UI compartidos
│   │   ├── PaginaInicio.jsx  ← Homepage con panel de reportes
│   │   ├── PasoConfig.jsx    ← Paso 1: Configuración
│   │   ├── PasoOperacion.jsx ← Paso 2: Datos de Operación
│   │   ├── PasoStowage.jsx   ← Paso 3: Stowage Plan
│   │   ├── PasoFotos.jsx     ← Paso 4: Fotos de Bodegas
│   │   └── PasoGenerar.jsx   ← Paso 5: Generar Reporte
│   └── generador/
│       └── generarDocx.js    ← Lógica de generación del .docx (~324 líneas)
├── .github/
│   └── workflows/
│       └── build-exe.yml     ← GitHub Actions: build Windows .exe
└── referencia/               ← (en .gitignore) Archivos de referencia privados
    ├── REPORTE_VER_001-2026_MV_STELLAR_INDIGO__V01_VER_IMP.docx
    └── TEMPLATE-DEACERO.docx
```

---

## Flujo de la app

### Homepage — Panel de Reportes (`PaginaInicio.jsx`)

Pantalla inicial que muestra todos los reportes guardados:
- Tarjetas con: nombre del buque, barra de progreso, última edición
- Estadísticas: Total | Completados | En Progreso
- Botones por reporte: Continuar, Descargar, Eliminar
- Botón para crear nuevo reporte

### Los 5 pasos del wizard

#### Paso 1 — Configuración (`PasoConfig.jsx`)
- Puerto (select: VER, ALT, LZC, MZT, MNZ, HOU, NOL)
- Consecutivo (ej: "001")
- Año
- Nombre del buque (ej: "STELLAR INDIGO")
- Viaje (ej: "V01")
- **Nota**: El cliente siempre es DEACERO (datos hardcodeados en `constantes.js`). No hay campos editables de cliente.

#### Paso 2 — Datos de Operación (`PasoOperacion.jsx`)
- Campo `arriboA`: ubicación de arribo (inline junto a "ARRIBO A ___")
- Tabla de eventos con 5 filas fijas:
  ARRIBO | NOR TENDERED | ATRAQUE | INICIO OPERACIONES | TERMINO OPERACIONES
  Cada una con: Mes (select), Día, Año, Hora (auto-formato HH:MM al perder foco)
- Fila adicional: CARGA TOTAL (ej: "19,919.000 MT") — auto-formato de tonelaje al perder foco
- Cantidades Recibidas: filas dinámicas (Descripción, Tipo, Piezas, Tonelaje)
- Bills of Lading: filas dinámicas (Número BL, Puerto, Piezas, Tonelaje)

#### Paso 3 — Stowage Plan (`PasoStowage.jsx`)
- Tabla de bodegas: filas dinámicas (Bodega, Producto, Tonelaje)
  - Default: 5 bodegas (No 01 a No 05)
  - Fila de TOTALES auto-calculada
- Observaciones: textarea libre para texto largo

#### Paso 4 — Fotos (`PasoFotos.jsx`) — EL PASO CLAVE
- **Fotos de portada**: 2 fotos del buque
- **Fotos de bodegas**: subida masiva, asignación por bodega
  - Pestañas de categoría arriba (Bodega 1, Bodega 2, ...) + botón "Todas" al final
  - Zona de subida solo visible al seleccionar una categoría específica (no en "Todas")
  - Encabezados de sección solo visibles en vista "Todas"
  - Drag & drop o clic para subir
  - Cada foto se asigna a una bodega o sección (DESCARGA DE BUQUE, AREA DE ALMACENAMIENTO, DOCUMENTOS)
  - Reordenar fotos con drag & drop
  - Cambiar bodega con selector dropdown en cada foto
  - Preview en miniatura de cómo quedarán las páginas (2 fotos por página)

#### Paso 5 — Generar Reporte (`PasoGenerar.jsx`)
- Resumen visual de todo el contenido
- Checklist de completitud
- Preview miniatura de las páginas de fotos
- Botón grande: "Generar Reporte .docx"
- Descarga directa del archivo

---

## Validación (`validacion.js`)

`validarPaso(indicePaso, datos)` retorna `{ completo, faltantes }`:

| Paso | Validación |
|------|-----------|
| 0 (Config) | Nombre del buque no vacío |
| 1 (Operación) | Al menos 1 evento con fecha + carga total > 0 |
| 2 (Stowage) | Al menos 1 bodega con producto y tonelaje > 0 |
| 3 (Fotos) | 2+ fotos portada + 1+ foto de bodega |

---

## Constantes (`constantes.js`)

- `PUERTOS`: 7 puertos (VER, ALT, LZC, MZT, MNZ, HOU, NOL)
- `EVENTOS`: 5 eventos fijos de operación
- `MESES`: 12 meses en español
- `SECCIONES_EXTRA`: DESCARGA DE BUQUE, AREA DE ALMACENAMIENTO, CARGA DE BUQUE, DOCUMENTOS
- `PASOS`: definición de los 5 pasos del wizard (clave, etiqueta, ícono)
- `DOC`: medidas exactas del documento en DXA/EMU
- `TABLA_EVENTOS`, `TABLA_CANTIDADES`, `TABLA_BL`, `TABLA_STOWAGE`: anchos de columnas
- `CLIENTE`: datos fijos de DEACERO (nombre, RFC, dirección, teléfono)
- `configInicial()`, `operacionInicial()`, `stowageInicial()`: valores default de estado

---

## Utilidades (`utilidades.js`)

| Función | Propósito |
|---------|-----------|
| `uid()` | Genera IDs aleatorios |
| `leerComoDataURL(archivo)` | Lee archivo como data URL |
| `leerComoArrayBuffer(archivo)` | Lee archivo como ArrayBuffer |
| `leerImagen(archivo)` | Lee archivo como Uint8Array |
| `formatearHora(valor)` | Auto-formatea hora (ej: "1630" → "16:30") |
| `parsearTonelaje(str)` | Parsea tonelaje con soporte de comas |
| `formatearTonelaje(valor)` | Formatea número a 3 decimales (ej: "19,919.000") |
| `obtenerDimensiones(archivo)` | Detecta ancho/alto de imagen via createObjectURL |
| `actualizarProfundo(obj, ruta, valor)` | Actualización profunda de estado via dot notation |
| `formatearFechaRelativa(iso)` | "Hace 5 min", "Hace 2d", etc. |

---

## Persistencia y almacenamiento (`almacenamiento.js`)

La app guarda reportes en progreso usando APIs nativas del navegador (sin backend):

### localStorage — datos ligeros
- `smp-reportes-indice` → Array de metadatos de reportes (id, nombre, fecha, progreso)
- `smp-reporte-{id}` → JSON con datos del reporte (config, operacion, stowage, pasoActual, generado)

### IndexedDB — fotos (blobs pesados)
- Base de datos: `smp-reportes-db`
- Object stores: `fotos`, `fotosPortada`
- Key: `{reporteId}-{fotoId}`
- Almacena: blob + metadata (categoriaKey, nombre, fotoId)

### Funciones exportadas

| Función | Tipo | Propósito |
|---------|------|-----------|
| `obtenerIndice()` | Sync | Obtiene lista de reportes de localStorage |
| `guardarIndice(indice)` | Sync | Guarda lista de reportes en localStorage |
| `guardarReporte(id, datos)` | Sync | Guarda datos de un reporte en localStorage |
| `cargarReporte(id)` | Sync | Carga datos de un reporte de localStorage |
| `eliminarReporte(id)` | Sync | Elimina reporte + lo remueve del índice |
| `guardarFotosReporte(id, fotos, fotosPortada)` | Async | Guarda todas las fotos en IndexedDB |
| `cargarFotosReporte(id)` | Async | Carga todas las fotos de un reporte de IndexedDB |
| `eliminarFotosReporte(id)` | Async | Elimina todas las fotos de un reporte |
| `calcularProgreso(datos)` | Sync | Calcula % de completitud del reporte |

### Auto-guardado

- Datos de texto: auto-guardado con debounce de **1.5 segundos** tras cada cambio
- Fotos: guardado inmediato en IndexedDB cuando cambian
- Flujo: estado React → useEffect detecta cambio → debounce → `flushGuardado()`

### Cálculo de progreso (`calcularProgreso`)

| Peso | Criterio |
|------|----------|
| 15%  | Nombre del buque presente |
| 20%  | Eventos de operación + carga total |
| 20%  | Bodegas con tonelaje |
| 35%  | 2+ fotos de portada + fotos de bodegas |
| 10%  | Reporte generado |

---

## Especificación EXACTA del documento .docx

Estas medidas vienen del análisis del archivo de referencia original. Las constantes viven en `constantes.js`.

### Medidas de página

| Propiedad         | Valor (DXA)  | Equivalente      |
|-------------------|-------------|------------------|
| Ancho de hoja     | 12,240      | 8.5" (US Letter) |
| Alto de hoja      | 15,840      | 11" (US Letter)  |
| Margen superior   | 1,417       | ~1"              |
| Margen inferior   | 1,417       | ~1"              |
| Margen izquierdo  | 1,701       | ~1.18"           |
| Margen derecho    | 1,701       | ~1.18"           |
| Header            | 708         |                  |
| Footer            | 708         |                  |
| **Ancho contenido** | **8,838** | **~6.14"**       |

### Header y Footer — DIRECTAMENTE del TEMPLATE

El cliente siempre es **DEACERO**. Header y footer vienen directamente del archivo `TEMPLATE-DEACERO.docx`, lo que garantiza que son **pixel-perfect** con el documento de referencia.

**Lo ÚNICO que cambia** en el header es el texto placeholder `-----` que se reemplaza por:
`{PUERTO}-LP-{CONSECUTIVO}-{AÑO}  MV {BUQUE}   {VIAJE} VCZ`

**Mecanismo** (en `generarDocx.js`): Después de generar el body con la librería `docx`, se usa JSZip para:
1. Abrir el blob generado y el template
2. Copiar los 6 archivos de header/footer del template al documento generado
3. Reemplazar `-----` con el código de operación real
4. Copiar las imágenes del header (barra naranja + logo DEACERO)
5. Actualizar las relaciones XML (.rels) y Content_Types

### Página 1 — Portada

- 2 fotos del buque, centradas, apiladas verticalmente
- Cada foto al ancho completo del contenido: **5,612,130 EMU** (6.14 pulgadas)
- Altos variables según aspect ratio de cada foto (~3.5-3.8 pulgadas)

### Página 2 — Datos de Operación

El contenido varía según el modo (IMP vs EXP):

#### Modo IMP (Importación)

**Tabla 1: Eventos** (5 columnas: 4416 + 1300 + 700 + 900 + 1512 = 8828 DXA)
- Columnas: Evento | Mes | Día | Año | Hora
- 5 filas de eventos + 1 fila de CARGA TOTAL

**Tabla 2: Cantidades Recibidas** (4600 + 1035 + 978 + 2215 = 8828 DXA)
- Headers: DESCRIPCION DEL PRODUCTO | TIPO | PIEZA | TONELAJE (MT)
- Fila de TOTAL al final

**Tabla 3: Gran Total / BLs** (2802 + 2976 + 993 + 2348 = 9119 DXA)
- Headers: NUMERO DE BL | PUERTO | PIEZAS | TONELAJE (MT)
- Fila de TOTALES al final

#### Modo EXP (Exportación)

**Tabla 1: Eventos** — misma estructura que IMP

**Tablas de BL** (por cada BL): columnas anchas con layout fijo y centrado con indent negativo
- Columnas: 7200 + 1200 + 900 + 1500 = 10800 DXA (desborda márgenes intencionalmente, centrada)
- `TableLayoutType.FIXED` para evitar auto-ajuste de Word
- Título: "FORMAMOS ACERO {CIUDAD} BL {NNN}   ({PUERTO} , {PAIS})" — bold centrado
- Headers: DESCRIPCION DEL PRODUCTO | TIPO | PIEZA | TONELAJE (MT)
- Piezas formateadas con coma de miles (ej: `1,959`)
- Filas separadoras: amarillo (FFFF00) después del header, naranja (FFC000) antes del TOTAL

### Página 3

#### Modo IMP: Stowage Plan + Observaciones

**Tabla 4: Stowage Plan** (1701 + 2976 + 2348 = 7025 DXA)
- Headers: BODEGA | PRODUCTO | TONELAJE (MT)
- Filas: No 01 a No 05 (default)
- Fila de TOTALES al final

Después de la tabla:
- Título "OBSERVACIONES:" — bold
- Texto largo libre (párrafo continuo)

#### Modo EXP: Gran Total + BLs + Observaciones

**Tabla Gran Total / BLs** (2802 + 2976 + 993 + 2348 = 9119 DXA)
- Headers: NUMERO DE BL | PUERTO | PIEZAS | TONELAJE (MT)
- Piezas con coma de miles

Después: OBSERVACIONES (mismo formato que IMP)

### Página extra EXP: Partidas + Existencia de Carga

Solo en modo EXP, después de observaciones:

**Tabla: TIEMPO DE PARTIDAS EN PATIOS** (3400 + 2600 + 2600 + 2200 = 10800 DXA)
- Layout fijo, centrada con indent negativo
- Columnas: Etiqueta | FECHA ARRIBO | FECHA DE CARGA | ESTADIA EN PUERTO
- Estadía calculada de forma inclusiva (+1 día)
- Filas separadoras: amarillo + naranja

**Tabla: EXISTENCIA DE CARGA** (2943 + 2943 + 2942 = 8828 DXA)
- Columnas: DIA | TONELAJE EN PUERTO | % BUQUE
- Filas separadoras: amarillo + naranja

### Páginas de Fotos

#### Modo IMP
Cada grupo de bodega empieza con:
- Título centrado: "BODEGA No XX" — Calibri bold 14pt
- Si una bodega no tiene fotos: página con "EMPTY" centrado

#### Modo EXP
- Título único: "CARGA EN BODEGAS DE BUQUE" — todas las fotos de bodegas agrupadas
- Bodegas sin fotos se omiten (no genera página EMPTY)

#### Ambos modos
Cada página tiene:
- 2 fotos apiladas verticalmente, centradas
- Ancho de cada foto: **5,612,130 EMU** (constante)
- Alto: proporcional al aspect ratio de la imagen original

Secciones adicionales después de las bodegas:
- **IMP**: DESCARGA DE BUQUE → AREA DE ALMACENAMIENTO → CARGA DE EQUIPO FFCC → DOCUMENTOS
- **EXP**: AREA DE ALMACENAMIENTO → DOCUMENTOS

---

## Reglas de generación del .docx

1. Lógica separada por modo: `generarDocx.js` (entry point) → `generarDocxImp.js` / `generarDocxExp.js` + `comun.js` (compartido)
2. Usar librería `docx` de npm para generar el body, y `jszip` para post-procesar con el template
3. Importar: `Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, Header, Footer, AlignmentType, BorderStyle, WidthType, ShadingType, PageBreak, VerticalAlign, TableLayoutType`
4. Tablas: siempre usar `WidthType.DXA`, nunca `WidthType.PERCENTAGE`
5. Tablas: poner AMBOS `columnWidths` en la tabla Y `width` en cada celda
6. Sombreado: usar `ShadingType.CLEAR`, nunca `SOLID`
7. Imágenes: siempre especificar `type: 'jpg'` o `type: 'png'`. La librería `docx` usa píxeles a 96 DPI en `transformation` (no puntos tipográficos a 72 DPI)
8. Saltos de página: `new Paragraph({ children: [new PageBreak()] })`
9. Nunca usar `\n` — usar `Paragraph` separados
10. Font del documento: Calibri para todo el contenido del doc (Cambria en tablas específicas)
11. Fotos de bodega: ordenar por bodega (1, 2, 3...) manteniendo el orden del usuario dentro de cada bodega
12. Secciones después de bodegas siempre en orden: DESCARGA DE BUQUE → AREA DE ALMACENAMIENTO → CARGA DE BUQUE → DOCUMENTOS
13. Tamaños de fotos en el .docx (píxeles a 96 DPI): portada 590px ancho, bodegas 590px ancho (2 por página), documentos 545px ancho (1 por página)
14. `Packer.toBlob()` para generar y descargar con file-saver o link temporal
15. Bordes de tabla: `size: 4`
16. Tablas EXP anchas: usar `TableLayoutType.FIXED` + indent negativo para centrar tablas que desbordan márgenes
17. Modo EXP no genera páginas EMPTY para bodegas sin fotos
18. Piezas en tablas EXP siempre con coma de miles via `.toLocaleString()`
19. Estadía en PARTIDAS: cálculo inclusivo (sumar 1 día al resultado de la diferencia de fechas)

---

## Nombre del archivo generado

```
REPORTE_{PUERTO}_{CONSECUTIVO}-{AÑO}_MV_{BUQUE}___{VIAJE}_{PUERTO}_{TIPO}.docx
```

Ejemplos:
- IMP: `REPORTE_VER_001-2026_MV_STELLAR_INDIGO___V01_VER_IMP.docx`
- EXP: `REPORTE_MZT_007-2025_MV_DRACO_FAITH___V2510_MZT_EXP.docx`

---

## Qué mejorar después del MVP

- [ ] Preview en tiempo real del documento (renderizar páginas como canvas)
- [ ] @dnd-kit para drag & drop más robusto
- [ ] Comprimir fotos antes de insertar (reducir peso del .docx)
- [ ] Exportar/importar datos del reporte como JSON
- [x] ~~Refactorizar App.jsx en componentes separados~~ (hecho)
- [x] ~~Validación de campos obligatorios antes de generar~~ (hecho: `validacion.js`)

---

## Datos del proyecto

- **Empresa**: Naviera SMP, S.A. de C.V.
- **Web**: https://navierasmp.com.mx/
- **Usuario final**: Operador portuario (nivel técnico bajo, usa desktop Windows)
- **Versión**: 1.2.4
- **Documento de referencia**: `referencia/REPORTE_VER_001-2026_MV_STELLAR_INDIGO__V01_VER_IMP.docx`

---

## Reglas de versionado

Cada vez que el usuario pida una actualización (nueva feature, fix, cambio), **siempre** incrementar el número de versión en **ambos** lugares:
1. `package.json` → campo `"version"`
2. `src/componentes/PaginaInicio.jsx` → el span con el label `vX.X.X` en el header

Usar versionado semántico: patch (1.1.x) para fixes/cambios menores, minor (1.x.0) para features nuevas.
