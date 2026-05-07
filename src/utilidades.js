export const uid = () => Math.random().toString(36).slice(2, 10)

export const leerComoDataURL = (archivo) =>
  new Promise((r) => { const l = new FileReader(); l.onload = () => r(l.result); l.readAsDataURL(archivo) })

export const leerComoArrayBuffer = (archivo) =>
  new Promise((r) => { const l = new FileReader(); l.onload = () => r(l.result); l.readAsArrayBuffer(archivo) })

export const leerImagen = async (archivo) => new Uint8Array(await leerComoArrayBuffer(archivo))

// Recomprime y redimensiona una imagen antes de embeberla en el .docx.
// Si se pasa `objetivoKB`, itera por escalones de calidad y ancho hasta cumplir el presupuesto;
// si nada cumple, devuelve la versión más pequeña obtenida.
// Si no se pasa `objetivoKB`, hace una sola pasada con anchoMax/calidad (comportamiento original).
const ESCALONES_CALIDAD_DEF = [0.85, 0.78, 0.70, 0.62, 0.55, 0.48]
const ESCALONES_ANCHO_DEF = [1.0, 0.9, 0.8, 0.7]

const _cargarImagen = (archivo) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(archivo)
  const img = new Image()
  img.onload = () => resolve({ img, url })
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo cargar la imagen')) }
  img.src = url
})

const _renderJpeg = (img, ancho, alto, calidad) => new Promise((resolve, reject) => {
  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, ancho, alto)
  ctx.drawImage(img, 0, 0, ancho, alto)
  canvas.toBlob(
    (blob) => {
      if (!blob) return reject(new Error('canvas.toBlob devolvió null'))
      blob.arrayBuffer().then((ab) => resolve(new Uint8Array(ab))).catch(reject)
    },
    'image/jpeg',
    calidad,
  )
})

export const leerImagenComprimida = async (
  archivo,
  {
    anchoMax = 1800,
    calidad = 0.85,
    objetivoKB,
    escalonesCalidad = ESCALONES_CALIDAD_DEF,
    escalonesAncho = ESCALONES_ANCHO_DEF,
  } = {},
) => {
  const { img, url } = await _cargarImagen(archivo)
  try {
    const ratio = img.naturalWidth / img.naturalHeight

    if (!objetivoKB) {
      const nuevoAncho = Math.min(img.naturalWidth, anchoMax)
      const nuevoAlto = Math.round(nuevoAncho / ratio)
      return await _renderJpeg(img, nuevoAncho, nuevoAlto, calidad)
    }

    const objetivoBytes = objetivoKB * 1024
    let mejor = null

    for (const multAncho of escalonesAncho) {
      const anchoIntento = Math.min(img.naturalWidth, Math.floor(anchoMax * multAncho))
      const altoIntento = Math.max(1, Math.round(anchoIntento / ratio))
      for (const q of escalonesCalidad) {
        if (q > calidad) continue // no superar el techo de calidad por sección
        const data = await _renderJpeg(img, anchoIntento, altoIntento, q)
        if (data.byteLength <= objetivoBytes) return data
        if (!mejor || data.byteLength < mejor.byteLength) mejor = data
      }
    }
    return mejor
  } finally {
    URL.revokeObjectURL(url)
  }
}

export const formatearHora = (v) => {
  const s = String(v).replace(/[^0-9]/g, '')
  if (s.length === 0) return ''
  if (s.length <= 2) return s.padStart(2, '0') + ':00'
  if (s.length === 3) return '0' + s[0] + ':' + s.slice(1)
  return s.slice(0, 2) + ':' + s.slice(2, 4)
}

export const parsearTonelaje = (v) => parseFloat(String(v).replace(/,/g, '')) || 0

export const formatearTonelaje = (v) => {
  const n = parsearTonelaje(v); if (n === 0 && !v) return '0.000'
  return n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}

export const obtenerDimensiones = (archivo) =>
  new Promise((r) => {
    const img = new Image()
    img.onload = () => { r({ ancho: img.naturalWidth, alto: img.naturalHeight }); URL.revokeObjectURL(img.src) }
    img.src = URL.createObjectURL(archivo)
  })

// Actualiza un campo anidado por ruta de puntos: "eventos.0.mes"
export const actualizarProfundo = (obj, ruta, valor) => {
  const copia = JSON.parse(JSON.stringify(obj))
  const claves = ruta.split('.')
  let actual = copia
  for (let i = 0; i < claves.length - 1; i++) actual = actual[claves[i]]
  actual[claves[claves.length - 1]] = valor
  return copia
}

export function formatearFechaRelativa(iso) {
  if (!iso) return ''
  const ahora = Date.now()
  const fecha = new Date(iso)
  const diff = ahora - fecha.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Justo ahora'
  if (mins < 60) return `Hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Hace ${hrs}h`
  const dias = Math.floor(hrs / 24)
  if (dias < 7) return `Hace ${dias}d`
  return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}
