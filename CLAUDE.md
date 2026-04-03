# SMP Reportes — Generador de Reportes de Operación

## ¿Qué es esto?

Aplicación web de escritorio para **Naviera SMP, S.A. de C.V.** (logística portuaria, Veracruz, México). Automatiza la creación de un documento Word (.docx) de ~40 páginas llamado "Reporte de Operación". El problema actual: el usuario tarda **5 horas** encuadrando ~60 fotos manualmente en Word. Esta app lo reduce a **15-20 minutos**.

El archivo de referencia que define el formato exacto es:
`REPORTE_VER_001-2026_MV_STELLAR_INDIGO__V01_VER_IMP.docx`

---

## Stack

- **React 18** (app de una sola página, 6 pasos tipo wizard)
- **Vite** para desarrollo y build
- **Tailwind CSS 3** para estilos
- **docx** (npm, v9+) para generar el .docx en el navegador
- **file-saver** para la descarga
- **lucide-react** para íconos
- **Sin backend** — todo corre 100% en el navegador del usuario
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
- Flujo lineal de 6 pasos

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
│   └── logo-deacero.png   ← Logo DEACERO extraído del TEMPLATE.docx
├── src/
│   ├── main.jsx           ← Entry point
│   ├── App.jsx            ← Componente único con toda la app
│   └── index.css          ← Tailwind + estilos base
├── referencia/
│   └── REPORTE_VER_001-2026_MV_STELLAR_INDIGO__V01_VER_IMP.docx
└── TEMPLATE.docx              ← Plantilla con header/footer de DEACERO
```

### Nota sobre la arquitectura

El `App.jsx` actual es un **archivo único monolítico** con toda la lógica. Esto es intencional para el MVP. Conforme la app crezca, se puede refactorizar en:

```
src/
├── componentes/         ← UI por paso
│   ├── PasoConfiguracion.jsx
│   ├── PasoOperacion.jsx
│   ├── PasoStowage.jsx
│   ├── PasoFotos.jsx
│   ├── PasoSOF.jsx
│   └── PasoGenerar.jsx
├── generador/           ← Lógica de generación del .docx
│   └── generarDocx.js
├── constantes.js        ← Puertos, meses, colores, defaults
└── utilidades/          ← Helpers (leer archivos, formatear números)
```

---

## Los 6 pasos de la app

### Paso 1 — Configuración
- Puerto (select: VER, ALT, LZC, MZT, MNZ, HOU, NOL)
- Consecutivo (ej: "001")
- Año
- Nombre del buque (ej: "STELLAR INDIGO")
- Viaje (ej: "V01")
- **Nota**: El cliente siempre es DEACERO (datos hardcodeados). No hay campos editables de cliente.

### Paso 2 — Datos de Operación
- Tabla de eventos con 5 filas fijas:
  ARRIBO | NOR TENDERED | ATRAQUE | INICIO OPERACIONES | TERMINO OPERACIONES
  Cada una con: Mes (select), Día, Año, Hora
- Fila adicional: CARGA TOTAL (ej: "19,919.000 MT")
- Cantidades Recibidas: filas dinámicas (Descripción, Tipo, Piezas, Tonelaje)
- Bills of Lading: filas dinámicas (Número BL, Puerto, Piezas, Tonelaje)

### Paso 3 — Stowage Plan
- Tabla de bodegas: filas dinámicas (Bodega, Producto, Tonelaje)
  - Default: 6 bodegas (No 01 a No 06)
  - Fila de TOTALES auto-calculada
- Observaciones: textarea libre para texto largo

### Paso 4 — Fotos (EL PASO CLAVE)
- **Fotos de portada**: 2 fotos del buque
- **Fotos de bodegas**: subida masiva, asignación por bodega
  - Drag & drop o clic para subir
  - Cada foto se asigna a una bodega (Bodega 1, 2, 3...) o sección (DESCARGA DE BUQUE, AREA DE ALMACENAMIENTO, DOCUMENTOS)
  - Reordenar fotos con drag & drop
  - Cambiar bodega con selector dropdown en cada foto
  - Preview en miniatura de cómo quedarán las páginas (2 fotos por página)

### Paso 5 — Statements of Facts
- Entradas por día: Fecha + Día de la semana
- Cada día tiene líneas: Hora inicio, Hora fin, Actividad
- Ejemplo: "00:01 - 05:30 DISCHARGING WITH THREE GANGS IN HOLDS 1, 3 & 5"

### Paso 6 — Generar Reporte
- Resumen visual de todo el contenido
- Checklist de completitud
- Preview miniatura de las páginas de fotos
- Botón grande: "Generar Reporte .docx"
- Descarga directa del archivo

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

### Header (TODAS las páginas) — FIJO excepto código de operación

El cliente siempre es **DEACERO**. El header y footer están hardcodeados.

Elementos en orden:
1. **Barra naranja**: imagen PNG de 349×13px, color `#FF6600` (rgb 255,102,0), estirada al ancho ~286pt
2. **Título**: "REPORTE DE OPERACIÓN  PUERTOS MEXICO / USA" — bold, 14pt (size 28 half-points)
3. **Logo DEACERO**: alineado a la derecha, ~120×36pt (cargado desde `public/logo-deacero.png`, extraído del TEMPLATE.docx)
4. **Código de operación** (LO ÚNICO QUE CAMBIA): "{PUERTO}-LP-{CONSECUTIVO}-{AÑO}  MV {BUQUE}   {VIAJE} VCZ" — Arial bold, 12pt (size 24)

