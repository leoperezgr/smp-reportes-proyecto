// Utilidades compartidas para generación de .docx (IMP y EXP)
import { DOC } from '../constantes'
import { obtenerDimensiones, leerImagen } from '../utilidades'

// Carga dinámica de la librería docx — retorna todos los constructores necesarios
export async function cargarDocx() {
  const mod = await import('docx')
  return {
    Document: mod.Document,
    Packer: mod.Packer,
    Paragraph: mod.Paragraph,
    TextRun: mod.TextRun,
    Table: mod.Table,
    TableRow: mod.TableRow,
    TableCell: mod.TableCell,
    ImageRun: mod.ImageRun,
    Header: mod.Header,
    Footer: mod.Footer,
    AlignmentType: mod.AlignmentType,
    BorderStyle: mod.BorderStyle,
    WidthType: mod.WidthType,
    ShadingType: mod.ShadingType,
    PageBreak: mod.PageBreak,
    VerticalAlign: mod.VerticalAlign,
    TableLayoutType: mod.TableLayoutType,
  }
}

// Bordes estándar de celda
export function crearBordes(BorderStyle) {
  const borde = { style: BorderStyle.SINGLE, size: 4, color: '000000' }
  return {
    borde,
    bordes: { top: borde, bottom: borde, left: borde, right: borde },
  }
}

// Función celda genérica
export function crearCelda(docx, bordes) {
  const { TableCell, Paragraph, TextRun, WidthType, ShadingType, VerticalAlign, AlignmentType } = docx
  return (texto, opts = {}) => new TableCell({
    borders: bordes,
    width: opts.ancho ? { size: opts.ancho, type: WidthType.DXA } : undefined,
    shading: opts.fondo ? { fill: opts.fondo, type: ShadingType.CLEAR } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    columnSpan: opts.colSpan,
    children: [new Paragraph({
      alignment: opts.alineacion || AlignmentType.LEFT,
      children: [new TextRun({ text: texto || '', bold: opts.negrita, size: opts.tamano || 20, font: opts.fuente || 'Calibri', color: opts.color || '000000' })],
    })],
  })
}

// Fila separadora de color
export function crearFilaSeparadora(docx, bordes) {
  const celda = crearCelda(docx, bordes)
  const { TableRow } = docx
  return (cols, color) => new TableRow({ children: cols.map((ancho) => celda('', { ancho, fondo: color })) })
}

// Sección de página
export function crearSeccion() {
  return {
    page: {
      size: { width: DOC.anchoHoja, height: DOC.altoHoja },
      margin: { top: DOC.margenTop, right: DOC.margenRight, bottom: DOC.margenBottom, left: DOC.margenLeft, header: DOC.header, footer: DOC.footer, gutter: 0 },
    },
  }
}

// Portada: 2 fotos del buque — acota altura para garantizar que ambas quepan en la hoja 1 preservando aspect ratio
export async function construirPortada(docx, fotosPortada) {
  const { Paragraph, ImageRun, PageBreak, AlignmentType } = docx
  const portada = []
  const anchoMaxPx = 680
  // Buffer calibrado empíricamente: el header DEACERO (barra naranja + logo)
  // ocupa espacio visible sobre el margen superior nominal. 1330 DXA da ~386 px
  // por foto sin desbordar a la página 2
  const altoDisponibleDXA = DOC.altoHoja - DOC.margenTop - DOC.margenBottom - 1330
  const altoDisponiblePx = Math.floor(altoDisponibleDXA / 1440 * 96)
  const espacioEntreFotosPx = 6
  const altoMaxPorFoto = Math.floor((altoDisponiblePx - espacioEntreFotosPx) / 2)

  for (let i = 0; i < fotosPortada.length; i++) {
    const fp = fotosPortada[i]
    const dims = await obtenerDimensiones(fp.archivo)
    const ratio = dims.ancho / dims.alto
    let anchoPx = anchoMaxPx
    let altoPx = Math.round(anchoMaxPx / ratio)
    if (altoPx > altoMaxPorFoto) {
      altoPx = altoMaxPorFoto
      anchoPx = Math.round(altoMaxPorFoto * ratio)
    }
    const esUltima = i === fotosPortada.length - 1
    portada.push(
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: esUltima ? 0 : espacioEntreFotosPx * 15 }, children: [new ImageRun({ type: 'jpg', data: await leerImagen(fp.archivo), transformation: { width: anchoPx, height: altoPx }, altText: { title: 'Portada', description: 'Buque', name: 'portada' } })] }),
    )
  }
  portada.push(new Paragraph({ children: [new PageBreak()] }))
  return portada
}

