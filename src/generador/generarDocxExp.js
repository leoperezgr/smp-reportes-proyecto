// Generador de .docx — Modo EXPORTACIÓN (EXP)
import { TABLA_CANTIDADES, TABLA_BL, TABLA_EXISTENCIAS } from '../constantes'
import { formatearTonelaje, parsearTonelaje } from '../utilidades'
import {
  cargarDocx, crearBordes, crearCelda, crearFilaSeparadora, crearSeccion,
  construirPortada, construirTablaEventos, construirObservaciones, construirFotos, postProcesarTemplate,
  calcularObjetivoKBPorFoto,
} from './comun'

export default async function generarDocxExp({ config, operacion, stowage, exportacion, fotos, fotosPortada, devolverBlob = false }) {
  const docx = await cargarDocx()
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, Header, Footer, AlignmentType, WidthType, PageBreak, TableLayoutType } = docx

  const bordesObj = crearBordes(docx.BorderStyle)
  const { bordes } = bordesObj
  const celda = crearCelda(docx, bordes)
  const filaSeparadora = crearFilaSeparadora(docx, bordes)
  const seccion = crearSeccion()
  const cb = { fuente: 'Cambria', tamano: 22 }

  // ═══ PORTADA ═══
  const objetivoKB = calcularObjetivoKBPorFoto((fotosPortada?.length || 0) + (fotos?.length || 0))
  const portada = await construirPortada(docx, fotosPortada, objetivoKB)

  // ═══ PÁGINA 2: EVENTOS + TABLAS BL ═══
  const tablaEventos = construirTablaEventos(docx, operacion, bordesObj)

  const pag2 = [
    new Paragraph({ spacing: { before: 0, after: 0 }, children: [] }),
    tablaEventos,
  ]

  // Tablas BL con columna DESCRIPCION ancha (layout fijo, centrada)
  const cbExp = { fuente: 'Cambria', tamano: 22 }
  const colsBLExp = [7200, 1200, 900, 1500]
  const totalBLExp = colsBLExp.reduce((a, b) => a + b, 0)

  for (let bi = 0; bi < operacion.bls.length; bi++) {
    const bl = operacion.bls[bi]
    const numSimple = `BL ${String(bi + 1).padStart(3, '0')}`
    const titulo = ['FORMAMOS ACERO', bl.ciudad, numSimple].filter(Boolean).join(' ')
    const subtitulo = bl.puerto && bl.pais ? `   (${bl.puerto} , ${bl.pais})` : ''
    const cantidades = bl.cantidades || []

    // Un BL por página: forzar salto antes de cada BL excepto el primero
    // + enter en blanco para separar el título del header
    if (bi > 0) {
      pag2.push(new Paragraph({ children: [new PageBreak()] }))
      pag2.push(new Paragraph({ children: [] }))
    }

    pag2.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 80 },
      keepNext: true,
      children: [
        new TextRun({ text: titulo, bold: true, size: 28, font: 'Calibri' }),
        new TextRun({ text: subtitulo, bold: true, size: 32, font: 'Calibri' }),
      ],
    }))

    // Separador inline con cantSplit (evita que Word parta la fila entre páginas)
    const sepBL = (color) => new TableRow({ cantSplit: true, children: colsBLExp.map((ancho) => celda('', { ancho, fondo: color })) })

    const filasC = [
      new TableRow({ cantSplit: true, children: [celda('DESCRIPCION DEL PRODUCTO', { ancho: colsBLExp[0], negrita: false, alineacion: AlignmentType.CENTER, ...cbExp }), celda('TIPO', { ancho: colsBLExp[1], negrita: false, alineacion: AlignmentType.CENTER, ...cbExp }), celda('PIEZA', { ancho: colsBLExp[2], negrita: false, alineacion: AlignmentType.CENTER, ...cbExp }), celda('TONELAJE (MT)', { ancho: colsBLExp[3], negrita: false, alineacion: AlignmentType.CENTER, ...cbExp })] }),
      sepBL('FFFF00'),
      ...cantidades.map((c) => new TableRow({ cantSplit: true, children: [celda(c.descripcion, { ancho: colsBLExp[0], negrita: true, ...cbExp }), celda(c.tipo, { ancho: colsBLExp[1], alineacion: AlignmentType.CENTER, ...cbExp }), celda((parseInt(c.piezas) || 0).toLocaleString('en-US'), { ancho: colsBLExp[2], alineacion: AlignmentType.CENTER, negrita: true, ...cbExp }), celda(c.tonelaje, { ancho: colsBLExp[3], alineacion: AlignmentType.CENTER, negrita: true, ...cbExp })] })),
      sepBL('FFC000'),
      new TableRow({ cantSplit: true, children: [celda('TOTAL', { ancho: colsBLExp[0], negrita: true, alineacion: AlignmentType.CENTER, ...cbExp }), celda('', { ancho: colsBLExp[1], alineacion: AlignmentType.CENTER, ...cbExp }), celda(cantidades.reduce((s, c) => s + (parseInt(c.piezas) || 0), 0).toLocaleString('en-US'), { ancho: colsBLExp[2], alineacion: AlignmentType.CENTER, negrita: true, ...cbExp }), celda(formatearTonelaje(cantidades.reduce((s, c) => s + parsearTonelaje(c.tonelaje), 0)), { ancho: colsBLExp[3], alineacion: AlignmentType.CENTER, negrita: true, ...cbExp })] }),
    ]
    const indentBL = -Math.round((totalBLExp - 8838) / 2)
    pag2.push(new Table({ layout: TableLayoutType.FIXED, indent: { size: indentBL, type: WidthType.DXA }, width: { size: totalBLExp, type: WidthType.DXA }, columnWidths: colsBLExp, rows: filasC }))
  }
  pag2.push(new Paragraph({ children: [new PageBreak()] }))

  // ═══ PÁGINA 3: GRAN TOTAL + OBSERVACIONES ═══
  const pag3 = [new Paragraph({ children: [] })]

  // Gran Total
  const filasBLData = operacion.bls.map((bl, i) => {
    const numBL = `BL ${String(i + 1).padStart(3, '0')} FORMAMOS ACERO`
    const puertoPais = bl.puerto && bl.pais ? `${bl.puerto}, ${bl.pais}` : bl.puerto || ''
    const totalPiezas = (bl.cantidades || []).reduce((s, c) => s + (parseInt(c.piezas) || 0), 0)
    const totalTonelaje = formatearTonelaje((bl.cantidades || []).reduce((s, c) => s + parsearTonelaje(c.tonelaje), 0))
    return new TableRow({ children: [celda(numBL, { ancho: TABLA_BL.cols[0], ...cb }), celda(puertoPais, { ancho: TABLA_BL.cols[1], alineacion: AlignmentType.CENTER, negrita: true, ...cb }), celda(totalPiezas.toLocaleString('en-US'), { ancho: TABLA_BL.cols[2], alineacion: AlignmentType.CENTER, negrita: true, ...cb }), celda(totalTonelaje, { ancho: TABLA_BL.cols[3], alineacion: AlignmentType.CENTER, negrita: true, ...cb })] })
  })
  const totalPiezasBL = operacion.bls.reduce((s, bl) => s + (bl.cantidades || []).reduce((s2, c) => s2 + (parseInt(c.piezas) || 0), 0), 0)
  const totalTonelajeBL = formatearTonelaje(operacion.bls.reduce((s, bl) => s + (bl.cantidades || []).reduce((s2, c) => s2 + parsearTonelaje(c.tonelaje), 0), 0))

  const filasBL = [
    new TableRow({ children: [celda('NUMERO DE BL', { ancho: TABLA_BL.cols[0], negrita: false, alineacion: AlignmentType.CENTER, ...cb }), celda('PUERTO', { ancho: TABLA_BL.cols[1], negrita: false, alineacion: AlignmentType.CENTER, ...cb }), celda('PIEZAS', { ancho: TABLA_BL.cols[2], negrita: false, alineacion: AlignmentType.CENTER, ...cb }), celda('TONELAJE (MT)', { ancho: TABLA_BL.cols[3], negrita: false, alineacion: AlignmentType.CENTER, ...cb })] }),
    filaSeparadora(TABLA_BL.cols, 'FFFF00'),
    ...filasBLData,
    filaSeparadora(TABLA_BL.cols, 'FFC000'),
    new TableRow({ children: [celda('TOTALES', { ancho: TABLA_BL.cols[0], negrita: false, ...cb }), celda('', { ancho: TABLA_BL.cols[1], alineacion: AlignmentType.CENTER, ...cb }), celda(totalPiezasBL.toLocaleString('en-US'), { ancho: TABLA_BL.cols[2], alineacion: AlignmentType.CENTER, negrita: true, ...cb }), celda(totalTonelajeBL, { ancho: TABLA_BL.cols[3], alineacion: AlignmentType.CENTER, negrita: true, ...cb })] }),
  ]

  pag3.push(
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'GRAN TOTAL', bold: true, size: 28, font: 'Calibri' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [] }),
    new Table({ width: { size: TABLA_BL.total, type: WidthType.DXA }, columnWidths: TABLA_BL.cols, rows: filasBL }),
    new Paragraph({ children: [] }),
  )

  // Observaciones
  pag3.push(...construirObservaciones(docx, stowage))

  // ═══ PÁGINA EXTRA: PARTIDAS + EXISTENCIA ═══
  const pagExp = []
  if (exportacion) {
    // Tabla: TIEMPO DE PARTIDAS EN PATIOS
    pagExp.push(
      new Paragraph({ children: [] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'TIEMPO DE PARTIDAS EN PATIOS / FECHA DE CARGA DE BUQUE / ESTADIAS EN PATIO', bold: true, size: 24, font: 'Calibri' })] }),
      new Paragraph({ children: [] }),
    )

    const meses = { ENERO: 0, FEBRERO: 1, MARZO: 2, ABRIL: 3, MAYO: 4, JUNIO: 5, JULIO: 6, AGOSTO: 7, SEPTIEMBRE: 8, OCTUBRE: 9, NOVIEMBRE: 10, DICIEMBRE: 11 }
    const parsearFecha = (f) => {
      if (!f) return null
      const partes = f.toUpperCase().split('-')
      if (partes.length !== 3) return null
      const dia = parseInt(partes[0])
      const mes = meses[partes[1]]
      const anio = parseInt(partes[2])
      if (isNaN(dia) || mes === undefined || isNaN(anio)) return null
      return new Date(anio, mes, dia)
    }

    const colsPartExp = [3400, 2600, 2600, 2200]
    const totalPartExp = colsPartExp.reduce((a, b) => a + b, 0)
    const indentPart = -Math.round((totalPartExp - 8838) / 2)
    const filasPartidas = [
      new TableRow({ children: [
        celda('', { ancho: colsPartExp[0], ...cb }),
        celda('FECHA ARRIBO', { ancho: colsPartExp[1], alineacion: AlignmentType.CENTER, ...cb }),
        celda('FECHA DE CARGA', { ancho: colsPartExp[2], alineacion: AlignmentType.CENTER, ...cb }),
        celda('ESTADIA EN PUERTO', { ancho: colsPartExp[3], alineacion: AlignmentType.CENTER, ...cb }),
      ] }),
      filaSeparadora(colsPartExp, 'FFFF00'),
      ...exportacion.partidas.map((p) => {
        const d1 = parsearFecha(p.fechaArribo)
        const d2 = parsearFecha(p.fechaCarga)
        const estadia = d1 && d2 ? `${Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)) + 1}  DIAS` : ''
        return new TableRow({ children: [
          celda(p.etiqueta, { ancho: colsPartExp[0], negrita: true, ...cb }),
          celda(p.fechaArribo, { ancho: colsPartExp[1], alineacion: AlignmentType.CENTER, ...cb }),
          celda(p.fechaCarga, { ancho: colsPartExp[2], alineacion: AlignmentType.CENTER, ...cb }),
          celda(estadia, { ancho: colsPartExp[3], alineacion: AlignmentType.CENTER, ...cb }),
        ] })
      }),
      filaSeparadora(colsPartExp, 'FFC000'),
    ]
    pagExp.push(new Table({ layout: TableLayoutType.FIXED, indent: { size: indentPart, type: WidthType.DXA }, width: { size: totalPartExp, type: WidthType.DXA }, columnWidths: colsPartExp, rows: filasPartidas }))

    // Tabla: EXISTENCIA DE CARGA
    pagExp.push(
      new Paragraph({ children: [] }),
      new Paragraph({ children: [] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'EXISTENCIA DE CARGA / ANTES DEL ARRIBO BUQUE / OPERACIONES', bold: true, size: 24, font: 'Calibri' })] }),
      new Paragraph({ children: [] }),
    )

    const filasExist = [
      new TableRow({ children: [
        celda('DIA', { ancho: TABLA_EXISTENCIAS.cols[0], alineacion: AlignmentType.CENTER, ...cb }),
        celda('TONELAJE EN PUERTO', { ancho: TABLA_EXISTENCIAS.cols[1], alineacion: AlignmentType.CENTER, ...cb }),
        celda('% BUQUE', { ancho: TABLA_EXISTENCIAS.cols[2], alineacion: AlignmentType.CENTER, ...cb }),
      ] }),
      filaSeparadora(TABLA_EXISTENCIAS.cols, 'FFFF00'),
      ...exportacion.existencias.map((ex) => new TableRow({ children: [
        celda(ex.dia, { ancho: TABLA_EXISTENCIAS.cols[0], alineacion: AlignmentType.CENTER, negrita: true, ...cb }),
        celda(ex.tonelaje, { ancho: TABLA_EXISTENCIAS.cols[1], alineacion: AlignmentType.CENTER, negrita: true, ...cb }),
        celda(ex.porcentaje, { ancho: TABLA_EXISTENCIAS.cols[2], alineacion: AlignmentType.CENTER, negrita: true, ...cb }),
      ] })),
      filaSeparadora(TABLA_EXISTENCIAS.cols, 'FFC000'),
    ]
    pagExp.push(new Table({ width: { size: TABLA_EXISTENCIAS.total, type: WidthType.DXA }, columnWidths: TABLA_EXISTENCIAS.cols, rows: filasExist }))
    pagExp.push(new Paragraph({ children: [new PageBreak()] }))
  }

  // ═══ FOTOS ═══
  const pagsFotos = await construirFotos(docx, { fotos, stowage, esExp: true, objetivoKB })

  // ═══ GENERAR DOCUMENTO ═══
  const dummyP = new Paragraph({ children: [] })
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [{
      properties: seccion,
      headers: { default: new Header({ children: [dummyP] }) },
      footers: { default: new Footer({ children: [dummyP] }) },
      children: [...portada, ...pag2, ...pag3, ...pagExp, ...pagsFotos],
    }],
  })

  const blobInicial = await Packer.toBlob(doc)
  const blobFinal = await postProcesarTemplate(blobInicial, config)

  const nombre = `REPORTE_${config.puerto}_${config.consecutivo}-${config.anio}_MV_${(config.buque || 'BUQUE').replace(/\s+/g, '_')}__${config.viaje}_${config.puerto}_EXP.docx`

  if (devolverBlob) return { blob: blobFinal, nombre }

  const link = document.createElement('a')
  link.href = URL.createObjectURL(blobFinal)
  link.download = nombre
  link.click()
  URL.revokeObjectURL(link.href)
}