### Footer (TODAS las páginas) — FIJO

3 líneas centradas (datos hardcodeados de DEACERO):
1. "DEACERO SAPI DE CV DEA7103086X2"
2. "Av. Lázaro Cárdenas 2333, Col. Valle Oriente, San Pedro Garza Garcia, Nuevo Leon. CP 66269"
3. "Tel. 01 800 021 33 22"

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

### Página 3 — Stowage Plan + Observaciones

**Tabla 4: Stowage Plan** (1701 + 2976 + 2348 = 7025 DXA)
- Headers: BODEGA | PRODUCTO | TONELAJE (MT)
- Filas: No 01 a No 06
- Fila de TOTALES al final

Después de la tabla:
- Título "OBSERVACIONES:" — bold
- Texto largo libre (párrafo continuo)

### Páginas 4-34+ — Fotos de Bodegas

Cada grupo de bodega empieza con:
- Título centrado: "BODEGA No XX" — Arial bold 14pt

Cada página tiene:
- 2 fotos apiladas verticalmente, centradas
- Ancho de cada foto: **5,612,130 EMU** (constante)
- Alto: proporcional al aspect ratio de la imagen original
- Debajo de cada foto: label "Bodega X" en naranja bold

Secciones adicionales después de las bodegas:
- "DESCARGA DE BUQUE" — fotos de la descarga
- "AREA DE ALMACENAMIENTO" — fotos del almacén
- "DOCUMENTOS" — fotos de documentación

### Páginas finales — Statements of Facts

- Título centrado: "STATEMENTS OF FACTS"
- Subtítulo: "M.V {BUQUE} {VIAJE}"
- Por cada día:
  - Fecha en bold (ej: "JANUARY 18TH 2026.")
  - Día en bold (ej: "SUNDAY")
  - Líneas: "HH:MM-HH:MM ACTIVIDAD"

---

## Reglas de generación del .docx

1. Usar librería `docx` de npm (no manipulación XML directa)
2. Importar: `Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, Header, Footer, AlignmentType, BorderStyle, WidthType, ShadingType, PageBreak, VerticalAlign`
3. Tablas: siempre usar `WidthType.DXA`, nunca `WidthType.PERCENTAGE`
4. Tablas: poner AMBOS `columnWidths` en la tabla Y `width` en cada celda
5. Sombreado: usar `ShadingType.CLEAR`, nunca `SOLID`
6. Imágenes: siempre especificar `type: 'jpg'` o `type: 'png'`
7. Saltos de página: `new Paragraph({ children: [new PageBreak()] })`
8. Nunca usar `\n` — usar `Paragraph` separados
9. Font del documento: Arial para todo el contenido del doc
10. Fotos de bodega: ordenar por bodega (1, 2, 3...) manteniendo el orden del usuario dentro de cada bodega
11. `Packer.toBlob()` para generar y descargar con file-saver o link temporal

---

## Nombre del archivo generado

```
REPORTE_{PUERTO}_{CONSECUTIVO}-{AÑO}_MV_{BUQUE}__V01_{PUERTO}_IMP.docx
```

Ejemplo: `REPORTE_VER_001-2026_MV_STELLAR_INDIGO__V01_VER_IMP.docx`

---

## Qué mejorar después del MVP

- [ ] Guardar reporte en progreso (localStorage o Supabase)
- [ ] Preview en tiempo real del documento (renderizar páginas como canvas)
- [ ] Refactorizar App.jsx en componentes separados
- [ ] @dnd-kit para drag & drop más robusto
- [ ] Comprimir fotos antes de insertar (reducir peso del .docx)
- [ ] Calcular altura de imagen proporcionalmente al aspect ratio real
- [ ] Exportar/importar datos del reporte como JSON
- [ ] Añadir logo de NAVIERA DELREM en sección SOF
- [ ] Validación de campos obligatorios antes de generar

---

## Datos del proyecto

- **Empresa**: Naviera SMP, S.A. de C.V.
- **Web**: https://navierasmp.com.mx/
- **Usuario final**: Operador portuario (nivel técnico bajo, usa desktop)
- **Documento de referencia**: `referencia/REPORTE_VER_001-2026_MV_STELLAR_INDIGO__V01_VER_IMP.docx`