// Tabla de eventos (compartida IMP/EXP)
export function construirTablaEventos(docx, operacion, bordesObj) {
  const { Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, BorderStyle, WidthType, VerticalAlign } = docx
  const { borde, bordes } = bordesObj
  const celda = crearCelda(docx, bordes)

  const evCols = [4416, 1300, 700, 900, 1512]
  const evTotal = evCols.reduce((a, b) => a + b, 0)

  const sinBorde = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  const bordesMesIzq = { top: borde, bottom: borde, left: borde, right: sinBorde }
  const bordesMedio = { top: borde, bottom: borde, left: sinBorde, right: sinBorde }
  const bordesDer = { top: borde, bottom: borde, left: sinBorde, right: borde }

  const celdaEv = (texto, ancho, bordesCelda, opts = {}) => new TableCell({
    borders: bordesCelda,
    width: { size: ancho, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [new Paragraph({
      alignment: opts.alineacion || AlignmentType.LEFT,
      children: [new TextRun({ text: texto || '', bold: opts.negrita, size: 22, font: 'Calibri' })],
    })],
  })

  const filasEventos = operacion.eventos.map((ev) => {
    const nombreEvento = ev.nombre === 'ARRIBO' && operacion.arriboA ? `ARRIBO A ${operacion.arriboA.toUpperCase()}` : ev.nombre
    return new TableRow({ children: [
      celdaEv(nombreEvento, evCols[0], bordes, { negrita: true }),
      celdaEv(ev.mes, evCols[1], bordesMesIzq),
      celdaEv(ev.dia ? `${ev.dia},` : '', evCols[2], bordesMedio, { alineacion: AlignmentType.RIGHT }),
      celdaEv(ev.anio || '', evCols[3], bordesMedio, { alineacion: AlignmentType.LEFT }),
      celdaEv(ev.hora ? `${ev.hora} HRS` : '', evCols[4], bordesDer, { alineacion: AlignmentType.CENTER }),
    ] })
  })
  filasEventos.push(new TableRow({ children: [
    celda('CARGA TOTAL', { ancho: evCols[0], negrita: true, tamano: 22 }),
    new TableCell({
      borders: bordes,
      width: { size: evCols[1] + evCols[2] + evCols[3] + evCols[4], type: WidthType.DXA },
      columnSpan: 4,
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `${operacion.cargaTotal}${operacion.cargaTotal ? ' MT' : ''}`, bold: true, size: 22, font: 'Calibri' })],
      })],
    }),
  ] }))

  return new Table({ width: { size: evTotal, type: WidthType.DXA }, columnWidths: evCols, rows: filasEventos })
}

// Observaciones (compartida IMP/EXP)
export function construirObservaciones(docx, stowage) {
  const { Paragraph, TextRun, PageBreak, AlignmentType } = docx
  const obsParrs = stowage.observaciones
    ? stowage.observaciones.toUpperCase().split(/\n+/).map((l, i) => new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { before: i === 0 ? 80 : 0, after: 100, line: 276 }, children: [new TextRun({ text: l, bold: true, size: 20, font: 'Arial' })] }))
    : [new Paragraph({ children: [] })]

  return [
    new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: 'OBSERVACIONES  :  ', bold: true, font: 'Arial' })] }),
    ...obsParrs,
    new Paragraph({ children: [new PageBreak()] }),
  ]
}

