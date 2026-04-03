# SMP Reportes — Generador de Reportes de Operación

## ¿Qué es esto?

Aplicación web de escritorio para **Naviera SMP, S.A. de C.V.** (logística portuaria, Veracruz, México). Automatiza la creación de un documento Word (.docx) de ~40 páginas llamado "Reporte de Operación". El problema actual: el usuario tarda **5 horas** encuadrando ~60 fotos manualmente en Word. Esta app lo reduce a **15-20 minutos**.

El archivo de referencia que define el formato exacto es:
`REPORTE_VER_001-2026_MV_STELLAR_INDIGO__V01_VER_IMP.docx`

---

## Stack

- **React 18** (app de una sola página, 5 pasos tipo wizard + homepage)
- **Vite** para desarrollo y build
- **Tailwind CSS 3** para estilos
- **docx** (npm, v9+) para generar el body del .docx en el navegador
- **jszip** para post-procesar el .docx con el template de DEACERO
- **file-saver** para la descarga
- **lucide-react** para íconos
- **Sin backend** — todo corre 100% en el navegador del usuario
- **Persistencia**: localStorage (datos) + IndexedDB (fotos)
- **Idioma de la interfaz**: TODO en español (componentes, variables, comentarios, UI)

---

## Cómo arrancar

```bash
npm install
npm run dev        # abre localhost:5173
npm run build      # build de producción en dist/
```

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

## Estructura de archivos actual

```
smp-reportes/
├── CLAUDE.md              ← Este archivo
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── public/
│   ├── favicon.svg
│   └── TEMPLATE-DEACERO.docx  ← Template base con headers/footers de DEACERO
├── src/
│   ├── main.jsx           ← Entry point
│   ├── App.jsx            ← Componente único con toda la app (~1,300 líneas)
│   ├── almacenamiento.js  ← Capa de persistencia (localStorage + IndexedDB)
│   └── index.css          ← Tailwind + estilos base
└── referencia/
    ├── REPORTE_VER_001-2026_MV_STELLAR_INDIGO__V01_VER_IMP.docx
    └── TEMPLATE-DEACERO.docx  ← Plantilla origen del header/footer
```

### Nota sobre la arquitectura

El `App.jsx` actual es un **archivo único monolítico** con toda la lógica (~1,300 líneas). La persistencia vive en `almacenamiento.js`. Esto es intencional para el MVP. Conforme la app crezca, se puede refactorizar en:

```
src/
├── componentes/         ← UI por paso
│   ├── PasoConfiguracion.jsx
│   ├── PasoOperacion.jsx
│   ├── PasoStowage.jsx
│   ├── PasoFotos.jsx
│   └── PasoGenerar.jsx
├── generador/           ← Lógica de generación del .docx
│   └── generarDocx.js
├── constantes.js        ← Puertos, meses, colores, defaults
└── utilidades/          ← Helpers (leer archivos, formatear números)
```

---

## Flujo de la app

### Homepage — Panel de Reportes

Pantalla inicial que muestra todos los reportes guardados:
- Tarjetas con: nombre del buque, barra de progreso, última edición
- Estadísticas: Total | Completados | En Progreso
- Botones por reporte: Continuar, Descargar, Eliminar
- Botón para crear nuevo reporte

### Los 5 pasos del wizard

#### Paso 1 — Configuración
- Puerto (select: VER, ALT, LZC, MZT, MNZ, HOU, NOL)
- Consecutivo (ej: "001")
- Año
- Nombre del buque (ej: "STELLAR INDIGO")
- Viaje (ej: "V01")
- **Nota**: El cliente siempre es DEACERO (datos hardcodeados). No hay campos editables de cliente.

#### Paso 2 — Datos de Operación
- Campo `arriboA`: ubicación de arribo (inline junto a "ARRIBO A ___")
- Tabla de eventos con 5 filas fijas:
  ARRIBO | NOR TENDERED | ATRAQUE | INICIO OPERACIONES | TERMINO OPERACIONES
  Cada una con: Mes (select), Día, Año, Hora (auto-formato HH:MM al perder foco)
- Fila adicional: CARGA TOTAL (ej: "19,919.000 MT") — auto-formato de tonelaje al perder foco
- Cantidades Recibidas: filas dinámicas (Descripción, Tipo, Piezas, Tonelaje)
- Bills of Lading: filas dinámicas (Número BL, Puerto, Piezas, Tonelaje)

#### Paso 3 — Stowage Plan
- Tabla de bodegas: filas dinámicas (Bodega, Producto, Tonelaje)
  - Default: 5 bodegas (No 01 a No 05)
  - Fila de TOTALES auto-calculada
- Observaciones: textarea libre para texto largo

#### Paso 4 — Fotos (EL PASO CLAVE)
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

#### Paso 5 — Generar Reporte
- Resumen visual de todo el contenido
- Checklist de completitud
- Preview miniatura de las páginas de fotos
- Botón grande: "Generar Reporte .docx"
- Descarga directa del archivo

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

Estas medidas vienen del análisis del archivo de referencia original.

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

El cliente siempre es **DEACERO**. Header y footer vienen directamente del archivo `referencia/TEMPLATE-DEACERO.docx` (copiado a `public/`), lo que garantiza que son **pixel-perfect** con el documento de referencia.

**Lo ÚNICO que cambia** en el header es el texto placeholder `-----` que se reemplaza por:
`{PUERTO}-LP-{CONSECUTIVO}-{AÑO}  MV {BUQUE}   {VIAJE} VCZ`

**Mecanismo**: Después de generar el body con la librería `docx`, se usa JSZip para:
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

