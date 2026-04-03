// ═══════════════════════════════════════════════════════════════════
// ALMACENAMIENTO — localStorage + IndexedDB para persistencia
// ═══════════════════════════════════════════════════════════════════

const INDICE_KEY = 'smp-reportes-indice'
const REPORTE_PREFIX = 'smp-reporte-'
const DB_NAME = 'smp-reportes-db'
const DB_VERSION = 1

// ─── IndexedDB ───

let dbPromise = null

function abrirDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('fotos')) db.createObjectStore('fotos')
      if (!db.objectStoreNames.contains('fotosPortada')) db.createObjectStore('fotosPortada')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

async function guardarFoto(reporteId, fotoId, blob, meta) {
  const db = await abrirDB()
  const tx = db.transaction('fotos', 'readwrite')
  tx.objectStore('fotos').put({ blob, reporteId, ...meta }, `${reporteId}-${fotoId}`)
  return new Promise((r, rj) => { tx.oncomplete = r; tx.onerror = () => rj(tx.error) })
}

async function guardarFotoPortada(reporteId, fotoId, blob, meta) {
  const db = await abrirDB()
  const tx = db.transaction('fotosPortada', 'readwrite')
  tx.objectStore('fotosPortada').put({ blob, reporteId, ...meta }, `${reporteId}-${fotoId}`)
  return new Promise((r, rj) => { tx.oncomplete = r; tx.onerror = () => rj(tx.error) })
}

async function cargarFotos(reporteId) {
  const db = await abrirDB()
  const tx = db.transaction('fotos', 'readonly')
  const store = tx.objectStore('fotos')
  return new Promise((resolve, reject) => {
    const req = store.openCursor()
    const resultado = []
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor) {
        if (cursor.value.reporteId === reporteId) resultado.push({ key: cursor.key, ...cursor.value })
        cursor.continue()
      } else {
        resolve(resultado)
      }
    }
    req.onerror = () => reject(req.error)
  })
}

async function cargarFotosPortada(reporteId) {
  const db = await abrirDB()
  const tx = db.transaction('fotosPortada', 'readonly')
  const store = tx.objectStore('fotosPortada')
  return new Promise((resolve, reject) => {
    const req = store.openCursor()
    const resultado = []
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor) {
        if (cursor.value.reporteId === reporteId) resultado.push({ key: cursor.key, ...cursor.value })
        cursor.continue()
      } else {
        resolve(resultado)
      }
    }
    req.onerror = () => reject(req.error)
  })
}

async function eliminarFotosReporte(reporteId) {
  const db = await abrirDB()
  for (const storeName of ['fotos', 'fotosPortada']) {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.openCursor()
    await new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const cursor = req.result
        if (cursor) {
          if (cursor.value.reporteId === reporteId) cursor.delete()
          cursor.continue()
        } else {
          resolve()
        }
      }
      req.onerror = () => reject(req.error)
    })
  }
}

// ─── localStorage: Índice ───

export function obtenerIndice() {
  try {
    return JSON.parse(localStorage.getItem(INDICE_KEY)) || []
  } catch { return [] }
}

export function guardarIndice(indice) {
  localStorage.setItem(INDICE_KEY, JSON.stringify(indice))
}

// ─── localStorage: Datos de reporte ───

export function guardarReporte(id, datos) {
  try {
    localStorage.setItem(REPORTE_PREFIX + id, JSON.stringify(datos))
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.warn('localStorage lleno. No se pudo guardar el reporte.')
    }
  }
}

export function cargarReporte(id) {
  try {
    return JSON.parse(localStorage.getItem(REPORTE_PREFIX + id))
  } catch { return null }
}

export function eliminarReporte(id) {
  localStorage.removeItem(REPORTE_PREFIX + id)
  const indice = obtenerIndice().filter((r) => r.id !== id)
  guardarIndice(indice)
}

// ─── Fotos: guardar/cargar/eliminar (IndexedDB) ───

export async function guardarFotosReporte(reporteId, fotos, fotosPortada) {
  const db = await abrirDB()

  // Limpiar fotos anteriores del reporte
  for (const storeName of ['fotos', 'fotosPortada']) {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.openCursor()
    await new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const cursor = req.result
        if (cursor) {
          if (cursor.value.reporteId === reporteId) cursor.delete()
          cursor.continue()
        } else { resolve() }
      }
      req.onerror = () => reject(req.error)
    })
  }

  // Guardar fotos de bodegas
  for (const foto of fotos) {
    const blob = foto.archivo instanceof Blob ? foto.archivo : null
    if (blob) {
      await guardarFoto(reporteId, foto.id, blob, {
        categoriaKey: foto.categoriaKey,
        nombre: foto.nombre,
        fotoId: foto.id,
      })
    }
  }

  // Guardar fotos de portada
  for (const foto of fotosPortada) {
    const blob = foto.archivo instanceof Blob ? foto.archivo : null
    if (blob) {
      await guardarFotoPortada(reporteId, foto.id, blob, {
        nombre: foto.nombre,
        fotoId: foto.id,
      })
    }
  }
}

export async function cargarFotosReporte(reporteId) {
  const leerComoDataURL = (blob) =>
    new Promise((r) => { const l = new FileReader(); l.onload = () => r(l.result); l.readAsDataURL(blob) })

  const fotosRaw = await cargarFotos(reporteId)
  const fotos = []
  for (const f of fotosRaw) {
    const archivo = new File([f.blob], f.nombre || 'foto.jpg', { type: f.blob.type || 'image/jpeg' })
    const dataUrl = await leerComoDataURL(archivo)
    fotos.push({ id: f.fotoId, archivo, dataUrl, categoriaKey: f.categoriaKey, nombre: f.nombre })
  }

  const portadaRaw = await cargarFotosPortada(reporteId)
  const fotosPortada = []
  for (const f of portadaRaw) {
    const archivo = new File([f.blob], f.nombre || 'portada.jpg', { type: f.blob.type || 'image/jpeg' })
    const dataUrl = await leerComoDataURL(archivo)
    fotosPortada.push({ id: f.fotoId, archivo, dataUrl, nombre: f.nombre })
  }

  return { fotos, fotosPortada }
}

export { eliminarFotosReporte }

// ─── Cálculo de progreso ───

export function calcularProgreso({ config, operacion, stowage, numFotos, numFotosPortada, generado }) {
  let p = 0
  if (config?.buque?.trim()) p += 15
  if (operacion?.eventos?.some((e) => e.mes) && operacion?.cargaTotal?.trim()) p += 20
  if (stowage?.bodegas?.some((b) => parseFloat(b.tonelaje) > 0)) p += 20
  if (numFotosPortada >= 2 && numFotos > 0) p += 35
  if (generado) p += 10
  return p
}
