import * as XLSX from 'xlsx'
import { formatearTonelaje } from '../utilidades'

// Parsea un archivo .xlsx (ArrayBuffer o File) de packing list y devuelve BLs estructurados.
// Formato esperado: hoja "Hoja1" tabulada con headers de BL + filas de productos BUNDLES.
export async function parsearPackingList(entrada) {
  const buffer = entrada instanceof ArrayBuffer
    ? entrada
    : await entrada.arrayBuffer()

  const libro = XLSX.read(buffer, { type: 'array' })

  // Buscar Hoja1 case-insensitive
  const nombreHoja = libro.SheetNames.find((n) => n.trim().toLowerCase() === 'hoja1')
  if (!nombreHoja) {
    throw new Error('El archivo no tiene una hoja "Hoja1". Revisa que sea el formato correcto.')
  }

  const hoja = libro.Sheets[nombreHoja]
  const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: null })

  const bls = []
  const advertencias = []
  let blActual = null
  let indiceBL = 0

  const cerrarBL = () => {
    if (blActual && blActual.cantidades.length > 0) {
      bls.push(blActual)
    }
    blActual = null
  }

  for (const filaRaw of filas) {
    if (!filaRaw || !Array.isArray(filaRaw)) continue

    // Celdas no vacías (preservando tipo original para números)
    const celdasNoVacias = filaRaw
      .filter((c) => c != null && String(c).trim() !== '')
      .map((c) => (typeof c === 'string' ? c.trim() : c))

    if (celdasNoVacias.length === 0) continue

    const textoFila = celdasNoVacias.map((c) => String(c)).join(' | ')
    const primera = celdasNoVacias[0]

    // Ignorar línea header de columnas
    if (/^\s*ITEM\s*\|\s*PIECES/i.test(textoFila)) continue

    // GRAN TOTAL cierra todo y se ignora
    if (/GRAN\s+TOTAL/i.test(textoFila)) {
      cerrarBL()
      continue
    }

    // TOTAL cierra BL actual (primera celda comienza con TOTAL)
    if (typeof primera === 'string' && /^TOTAL\b/i.test(primera)) {
      cerrarBL()
      continue
    }

    // Detectar header de BL: "BL 001 ..."
    const matchBL = textoFila.match(/BL\s*(\d{1,3})/i)
    if (matchBL) {
      cerrarBL()
      indiceBL += 1

      // Extraer puerto/país del contenido entre paréntesis
      const textoParen = textoFila.replace(/[\s|]+$/, '')
      const matchParen = textoParen.match(
        /\(\s*(?:PUERTO|PORT)?\s*([^,)]+?)(?:\s*,\s*([^)]+?))?\s*\)?\s*$/i,
      )
      const puerto = matchParen ? matchParen[1].trim().toUpperCase() : ''
      const pais = matchParen && matchParen[2] ? matchParen[2].trim().toUpperCase() : ''

      blActual = {
        _num: indiceBL,
        puerto,
        pais,
        ciudad: '',
        cantidades: [],
      }
      continue
    }

    // Detectar ruta "MAZATLAN-DESTINO"
    const matchRuta = textoFila.match(/MAZATLAN\s*-\s*([^|]+)/i)
    if (matchRuta && blActual) {
      const destino = matchRuta[1].trim()
      const ciudad = destino.split(',')[0].trim().toUpperCase()
      blActual.ciudad = ciudad
      continue
    }

    // Detectar fila de producto (tiene celda "BUNDLES")
    const bundlesIdx = filaRaw.findIndex(
      (c) => c != null && typeof c === 'string' && c.trim().toUpperCase() === 'BUNDLES',
    )
    if (bundlesIdx !== -1 && blActual) {
      const despues = filaRaw.slice(bundlesIdx + 1)

      // Descripción: primera celda string no-numérica después de BUNDLES
      const celdaDesc = despues.find(
        (c) =>
          c != null &&
          typeof c === 'string' &&
          isNaN(Number(c)) &&
          String(c).trim().length > 0,
      )
      const descripcion = celdaDesc ? String(celdaDesc).trim() : ''

      // Recolectar números de toda la fila
      const numeros = filaRaw
        .filter((c) => {
          if (c == null) return false
          const s = String(c).replace(/,/g, '').trim()
          if (s === '') return false
          return !isNaN(Number(s))
        })
        .map((c) => parseFloat(String(c).replace(/,/g, '')))

      // Piezas: primer número entero > 0
      const piezasNum = numeros.find((n) => Number.isInteger(n) && n > 0)

      // Tonelaje: primer número con decimal o el último número
      let tonelajeNum = numeros.find((n) => !Number.isInteger(n))
      if (tonelajeNum == null) tonelajeNum = numeros.length > 0 ? numeros[numeros.length - 1] : 0

      blActual.cantidades.push({
        descripcion,
        tipo: 'BUNDLES',
        piezas: piezasNum != null ? String(piezasNum) : '0',
        tonelaje: formatearTonelaje(tonelajeNum || 0),
      })
      continue
    }
  }

  // Cerrar BL abierto al final
  cerrarBL()

  if (bls.length === 0) {
    throw new Error('No se detectaron BLs en la Hoja1. Revisa el formato del archivo.')
  }

  // Generar advertencias
  bls.forEach((bl) => {
    const etiqueta = `BL ${String(bl._num).padStart(3, '0')}`
    if (!bl.pais) advertencias.push(`${etiqueta} sin país detectado — completa manualmente`)
    if (!bl.ciudad) advertencias.push(`${etiqueta} sin ciudad destino detectada — completa manualmente`)
    bl.cantidades.forEach((c, idx) => {
      const piezasZero = !c.piezas || parseInt(c.piezas) === 0
      const tonelajeZero = !c.tonelaje || parseFloat(String(c.tonelaje).replace(/,/g, '')) === 0
      if (piezasZero || tonelajeZero) {
        advertencias.push(
          `${etiqueta} — producto ${idx + 1} (${c.descripcion.slice(0, 40) || 'sin descripción'}) con piezas o tonelaje en 0`,
        )
      }
    })
  })

  // Limpiar campo interno _num
  const blsLimpios = bls.map((bl) => ({
    puerto: bl.puerto,
    pais: bl.pais,
    ciudad: bl.ciudad,
    cantidades: bl.cantidades,
  }))

  return { bls: blsLimpios, advertencias }
}