// Páginas de fotos (compartida IMP/EXP)
export async function construirFotos(docx, { fotos, stowage, esExp }) {
  const { Paragraph, TextRun, ImageRun, PageBreak, AlignmentType } = docx
  const pagsFotos = []
  const esDocumentos = (cat) => cat === 'seccion-DOCUMENTOS'
  const tituloCategoria = (cat) => {
    if (cat === 'seccion-BODEGAS') return 'CARGA EN BODEGAS DE BUQUE'
    if (cat.startsWith('bodega-')) {
      return `BODEGA No ${cat.replace('bodega-', '').padStart(2, '0')}`
    }
    return cat.replace('seccion-', '')
  }

  const altoDisponibleDXA = DOC.altoHoja - DOC.margenTop - DOC.margenBottom - DOC.header - DOC.footer - 200
  const altoDisponiblePx = Math.floor(altoDisponibleDXA / 1440 * 96)
  const espacioTituloPx = 55
  const espacioEntreFotosPx = 4

  const bodegasDelStowage = stowage.bodegas.map((_, idx) => `bodega-${idx + 1}`)
  const seccionesOrdenadas = esExp
    ? ['seccion-AREA DE ALMACENAMIENTO', 'seccion-DOCUMENTOS']
    : ['seccion-DESCARGA DE BUQUE', 'seccion-AREA DE ALMACENAMIENTO', 'seccion-CARGA DE EQUIPO FFCC', 'seccion-DOCUMENTOS']
  const todasCats = [...bodegasDelStowage, ...seccionesOrdenadas]

  const fotosPorCat = {}
  for (const f of fotos) {
    if (!fotosPorCat[f.categoriaKey]) fotosPorCat[f.categoriaKey] = []
    fotosPorCat[f.categoriaKey].push(f)
  }
  for (const clave in fotosPorCat) {
    fotosPorCat[clave].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', undefined, { numeric: true }))
  }

  let catsParaFotos = todasCats
  if (esExp) {
    catsParaFotos = ['seccion-BODEGAS', ...bodegasDelStowage, ...seccionesOrdenadas]
  }

  for (const cat of catsParaFotos) {
    const fotosGrupo = fotosPorCat[cat] || []
    const bodegaIdx = cat.startsWith('bodega-') ? parseInt(cat.replace('bodega-', '')) - 1 : -1

    if (esExp) {
      if (fotosGrupo.length === 0) continue
    } else {
      const esEmpty = bodegaIdx >= 0 && fotosGrupo.length === 0
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
    }

    if (fotosGrupo.length === 0) continue

    let catTituloPuesto = false
    let i = 0
    while (i < fotosGrupo.length) {
      const pagina = []
      const conTitulo = !catTituloPuesto

      if (!catTituloPuesto) {
        catTituloPuesto = true
        const titulo = tituloCategoria(cat)
        pagina.push(new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 },
          children: [new TextRun({ text: titulo, bold: true, size: 28, font: 'Arial' })],
        }))
      }

      if (esDocumentos(cat)) {
        const espacioEnterDoc = conTitulo ? 0 : 14
        const maxAltoDoc = altoDisponiblePx - (conTitulo ? espacioTituloPx : espacioEnterDoc)
        if (!conTitulo) {
          pagina.push(new Paragraph({ children: [] }))
        }
        pagina.push(
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: 'jpg', data: await leerImagen(fotosGrupo[i].archivo), transformation: { width: 590, height: maxAltoDoc }, altText: { title: 'Foto', description: 'Documento', name: `foto-doc-${i}` } })] }),
        )
        i += 1
      } else {
        const anchoBodega = 590
        const espacioEnterPx = conTitulo ? 0 : 14
        const espacioFotos = altoDisponiblePx - (conTitulo ? espacioTituloPx : espacioEnterPx) - espacioEntreFotosPx
        const altoPorFoto = Math.floor(espacioFotos / 2)

        const f1 = fotosGrupo[i]
        if (!conTitulo) {
          pagina.push(new Paragraph({ children: [] }))
        }
        pagina.push(
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new ImageRun({ type: 'jpg', data: await leerImagen(f1.archivo), transformation: { width: anchoBodega, height: altoPorFoto }, altText: { title: 'Foto', description: 'Operación', name: `foto-${cat}-${i}` } })] }),
        )

        if (i + 1 < fotosGrupo.length) {
          const f2 = fotosGrupo[i + 1]
          pagina.push(
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: 'jpg', data: await leerImagen(f2.archivo), transformation: { width: anchoBodega, height: altoPorFoto }, altText: { title: 'Foto', description: 'Operación', name: `foto-${cat}-${i + 1}` } })] }),
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

  if (pagsFotos.length > 0) pagsFotos.pop()
  return pagsFotos
}

// Post-procesado JSZip: inyectar header/footer del template
export async function postProcesarTemplate(blobInicial, config) {
  const JSZip = (await import('jszip')).default
  const zipGen = await JSZip.loadAsync(blobInicial)
  const templateBytes = await (await fetch('./TEMPLATE-DEACERO.docx')).arrayBuffer()
  const zipTpl = await JSZip.loadAsync(templateBytes)

  const codigoHeader = `${config.puerto}-LP-${config.consecutivo}-${config.anio}  MV ${config.buque}   ${config.viaje} VCZ`

  for (const path of Object.keys(zipGen.files)) {
    if (path.match(/^word\/(header|footer)\d+\.xml$/) || path.match(/^word\/_rels\/(header|footer)\d+\.xml\.rels$/)) {
      zipGen.remove(path)
    }
  }

  const archivosTemplate = [
    'word/header1.xml', 'word/header2.xml', 'word/header3.xml',
    'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml',
    'word/_rels/header2.xml.rels',
  ]
  for (const f of archivosTemplate) {
    const contenido = await zipTpl.file(f)?.async('uint8array')
    if (contenido) zipGen.file(f, contenido)
  }

  let hdr2 = await zipGen.file('word/header2.xml').async('string')
  hdr2 = hdr2.replace('>-----<', `>${codigoHeader}<`)
  zipGen.file('word/header2.xml', hdr2)

  const imgBarra = await zipTpl.file('word/media/image1.png')?.async('uint8array')
  const imgLogo = await zipTpl.file('word/media/image2.png')?.async('uint8array')
  zipGen.file('word/media/hdr_barra.png', imgBarra)
  zipGen.file('word/media/hdr_logo.png', imgLogo)

  let hdr2Rels = await zipGen.file('word/_rels/header2.xml.rels').async('string')
  hdr2Rels = hdr2Rels.replace(/media\/image1\.png/g, 'media/hdr_barra.png')
  hdr2Rels = hdr2Rels.replace(/media\/image2\.png/g, 'media/hdr_logo.png')
  zipGen.file('word/_rels/header2.xml.rels', hdr2Rels)

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

  return zipGen.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}
