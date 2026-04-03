import { DOC, TABLA_EVENTOS, TABLA_CANTIDADES, TABLA_BL, TABLA_STOWAGE, CLIENTE } from '../constantes'
import { formatearTonelaje, parsearTonelaje, obtenerDimensiones, leerImagen } from '../utilidades'

export default async function generarDocx({ config, operacion, stowage, fotos, fotosPortada }) {
  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
    Header, Footer, AlignmentType, BorderStyle, WidthType, ShadingType, PageBreak, VerticalAlign,
  } = await import('docx')
  const JSZip = (await import('jszip')).default

  // ─── Utilidades internas ───
  const borde = { style: BorderStyle.SINGLE, size: 4, color: '000000' }
  const bordes = { top: borde, bottom: borde, left: borde, right: borde }

  const celda = (texto, opts = {}) => new TableCell({
    borders: bordes,
    width: opts.ancho ? { size: opts.ancho, type: WidthType.DXA } : undefined,
    shading: opts.fondo ? { fill: opts.fondo, type: ShadingType.CLEAR } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [new Paragraph({
      alignment: opts.alineacion || AlignmentType.LEFT,
      children: [new TextRun({ text: texto || '', bold: opts.negrita, size: opts.tamano || 20, font: opts.fuente || 'Calibri', color: opts.color || '000000' })],
    })],
  })

  const seccion = {
    page: { size: { width: DOC.anchoHoja, height: DOC.altoHoja }, margin: { top: DOC.margenTop, right: DOC.margenRight, bottom: DOC.margenBottom, left: DOC.margenLeft, header: DOC.header, footer: DOC.footer, gutter: 0 } },
  }

  // ═══ PORTADA ═══
  const portada = []
  for (let i = 0; i < fotosPortada.length; i++) {
    const fp = fotosPortada[i]
    const dims = await obtenerDimensiones(fp.archivo)
    const anchoPt = 590
    const naturalHeight = Math.round((dims.alto / dims.ancho) * anchoPt)
    const altoPt = Math.max(naturalHeight, 380)
    portada.push(
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: i === 0 ? 0 : 120, after: 0 }, children: [new ImageRun({ type: 'jpg', data: await leerImagen(fp.archivo), transformation: { width: anchoPt, height: altoPt }, altText: { title: 'Portada', description: 'Buque', name: 'portada' } })] }),
    )
  }
  portada.push(new Paragraph({ children: [new PageBreak()] }))

  // ═══ PÁGINA 2: OPERACIÓN ═══
  const filasEventos = operacion.eventos.map((ev) => {
    const nombreEvento = ev.nombre === 'ARRIBO' && operacion.arriboA ? `ARRIBO A ${operacion.arriboA.toUpperCase()}` : ev.nombre
    return new TableRow({ children: [
      celda(nombreEvento, { ancho: TABLA_EVENTOS.cols[0], negrita: true, tamano: 22 }),
      celda(`${ev.mes}                  ${ev.dia},  ${ev.anio}       ${ev.hora}${ev.hora ? ' HRS' : ''}`, { ancho: TABLA_EVENTOS.cols[1], tamano: 22 }),
    ] })
  })
  filasEventos.push(new TableRow({ children: [
    celda('CARGA TOTAL', { ancho: TABLA_EVENTOS.cols[0], negrita: true, tamano: 22 }),
    celda(`                            ${operacion.cargaTotal}${operacion.cargaTotal ? ' MT' : ''}`, { ancho: TABLA_EVENTOS.cols[1], negrita: true, tamano: 22 }),
  ] }))

  const tablaEventos = new Table({ width: { size: TABLA_EVENTOS.total, type: WidthType.DXA }, columnWidths: TABLA_EVENTOS.cols, rows: filasEventos })

  const filaSeparadora = (cols, color) => new TableRow({ children: cols.map((ancho) => celda('', { ancho, fondo: color })) })

  const cb = { fuente: 'Cambria', tamano: 22 }
  const filasCant = [
    new TableRow({ children: [celda('DESCRIPCION DEL PRODUCTO', { ancho: TABLA_CANTIDADES.cols[0], negrita: false, alineacion: AlignmentType.CENTER, ...cb }), celda('TIPO', { ancho: TABLA_CANTIDADES.cols[1], negrita: false, alineacion: AlignmentType.CENTER, ...cb }), celda('PIEZA', { ancho: TABLA_CANTIDADES.cols[2], negrita: false, alineacion: AlignmentType.CENTER, ...cb }), celda('TONELAJE (MT)', { ancho: TABLA_CANTIDADES.cols[3], negrita: false, alineacion: AlignmentType.CENTER, ...cb })] }),
    filaSeparadora(TABLA_CANTIDADES.cols, 'FFFF00'),
    ...operacion.cantidades.map((c) => new TableRow({ children: [celda(c.descripcion, { ancho: TABLA_CANTIDADES.cols[0], negrita: true, ...cb }), celda(c.tipo, { ancho: TABLA_CANTIDADES.cols[1], alineacion: AlignmentType.CENTER, ...cb }), celda(c.piezas, { ancho: TABLA_CANTIDADES.cols[2], alineacion: AlignmentType.CENTER, negrita: true, ...cb }), celda(c.tonelaje, { ancho: TABLA_CANTIDADES.cols[3], alineacion: AlignmentType.CENTER, negrita: true, ...cb })] })),
    filaSeparadora(TABLA_CANTIDADES.cols, 'FFC000'),
    new TableRow({ children: [celda('TOTAL', { ancho: TABLA_CANTIDADES.cols[0], negrita: true, alineacion: AlignmentType.CENTER, ...cb }), celda('', { ancho: TABLA_CANTIDADES.cols[1], alineacion: AlignmentType.CENTER, ...cb }), celda(String(operacion.cantidades.reduce((s, c) => s + (parseInt(c.piezas) || 0), 0)), { ancho: TABLA_CANTIDADES.cols[2], alineacion: AlignmentType.CENTER, negrita: true, ...cb }), celda(formatearTonelaje(operacion.cantidades.reduce((s, c) => s + parsearTonelaje(c.tonelaje), 0)), { ancho: TABLA_CANTIDADES.cols[3], alineacion: AlignmentType.CENTER, negrita: true, ...cb })] }),
  ]
  const tablaCant = new Table({ width: { size: TABLA_CANTIDADES.total, type: WidthType.DXA }, columnWidths: TABLA_CANTIDADES.cols, rows: filasCant })

  const filasBL = [
    new TableRow({ children: [celda('NUMERO DE BL', { ancho: TABLA_BL.cols[0], negrita: false, alineacion: AlignmentType.CENTER, ...cb }), celda('PUERTO', { ancho: TABLA_BL.cols[1], negrita: false, alineacion: AlignmentType.CENTER, ...cb }), celda('PIEZAS', { ancho: TABLA_BL.cols[2], negrita: false, alineacion: AlignmentType.CENTER, ...cb }), celda('TONELAJE (MT)', { ancho: TABLA_BL.cols[3], negrita: false, alineacion: AlignmentType.CENTER, ...cb })] }),
    filaSeparadora(TABLA_BL.cols, 'FFFF00'),
    ...operacion.bls.map((bl) => new TableRow({ children: [celda(bl.numero, { ancho: TABLA_BL.cols[0], ...cb }), celda(bl.puerto, { ancho: TABLA_BL.cols[1], alineacion: AlignmentType.CENTER, negrita: true, ...cb }), celda(bl.piezas, { ancho: TABLA_BL.cols[2], alineacion: AlignmentType.CENTER, negrita: true, ...cb }), celda(bl.tonelaje, { ancho: TABLA_BL.cols[3], alineacion: AlignmentType.CENTER, negrita: true, ...cb })] })),
    filaSeparadora(TABLA_BL.cols, 'FFC000'),
    new TableRow({ children: [celda('TOTALES', { ancho: TABLA_BL.cols[0], negrita: false, ...cb }), celda('', { ancho: TABLA_BL.cols[1], alineacion: AlignmentType.CENTER, ...cb }), celda(String(operacion.bls.reduce((s, b) => s + (parseInt(b.piezas) || 0), 0)), { ancho: TABLA_BL.cols[2], alineacion: AlignmentType.CENTER, negrita: true, ...cb }), celda(formatearTonelaje(operacion.bls.reduce((s, b) => s + (parsearTonelaje(b.tonelaje)), 0)), { ancho: TABLA_BL.cols[3], alineacion: AlignmentType.CENTER, negrita: true, ...cb })] }),
  ]
  const tablaBL = new Table({ width: { size: TABLA_BL.total, type: WidthType.DXA }, columnWidths: TABLA_BL.cols, rows: filasBL })

  const pag2 = [
    new Paragraph({ children: [] }),
    new Paragraph({ children: [] }),
    tablaEventos,
    new Paragraph({ children: [] }),
    new Paragraph({ children: [new TextRun({ text: 'CANTIDADES RECIBIDAS  :', bold: true, size: 36, font: 'Calibri' })] }),
    new Paragraph({ children: [] }),
    new Paragraph({ children: [] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: CLIENTE.nombre, bold: true, size: 32, font: 'Calibri' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [] }),
    tablaCant,
    new Paragraph({ children: [] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'GRAN TOTAL', bold: true, size: 28, font: 'Calibri' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [] }),
    tablaBL,
    new Paragraph({ children: [new PageBreak()] }),
  ]

  // ═══ PÁGINA 3: STOWAGE + OBSERVACIONES ═══
  const stowFont = 'Cambria'
  const filasStow = [
    new TableRow({ children: [celda('BODEGA', { ancho: TABLA_STOWAGE.cols[0], negrita: false, alineacion: AlignmentType.CENTER, fuente: stowFont }), celda('PRODUCTO', { ancho: TABLA_STOWAGE.cols[1], negrita: false, alineacion: AlignmentType.CENTER, fuente: stowFont }), celda('TONELAJE (MT)', { ancho: TABLA_STOWAGE.cols[2], negrita: false, alineacion: AlignmentType.CENTER, fuente: stowFont })] }),
    filaSeparadora(TABLA_STOWAGE.cols, 'FFFF00'),
    ...stowage.bodegas.map((b) => new TableRow({ children: [celda(b.numero, { ancho: TABLA_STOWAGE.cols[0], negrita: true, alineacion: AlignmentType.CENTER, fuente: stowFont }), celda(b.producto, { ancho: TABLA_STOWAGE.cols[1], negrita: true, alineacion: AlignmentType.CENTER, fuente: stowFont }), celda(b.tonelaje, { ancho: TABLA_STOWAGE.cols[2], negrita: true, alineacion: AlignmentType.CENTER, fuente: stowFont })] })),
    filaSeparadora(TABLA_STOWAGE.cols, 'FFC000'),
    new TableRow({ children: [celda('TOTALES', { ancho: TABLA_STOWAGE.cols[0], negrita: true, alineacion: AlignmentType.CENTER, fuente: stowFont }), celda('', { ancho: TABLA_STOWAGE.cols[1], alineacion: AlignmentType.CENTER, fuente: stowFont }), celda(formatearTonelaje(stowage.bodegas.reduce((s, b) => s + (parsearTonelaje(b.tonelaje)), 0)), { ancho: TABLA_STOWAGE.cols[2], negrita: true, alineacion: AlignmentType.CENTER, fuente: stowFont })] }),
  ]
  const tablaStow = new Table({ indent: { size: 1101, type: WidthType.DXA }, width: { size: TABLA_STOWAGE.total, type: WidthType.DXA }, columnWidths: TABLA_STOWAGE.cols, rows: filasStow })

  const obsParrs = stowage.observaciones
    ? stowage.observaciones.toUpperCase().split(/\n+/).map((l, i) => new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { before: i === 0 ? 80 : 0, after: 100, line: 276 }, children: [new TextRun({ text: l, bold: true, size: 20, font: 'Arial' })] }))
    : [new Paragraph({ children: [] })]

  const pag3 = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'STOWAGE PLAN', bold: true, size: 28, font: 'Cambria' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [] }),
    tablaStow,
    new Paragraph({ children: [] }),
    new Paragraph({ children: [] }),
    new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: 'OBSERVACIONES  :  ', bold: true, font: 'Arial' })] }),
    ...obsParrs,
    new Paragraph({ children: [new PageBreak()] }),
  ]

  // ═══ PÁGINAS 4+: FOTOS ═══
  const pagsFotos = []
  const esDocumentos = (cat) => cat === 'seccion-DOCUMENTOS'
  const tituloCategoria = (cat) => cat.startsWith('bodega-')
    ? `BODEGA No ${cat.replace('bodega-', '').padStart(2, '0')}`
    : cat.replace('seccion-', '')

  const bodegasDelStowage = stowage.bodegas.map((_, idx) => `bodega-${idx + 1}`)
  const seccionesOrdenadas = ['seccion-DESCARGA DE BUQUE', 'seccion-AREA DE ALMACENAMIENTO', 'seccion-DOCUMENTOS']
  const todasCats = [...bodegasDelStowage, ...seccionesOrdenadas]

  const fotosPorCat = {}
  for (const f of fotos) {
    if (!fotosPorCat[f.categoriaKey]) fotosPorCat[f.categoriaKey] = []
    fotosPorCat[f.categoriaKey].push(f)
  }

  for (const cat of todasCats) {
    const fotosGrupo = fotosPorCat[cat] || []
    const bodegaIdx = cat.startsWith('bodega-') ? parseInt(cat.replace('bodega-', '')) - 1 : -1
    const esEmpty = bodegaIdx >= 0 && stowage.bodegas[bodegaIdx] && stowage.bodegas[bodegaIdx].producto.toUpperCase().trim() === 'EMPTY' && fotosGrupo.length === 0

    if (esEmpty) {
      pagsFotos.push(
        new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 },
          children: [new TextRun({ text: tituloCategoria(cat), bold: true, size: 28, font: 'Arial' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { before: 4500 },
          children: [new TextRun({ text: 'EMPTY', bold: true, size: 180, font: 'Times New Roman' })],
        }),
        new Paragraph({ children: [new PageBreak()] }),
      )
      continue
    }

    if (fotosGrupo.length === 0) continue

    let catTituloPuesto = false
    let i = 0
    while (i < fotosGrupo.length) {
      const pagina = []

      if (!catTituloPuesto) {
        catTituloPuesto = true
        pagina.push(new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 },
          children: [new TextRun({ text: tituloCategoria(cat), bold: true, size: 28, font: 'Arial' })],
        }))
      }

      if (esDocumentos(cat)) {
        const dims = await obtenerDimensiones(fotosGrupo[i].archivo)
        const altoPt = Math.min(Math.round((dims.alto / dims.ancho) * 545), 710)
        pagina.push(
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: 'jpg', data: await leerImagen(fotosGrupo[i].archivo), transformation: { width: 545, height: altoPt }, altText: { title: 'Foto', description: 'Documento', name: `foto-doc-${i}` } })] }),
        )
        i += 1
      } else {
        const f1 = fotosGrupo[i]
        const dims1 = await obtenerDimensiones(f1.archivo)
        const alto1Pt = Math.min(Math.round((dims1.alto / dims1.ancho) * 590), 370)
        pagina.push(
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new ImageRun({ type: 'jpg', data: await leerImagen(f1.archivo), transformation: { width: 590, height: alto1Pt }, altText: { title: 'Foto', description: 'Operación', name: `foto-${cat}-${i}` } })] }),
        )

        if (i + 1 < fotosGrupo.length) {
          const f2 = fotosGrupo[i + 1]
          const dims2 = await obtenerDimensiones(f2.archivo)
          const alto2Pt = Math.min(Math.round((dims2.alto / dims2.ancho) * 590), 370)
          pagina.push(
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: 'jpg', data: await leerImagen(f2.archivo), transformation: { width: 590, height: alto2Pt }, altText: { title: 'Foto', description: 'Operación', name: `foto-${cat}-${i + 1}` } })] }),
          )
          i += 2
        } else {
          i += 1
        }
      }

      pagina.push(new Paragraph({ children: [new PageBreak()] }))
      pagsFotos.push(...pagina)
    }
  }

  // Quitar el último PageBreak para evitar página vacía al final
  if (pagsFotos.length > 0) pagsFotos.pop()

  // ═══ PASO 1: Generar documento con docx library ═══
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

  // ═══ PASO 2: Post-procesar con el template para header/footer exactos ═══
  const zipGen = await JSZip.loadAsync(blobInicial)
  const templateBytes = await (await fetch('/TEMPLATE-DEACERO.docx')).arrayBuffer()
  const zipTpl = await JSZip.loadAsync(templateBytes)

  const codigoHeader = `${config.puerto}-LP-${config.consecutivo}-${config.anio}  MV ${config.buque}   ${config.viaje} VCZ`

  // Eliminar headers/footers generados por docx library
  for (const path of Object.keys(zipGen.files)) {
    if (path.match(/^word\/(header|footer)\d+\.xml$/) || path.match(/^word\/_rels\/(header|footer)\d+\.xml\.rels$/)) {
      zipGen.remove(path)
    }
  }

  // Copiar headers/footers del template (pixel-perfect)
  const archivosTemplate = [
    'word/header1.xml', 'word/header2.xml', 'word/header3.xml',
    'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml',
    'word/_rels/header2.xml.rels',
  ]
  for (const f of archivosTemplate) {
    const contenido = await zipTpl.file(f)?.async('uint8array')
    if (contenido) zipGen.file(f, contenido)
  }

  // Reemplazar ----- con el código de operación real
  let hdr2 = await zipGen.file('word/header2.xml').async('string')
  hdr2 = hdr2.replace('>-----<', `>${codigoHeader}<`)
  zipGen.file('word/header2.xml', hdr2)

  // Copiar imágenes del header del template (barra naranja + logo DEACERO)
  const imgBarra = await zipTpl.file('word/media/image1.png')?.async('uint8array')
  const imgLogo = await zipTpl.file('word/media/image2.png')?.async('uint8array')
  zipGen.file('word/media/hdr_barra.png', imgBarra)
  zipGen.file('word/media/hdr_logo.png', imgLogo)

  // Actualizar header2.xml.rels para apuntar a los nombres renombrados
  let hdr2Rels = await zipGen.file('word/_rels/header2.xml.rels').async('string')
  hdr2Rels = hdr2Rels.replace(/media\/image1\.png/g, 'media/hdr_barra.png')
  hdr2Rels = hdr2Rels.replace(/media\/image2\.png/g, 'media/hdr_logo.png')
  zipGen.file('word/_rels/header2.xml.rels', hdr2Rels)

  // Actualizar document.xml.rels
  let docRels = await zipGen.file('word/_rels/document.xml.rels').async('string')
  docRels = docRels.replace(/<Relationship[^>]*Type="[^"]*\/(header|footer)"[^>]*\/>/g, '')
  const nuevasRels =
    '<Relationship Id="rId901" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>' +
    '<Relationship Id="rId902" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header2.xml"/>' +
    '<Relationship Id="rId903" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>' +
    '<Relationship Id="rId904" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer2.xml"/>' +
    '<Relationship Id="rId905" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header3.xml"/>' +
    '<Relationship Id="rId906" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer3.xml"/>'
  docRels = docRels.replace('</Relationships>', nuevasRels + '</Relationships>')
  zipGen.file('word/_rels/document.xml.rels', docRels)

  // Actualizar sectPr en document.xml
  let docXml = await zipGen.file('word/document.xml').async('string')
  docXml = docXml.replace(/<w:headerReference[^>]*\/>/g, '')
  docXml = docXml.replace(/<w:footerReference[^>]*\/>/g, '')
  const nuevasRefsSect =
    '<w:headerReference w:type="even" r:id="rId901"/>' +
    '<w:headerReference w:type="default" r:id="rId902"/>' +
    '<w:footerReference w:type="even" r:id="rId903"/>' +
    '<w:footerReference w:type="default" r:id="rId904"/>' +
    '<w:headerReference w:type="first" r:id="rId905"/>' +
    '<w:footerReference w:type="first" r:id="rId906"/>'
  docXml = docXml.replace(/<w:sectPr([^>]*)>/, `<w:sectPr$1>${nuevasRefsSect}`)
  zipGen.file('word/document.xml', docXml)

  // Actualizar [Content_Types].xml
  let contentTypes = await zipGen.file('[Content_Types].xml').async('string')
  const partes = [
    ['/word/header1.xml', 'header'], ['/word/header2.xml', 'header'], ['/word/header3.xml', 'header'],
    ['/word/footer1.xml', 'footer'], ['/word/footer2.xml', 'footer'], ['/word/footer3.xml', 'footer'],
  ]
  for (const [partName, tipo] of partes) {
    const ct = `application/vnd.openxmlformats-officedocument.wordprocessingml.${tipo}+xml`
    if (!contentTypes.includes(partName)) {
      contentTypes = contentTypes.replace('</Types>', `<Override PartName="${partName}" ContentType="${ct}"/></Types>`)
    }
  }
  zipGen.file('[Content_Types].xml', contentTypes)

  // ═══ Generar blob final y descargar ═══
  const blobFinal = await zipGen.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })

  const nombre = `REPORTE_${config.puerto}_${config.consecutivo}-${config.anio}_MV_${(config.buque || 'BUQUE').replace(/\s+/g, '_')}__${config.viaje}_${config.puerto}_IMP.docx`
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blobFinal)
  link.download = nombre
  link.click()
  URL.revokeObjectURL(link.href)
}