**Tabla 1: Eventos** (4416 + 4412 = 8828 DXA)
- 2 columnas: Evento | Datos (mes, día, año, hora en texto corrido)
- 5 filas de eventos + 1 fila de CARGA TOTAL

**Tabla 2: Cantidades Recibidas** (4600 + 1035 + 978 + 2215 = 8828 DXA)
- Headers: DESCRIPCION DEL PRODUCTO | TIPO | PIEZA | TONELAJE (MT)
- Fila de TOTAL al final

**Tabla 3: Gran Total / BLs** (2802 + 2976 + 993 + 2348 = 9119 DXA)
- Headers: NUMERO DE BL | PUERTO | PIEZAS | TONELAJE (MT)
- Fila de TOTALES al final

**Nota**: Las tablas incluyen filas separadoras con color (amarillo FFFF00, naranja FFC000) entre secciones.

### Página 3 — Stowage Plan + Observaciones

**Tabla 4: Stowage Plan** (1701 + 2976 + 2348 = 7025 DXA)
- Headers: BODEGA | PRODUCTO | TONELAJE (MT)
- Filas: No 01 a No 05 (default)
- Fila de TOTALES al final

Después de la tabla:
- Título "OBSERVACIONES:" — bold
- Texto largo libre (párrafo continuo)

### Páginas 4-34+ — Fotos de Bodegas

Cada grupo de bodega empieza con:
- Título centrado: "BODEGA No XX" — Calibri bold 14pt

Cada página tiene:
- 2 fotos apiladas verticalmente, centradas
- Ancho de cada foto: **5,612,130 EMU** (constante)
- Alto: proporcional al aspect ratio de la imagen original
- Debajo de cada foto: label "Bodega X" en naranja bold

Secciones adicionales después de las bodegas (en este orden):
1. "DESCARGA DE BUQUE" — fotos de la descarga
2. "AREA DE ALMACENAMIENTO" — fotos del almacén
3. "DOCUMENTOS" — fotos de documentación (incluye Statements of Facts como fotos escaneadas)

---

## Reglas de generación del .docx

1. Usar librería `docx` de npm para generar el body, y `jszip` para post-procesar con el template
2. Importar: `Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, Header, Footer, AlignmentType, BorderStyle, WidthType, ShadingType, PageBreak, VerticalAlign`
3. Tablas: siempre usar `WidthType.DXA`, nunca `WidthType.PERCENTAGE`
4. Tablas: poner AMBOS `columnWidths` en la tabla Y `width` en cada celda
5. Sombreado: usar `ShadingType.CLEAR`, nunca `SOLID`
6. Imágenes: siempre especificar `type: 'jpg'` o `type: 'png'`. La librería `docx` usa píxeles a 96 DPI en `transformation` (no puntos tipográficos a 72 DPI)
7. Saltos de página: `new Paragraph({ children: [new PageBreak()] })`
8. Nunca usar `\n` — usar `Paragraph` separados
9. Font del documento: Calibri para todo el contenido del doc (Cambria en tablas específicas)
10. Fotos de bodega: ordenar por bodega (1, 2, 3...) manteniendo el orden del usuario dentro de cada bodega
11. Secciones después de bodegas siempre en orden: DESCARGA DE BUQUE → AREA DE ALMACENAMIENTO → DOCUMENTOS
12. Tamaños de fotos en el .docx (píxeles a 96 DPI): portada 590px ancho, bodegas 590px ancho (2 por página), documentos 545px ancho (1 por página)
13. `Packer.toBlob()` para generar y descargar con file-saver o link temporal
14. Bordes de tabla: `size: 4`

---

## Nombre del archivo generado

```
REPORTE_{PUERTO}_{CONSECUTIVO}-{AÑO}_MV_{BUQUE}__V01_{PUERTO}_IMP.docx
```

Ejemplo: `REPORTE_VER_001-2026_MV_STELLAR_INDIGO__V01_VER_IMP.docx`

---

## Utilidades en App.jsx

| Función | Propósito |
|---------|-----------|
| `uid()` | Genera IDs aleatorios |
| `leerComoDataURL(file)` | Lee archivo como data URL |
| `leerComoArrayBuffer(file)` | Lee archivo como ArrayBuffer |
| `leerImagen(dataURL)` | Carga imagen y retorna dimensiones |
| `formatearHora(valor)` | Auto-formatea hora (ej: "1630" → "16:30") |
| `parsearTonelaje(str)` | Parsea tonelaje con soporte de comas |
| `formatearTonelaje(valor)` | Formatea número a 3 decimales (ej: "19,919.000") |
| `obtenerDimensiones(dataURL)` | Detecta aspect ratio de imagen |
| `actualizarProfundo(obj, ruta, valor)` | Actualización profunda de estado via dot notation |

---

## Qué mejorar después del MVP

- [ ] Preview en tiempo real del documento (renderizar páginas como canvas)
- [ ] Refactorizar App.jsx en componentes separados
- [ ] @dnd-kit para drag & drop más robusto
- [ ] Comprimir fotos antes de insertar (reducir peso del .docx)
- [ ] Exportar/importar datos del reporte como JSON
- [ ] Validación de campos obligatorios antes de generar

---

## Datos del proyecto

- **Empresa**: Naviera SMP, S.A. de C.V.
- **Web**: https://navierasmp.com.mx/
- **Usuario final**: Operador portuario (nivel técnico bajo, usa desktop)
- **Documento de referencia**: `referencia/REPORTE_VER_001-2026_MV_STELLAR_INDIGO__V01_VER_IMP.docx`
