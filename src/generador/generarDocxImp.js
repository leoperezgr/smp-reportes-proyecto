// Generador de .docx — Modo IMPORTACIÓN (IMP)
import { TABLA_CANTIDADES, TABLA_BL, TABLA_STOWAGE, CLIENTE } from '../constantes'
import { formatearTonelaje, parsearTonelaje } from '../utilidades'
import {
  cargarDocx, crearBordes, crearCelda, crearFilaSeparadora, crearSeccion,
  construirPortada, construirTablaEventos, construirObservaciones, construirFotos, postProcesarTemplate,
  calcularObjetivoKBPorFoto,
} from './comun'

export default async function generarDocxImp({ config, operacion, stowage, fotos, fotosPortada, devolverBlob = false }) {
  const docx = await cargarDocx()
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, Header, Footer, AlignmentType, WidthType, PageBreak } = docx

  const bordesObj = crearBordes(docx.BorderStyle)
  const { bordes } = bordesObj
  const celda = crearCelda(docx, bordes)
  const filaSeparadora = crearFilaSeparadora(docx, bordes)
  const seccion = crearSeccion()
  const cb = { fuente: 'Cambria', tamano: 22 }

  // ═══ PORTADA ═══
  const objetivoKB = calcularObjetivoKBPorFoto((fotosPortada?.length || 0) + (fotos?.length || 0))
  const portada = await construirPortada(docx, fotosPortada, objetivoKB)

  // ═══ PÁGINA 2: EVENTOS + CANTIDADES + GRAN TOTAL ═══
  const tablaEventos = construirTablaEventos(docx, operacion, bordesObj)

  const pag2 = [
    new Paragraph({ children: [] }),
    new Paragraph({ children: [] }),
    tablaEventos,
    new Paragraph({ children: [] }),
  ]

  // Cantidades Recibidas
  pag2.push(new Paragraph({ children: [new TextRun({ text: 'CANTIDADES RECIBIDAS  :', bold: true, size: 36, font: 'Calibri' })] }))
  pag2.push(new Paragraph({ children: [] }))
  pag2.push(new Paragraph({ children: [] }))
  pag2.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: operacion.puertoOrigen && operacion.paisOrigen ? `${CLIENTE.nombre}  ( ${operacion.puertoOrigen},  ${operacion.paisOrigen} )` : CLIENTE.nombre, bold: true, size: 32, font: 'Calibri' })] }))
  pag2.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [] }))

  const filasCant = [
    new TableRow({ children: [celda('DESCRIPCION DEL PRODUCTO', { ancho: TABLA_CANTIDADES.cols[0], negrita: false, alineacion: AlignmentType.CENTER, ...cb }), celda('TIPO', { ancho: TABLA_CANTIDADES.cols[1], negrita: false, alineacion: AlignmentType.CENTER, ...cb }), celda('PIEZA', { ancho: TABLA_CANTIDADES.cols[2], negrita: false, alineacion: AlignmentType.CENTER, ...cb }), celda('TONELAJE (MT)', { ancho: TABLA_CANTIDADES.cols[3], negrita: false, alineacion: AlignmentType.CENTER, ...cb })] }),
    filaSeparadora(TABLA_CANTIDADES.cols, 'FFFF00'),
    ...operacion.cantidades.map((c) => new TableRow({ children: [celda(c.descripcion, { ancho: TABLA_CANTIDADES.cols[0], negrita: true, ...cb }), celda(c.tipo, { ancho: TABLA_CANTIDADES.cols[1], alineacion: AlignmentType.CENTER, ...cb }), celda(c.piezas, { ancho: TABLA_CANTIDADES.cols[2], alineacion: AlignmentType.CENTER, negrita: true, ...cb }), celda(c.tonelaje, { ancho: TABLA_CANTIDADES.cols[3], alineacion: AlignmentType.CENTER, negrita: true, ...cb })] })),
    filaSeparadora(TABLA_CANTIDADES.cols, 'FFC000'),
    new TableRow({ children: [celda('TOTAL', { ancho: TABLA_CANTIDADES.cols[0], negrita: true, alineacion: AlignmentType.CENTER, ...cb }), celda('', { ancho: TABLA_CANTIDADES.cols[1], alineacion: AlignmentType.CENTER, ...cb }), celda(String(operacion.cantidades.reduce((s, c) => s + (parseInt(c.piezas) || 0), 0)), { ancho: TABLA_CANTIDADES.cols[2], alineacion: AlignmentType.CENTER, negrita: true, ...cb }), celda(formatearTonelaje(operacion.cantidades.reduce((s, c) => s + parsearTonelaje(c.tonelaje), 0)), { ancho: TABLA_CANTIDADES.cols[3], alineacion: AlignmentType.CENTER, negrita: true, ...cb })] }),
  ]
  pag2.push(new Table({ width: { size: TABLA_CANTIDADES.total, type: WidthType.DXA }, columnWidths: TABLA_CANTIDADES.cols, rows: filasCant }))

  // Gran Total / BLs
  const filasBLData = operacion.bls.map((bl) => new TableRow({ children: [celda(bl.numero, { ancho: TABLA_BL.cols[0], ...cb }), celda(bl.puerto, { ancho: TABLA_BL.cols[1], alineacion: AlignmentType.CENTER, negrita: true, ...cb }), celda(bl.piezas, { ancho: TABLA_BL.cols[2], alineacion: AlignmentType.CENTER, negrita: true, ...cb }), celda(bl.tonelaje, { ancho: TABLA_BL.cols[3], alineacion: AlignmentType.CENTER, negrita: true, ...cb })] }))
  const totalPiezasBL = operacion.bls.reduce((s, b) => s + (parseInt(b.piezas) || 0), 0)
  const totalTonelajeBL = formatearTonelaje(operacion.bls.reduce((s, b) => s + parsearTonelaje(b.tonelaje), 0))

  const filasBL = [
    new TableRow({ children: [celda('NUMERO DE BL', { ancho: TABLA_BL.cols[0], negrita: false, alineacion: AlignmentType.CENTER, ...cb }), celda('PUERTO', { ancho: TABLA_BL.cols[1], negrita: false, alineacion: AlignmentType.CENTER, ...cb }), celda('PIEZAS', { ancho: TABLA_BL.cols[2], negrita: false, alineacion: AlignmentType.CENTER, ...cb }), celda('TONELAJE (MT)', { ancho: TABLA_BL.cols[3], negrita: false, alineacion: AlignmentType.CENTER, ...cb })] }),
    filaSeparadora(TABLA_BL.cols, 'FFFF00'),
    ...filasBLData,
    filaSeparadora(TABLA_BL.cols, 'FFC000'),
    new TableRow({ children: [celda('TOTALES', { ancho: TABLA_BL.cols[0], negrita: false, ...cb }), celda('', { ancho: TABLA_BL.cols[1], alineacion: AlignmentType.CENTER, ...cb }), celda(totalPiezasBL.toLocaleString(), { ancho: TABLA_BL.cols[2], alineacion: AlignmentType.CENTER, negrita: true, ...cb }), celda(totalTonelajeBL, { ancho: TABLA_BL.cols[3], alineacion: AlignmentType.CENTER, negrita: true, ...cb })] }),
  ]
  pag2.push(
    new Paragraph({ children: [] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'GRAN TOTAL', bold: true, size: 28, font: 'Calibri' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [] }),
    new Table({ width: { size: TABLA_BL.total, type: WidthType.DXA }, columnWidths: TABLA_BL.cols, rows: filasBL }),
  )
  pag2.push(new Paragraph({ children: [new PageBreak()] }))

  // ═══ PÁGINA 3: STOWAGE + OBSERVACIONES ═══
  const stowFont = 'Cambria'
  const filasStow = [
    new TableRow({ children: [celda('BODEGA', { ancho: TABLA_STOWAGE.cols[0], negrita: false, alineacion: AlignmentType.CENTER, fuente: stowFont }), celda('PRODUCTO', { ancho: TABLA_STOWAGE.cols[1], negrita: false, alineacion: AlignmentType.CENTER, fuente: stowFont }), celda('TONELAJE (MT)', { ancho: TABLA_STOWAGE.cols[2], negrita: false, alineacion: AlignmentType.CENTER, fuente: stowFont })] }),
    filaSeparadora(TABLA_STOWAGE.cols, 'FFFF00'),
    ...stowage.bodegas.map((b) => new TableRow({ children: [celda(b.numero, { ancho: TABLA_STOWAGE.cols[0], negrita: true, alineacion: AlignmentType.CENTER, fuente: stowFont }), celda(b.producto, { ancho: TABLA_STOWAGE.cols[1], negrita: true, alineacion: AlignmentType.CENTER, fuente: stowFont }), celda(b.tonelaje, { ancho: TABLA_STOWAGE.cols[2], negrita: true, alineacion: AlignmentType.CENTER, fuente: stowFont })] })),
    filaSeparadora(TABLA_STOWAGE.cols, 'FFC000'),
    new TableRow({ children: [celda('TOTALES', { ancho: TABLA_STOWAGE.cols[0], negrita: true, alineacion: AlignmentType.CENTER, fuente: stowFont }), celda('', { ancho: TABLA_STOWAGE.cols[1], alineacion: AlignmentType.CENTER, fuente: stowFont }), celda(formatearTonelaje(stowage.bodegas.reduce((s, b) => s + parsearTonelaje(b.tonelaje), 0)), { ancho: TABLA_STOWAGE.cols[2], negrita: true, alineacion: AlignmentType.CENTER, fuente: stowFont })] }),
  ]
  const tablaStow = new Table({ indent: { size: 1101, type: WidthType.DXA }, width: { size: TABLA_STOWAGE.total, type: WidthType.DXA }, columnWidths: TABLA_STOWAGE.cols, rows: filasStow })

  const pag3 = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'STOWAGE PLAN', bold: true, size: 28, font: 'Cambria' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [] }),
    tablaStow,
    new Paragraph({ children: [] }),
    new Paragraph({ children: [] }),
    ...construirObservaciones(docx, stowage),
  ]

  // ═══ FOTOS ═══
  const pagsFotos = await construirFotos(docx, { fotos, stowage, esExp: false, objetivoKB })

  // ═══ GENERAR DOCUMENTO ═══
  const dummyP = new Paragraph({ children: [] })
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [{
      properties: seccion,
      headers: { default: new Header({ children: [dummyP] }) },
      footers: { default: new Footer({ children: [dummyP] }) },
      children: [...portada, ...pag2, ...pag3, ...pagsFotos],
    }],
  })

  const blobInicial = await Packer.toBlob(doc)
  const blobFinal = await postProcesarTemplate(blobInicial, config)

  const nombre = `REPORTE_${config.puerto}_${config.consecutivo}-${config.anio}_MV_${(config.buque || 'BUQUE').replace(/\s+/g, '_')}__${config.viaje}_${config.puerto}_IMP.docx`

  if (devolverBlob) return { blob: blobFinal, nombre }

  const link = document.createElement('a')
  link.href = URL.createObjectURL(blobFinal)
  link.download = nombre
  link.click()
  URL.revokeObjectURL(link.href)
}
