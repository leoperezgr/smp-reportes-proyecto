export const uid = () => Math.random().toString(36).slice(2, 10)

export const leerComoDataURL = (archivo) =>
  new Promise((r) => { const l = new FileReader(); l.onload = () => r(l.result); l.readAsDataURL(archivo) })

export const leerComoArrayBuffer = (archivo) =>
  new Promise((r) => { const l = new FileReader(); l.onload = () => r(l.result); l.readAsArrayBuffer(archivo) })

export const leerImagen = async (archivo) => new Uint8Array(await leerComoArrayBuffer(archivo))

// Recomprime y redimensiona una imagen antes de embeberla en el .docx.
// No escala hacia arriba; si la foto ya es menor que anchoMax sólo la recomprime a JPEG.
// Preserva aspect ratio. Se usa en el momento de generación para mantener el original en IndexedDB intacto.
export const leerImagenComprimida = (archivo, { anchoMax = 1800, calidad = 0.85 } = {}) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo)
    const img = new Image()
    img.onload = () => {
      try {
        const ratio = img.naturalWidth / img.naturalHeight
        const nuevoAncho = Math.min(img.naturalWidth, anchoMax)
        const nuevoAlto = Math.round(nuevoAncho / ratio)
        const canvas = document.createElement('canvas')
        canvas.width = nuevoAncho
        canvas.height = nuevoAlto
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, nuevoAncho, nuevoAlto)
        ctx.drawImage(img, 0, 0, nuevoAncho, nuevoAlto)
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url)
            if (!blob) return reject(new Error('canvas.toBlob devolvió null'))
            blob.arrayBuffer().then((ab) => resolve(new Uint8Array(ab))).catch(reject)
          },
          'image/jpeg',
          calidad
        )
      } catch (e) {
        URL.revokeObjectURL(url)
        reject(e)
      }
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo cargar la imagen')) }
    img.src = url
  })

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
