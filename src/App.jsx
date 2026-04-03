import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import {
  Ship, Settings, Clock, Table2, Camera, Download, Upload, List,
  Trash2, GripVertical, Plus, Check, ChevronLeft, ChevronRight,
  Eye, FileText, Home, BarChart3, CheckCircle2, Loader2,
} from 'lucide-react'
import {
  obtenerIndice, guardarIndice, guardarReporte, cargarReporte, eliminarReporte as eliminarReporteStorage,
  guardarFotosReporte, cargarFotosReporte, eliminarFotosReporte, calcularProgreso,
} from './almacenamiento'

// ═══════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════

const NAVY = '#0C1D2E'
const ACCENT = '#EA580C'

const PUERTOS = [
  { codigo: 'VER', nombre: 'Veracruz' },
  { codigo: 'ALT', nombre: 'Altamira' },
  { codigo: 'LZC', nombre: 'Lázaro Cárdenas' },
  { codigo: 'MZT', nombre: 'Mazatlán' },
  { codigo: 'MNZ', nombre: 'Manzanillo' },
  { codigo: 'HOU', nombre: 'Houston' },
  { codigo: 'NOL', nombre: 'New Orleans' },
]

const EVENTOS = [
  'ARRIBO',
  'NOR TENDERED',
  'ATRAQUE',
  'INICIO OPERACIONES',
  'TERMINO OPERACIONES',
]

const MESES = [
  'ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
  'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE',
]

const SECCIONES_EXTRA = [
  'DESCARGA DE BUQUE',
  'AREA DE ALMACENAMIENTO',
  'DOCUMENTOS',
]

const PASOS = [
  { clave: 'config', etiqueta: 'Configuración', corta: 'Config', icono: Settings },
  { clave: 'operacion', etiqueta: 'Datos de Operación', corta: 'Operación', icono: Clock },
  { clave: 'stowage', etiqueta: 'Stowage Plan', corta: 'Stowage', icono: Table2 },
  { clave: 'fotos', etiqueta: 'Fotos de Bodegas', corta: 'Fotos', icono: Camera },
  { clave: 'generar', etiqueta: 'Generar Reporte', corta: 'Generar', icono: Download },
]

// Medidas exactas del documento original (DXA: 1440 = 1 pulgada)
const DOC = {
  anchoHoja: 12240,
  altoHoja: 15840,
  margenTop: 1417,
  margenBottom: 1417,
  margenLeft: 1701,
  margenRight: 1701,
  header: 708,
  footer: 708,
  anchoContenido: 8838, // 12240 - 1701*2
  // EMU: 914400 = 1 pulgada
  anchoImagenEMU: 5612130, // ancho de foto = ancho de contenido completo (6.14 pulgadas)
}

// Anchos de tablas del documento original
const TABLA_EVENTOS = { cols: [4416, 4412], total: 8828 }
const TABLA_CANTIDADES = { cols: [4600, 1035, 978, 2215], total: 8828 }
const TABLA_BL = { cols: [2802, 2976, 993, 2348], total: 9119 }
const TABLA_STOWAGE = { cols: [1701, 2976, 2348], total: 7025 }

// ═══════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════

const uid = () => Math.random().toString(36).slice(2, 10)

const leerComoDataURL = (archivo) =>
  new Promise((r) => { const l = new FileReader(); l.onload = () => r(l.result); l.readAsDataURL(archivo) })

const leerComoArrayBuffer = (archivo) =>
  new Promise((r) => { const l = new FileReader(); l.onload = () => r(l.result); l.readAsArrayBuffer(archivo) })

const leerImagen = async (archivo) => new Uint8Array(await leerComoArrayBuffer(archivo))

const formatearHora = (v) => {
  const s = String(v).replace(/[^0-9]/g, '')
  if (s.length === 0) return ''
  if (s.length <= 2) return s.padStart(2, '0') + ':00'
  if (s.length === 3) return '0' + s[0] + ':' + s.slice(1)
  return s.slice(0, 2) + ':' + s.slice(2, 4)
}

const parsearTonelaje = (v) => parseFloat(String(v).replace(/,/g, '')) || 0

const formatearTonelaje = (v) => {
  const n = parsearTonelaje(v); if (n === 0 && !v) return '0.000'
  return n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}

const obtenerDimensiones = (archivo) =>
  new Promise((r) => {
    const img = new Image()
    img.onload = () => { r({ ancho: img.naturalWidth, alto: img.naturalHeight }); URL.revokeObjectURL(img.src) }
    img.src = URL.createObjectURL(archivo)
  })

// Actualiza un campo anidado por ruta de puntos: "eventos.0.mes"
const actualizarProfundo = (obj, ruta, valor) => {
  const copia = JSON.parse(JSON.stringify(obj))
  const claves = ruta.split('.')
  let actual = copia
  for (let i = 0; i < claves.length - 1; i++) actual = actual[claves[i]]
  actual[claves[claves.length - 1]] = valor
  return copia
}

// ═══════════════════════════════════════════════════════════════════
// VALIDACIÓN POR PASO
// ═══════════════════════════════════════════════════════════════════

const validarPaso = (indicePaso, { config, operacion, stowage, fotos, fotosPortada }) => {
  const faltantes = []
  switch (indicePaso) {
    case 0: // Config
      if (!config.buque.trim()) faltantes.push('Nombre del buque')
      break
    case 1: { // Operación
      const tieneEvento = operacion.eventos.some((e) => e.mes && e.dia && e.hora)
      if (!tieneEvento) faltantes.push('Al menos 1 evento con fecha')
      if (!operacion.cargaTotal || parsearTonelaje(operacion.cargaTotal) === 0) faltantes.push('Carga total')
      break
    }
    case 2: { // Stowage
      const tieneBodega = stowage.bodegas.some((b) => b.producto.trim() && parsearTonelaje(b.tonelaje) > 0)
      if (!tieneBodega) faltantes.push('Al menos 1 bodega con producto y tonelaje')
      break
    }
    case 3: // Fotos
      if (fotosPortada.length < 2) faltantes.push(`Fotos de portada (${fotosPortada.length}/2)`)
      if (fotos.length < 1) faltantes.push('Al menos 1 foto de bodega')
      break
    default:
      break
  }
  return { completo: faltantes.length === 0, faltantes }
}

// ═══════════════════════════════════════════════════════════════════
// VALORES INICIALES
// ═══════════════════════════════════════════════════════════════════

const configInicial = () => ({
  puerto: 'VER', consecutivo: '001', anio: String(new Date().getFullYear()),
  buque: '', viaje: 'V01',
})

const operacionInicial = () => ({
  arriboA: '',
  eventos: EVENTOS.map((n) => ({ nombre: n, mes: '', dia: '', anio: String(new Date().getFullYear()), hora: '' })),
  cargaTotal: '',
  cantidades: [{ descripcion: '', tipo: 'LOTE', piezas: '1', tonelaje: '' }],
  bls: [{ numero: '', puerto: '', piezas: '1', tonelaje: '' }],
})

const stowageInicial = () => ({
  bodegas: Array.from({ length: 5 }, (_, i) => ({
    numero: `No ${String(i + 1).padStart(2, '0')}`, producto: '', tonelaje: '0.000',
  })),
  observaciones: '',
})


// ═══════════════════════════════════════════════════════════════════
// COMPONENTES DE UI
// ═══════════════════════════════════════════════════════════════════

function Tarjeta({ titulo, subtitulo, icono, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {titulo && (
        <div className="px-7 py-5 border-b border-gray-100 flex items-center gap-3">
          {icono && <div className="text-accent">{icono}</div>}
          <div>
            <h3 className="m-0 text-base font-semibold text-navy font-lexend">{titulo}</h3>
            {subtitulo && <p className="mt-0.5 text-[13px] text-gray-400 mb-0">{subtitulo}</p>}
          </div>
        </div>
      )}
      <div className="px-7 py-6">{children}</div>
    </div>
  )
}

function Entrada({ etiqueta, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {etiqueta && <label className="text-xs font-medium text-gray-400 font-lexend uppercase tracking-wider">{etiqueta}</label>}
      <input {...props} className={`px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-lg text-sm font-source text-navy bg-white placeholder:text-gray-300 ${className}`} />
    </div>
  )
}

function Boton({ children, variante = 'primario', icono, className = '', deshabilitado, ...props }) {
  const estilos = {
    primario: 'bg-accent text-white hover:bg-orange-700',
    secundario: 'bg-white text-navy border-[1.5px] border-gray-200 hover:border-gray-300 hover:bg-gray-50',
    fantasma: 'bg-transparent text-gray-500 hover:text-navy hover:bg-gray-50',
    peligro: 'bg-red-50 text-red-600 hover:bg-red-100',
  }
  return (
    <button disabled={deshabilitado} {...props}
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold font-lexend cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed ${estilos[variante] || estilos.primario} ${className}`}>
      {icono}{children}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════
// PASO 1: CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════

function PasoConfig({ config, setConfig }) {
  const act = (c) => (e) => setConfig((p) => ({ ...p, [c]: e.target.value }))
  return (
    <div className="flex flex-col gap-6">
      <Tarjeta titulo="Datos del Buque" subtitulo="Información principal de la embarcación" icono={<Ship size={22} />}>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-400 font-lexend uppercase tracking-wider">Puerto</label>
            <select value={config.puerto} onChange={act('puerto')} className="px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-lg text-sm font-source text-navy bg-white cursor-pointer">
              {PUERTOS.map((p) => <option key={p.codigo} value={p.codigo}>{p.codigo} — {p.nombre}</option>)}
            </select>
          </div>
          <Entrada etiqueta="Consecutivo" value={config.consecutivo} onChange={act('consecutivo')} placeholder="001" />
          <Entrada etiqueta="Año" value={config.anio} onChange={act('anio')} placeholder="2026" />
        </div>
        <div className="grid grid-cols-[2fr_1fr] gap-4 mt-4">
          <Entrada etiqueta="Nombre del Buque" value={config.buque} onChange={act('buque')} placeholder="STELLAR INDIGO" />
          <Entrada etiqueta="Viaje" value={config.viaje} onChange={act('viaje')} placeholder="V01" />
        </div>
      </Tarjeta>
      <Tarjeta titulo="Cliente" subtitulo="Datos fijos de DEACERO" icono={<Settings size={22} />}>
        <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-600 font-source">
          <p className="m-0 mb-1"><strong className="text-navy">DEACERO SAPI DE CV</strong> — DEA7103086X2</p>
          <p className="m-0 mb-1">Av. Lázaro Cárdenas 2333, Col. Valle Oriente, San Pedro Garza Garcia, Nuevo Leon. CP 66269</p>
          <p className="m-0">Tel. 01 800 021 33 22</p>
        </div>
      </Tarjeta>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// PASO 2: DATOS DE OPERACIÓN
// ═══════════════════════════════════════════════════════════════════

function PasoOperacion({ operacion, setOperacion }) {
  const act = (ruta, val) => setOperacion((p) => actualizarProfundo(p, ruta, val))
  return (
    <div className="flex flex-col gap-6">
      <Tarjeta titulo="Fechas y Horarios" subtitulo="Eventos principales de la operación" icono={<Clock size={22} />}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-navy text-white">
                {['Evento', 'Mes', 'Día, Año', 'Hora'].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-lexend font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {operacion.eventos.map((ev, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="px-3 py-2 font-semibold text-navy font-lexend text-xs">
                    {ev.nombre === 'ARRIBO' ? (
                      <div className="flex items-center gap-1">
                        <span>ARRIBO A</span>
                        <input value={operacion.arriboA} onChange={(e) => act('arriboA', e.target.value)} placeholder="Veracruz" className="w-24 px-1.5 py-0.5 border border-gray-200 rounded-md text-xs font-normal" />
                      </div>
                    ) : ev.nombre}
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={ev.mes} onChange={(e) => act(`eventos.${i}.mes`, e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-xs bg-white">
                      <option value="">—</option>
                      {MESES.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex gap-1.5">
                      <input value={ev.dia} onChange={(e) => act(`eventos.${i}.dia`, e.target.value)} placeholder="16" className="w-10 px-2 py-1.5 border border-gray-200 rounded-md text-xs" />
                      <input value={ev.anio} onChange={(e) => act(`eventos.${i}.anio`, e.target.value)} placeholder="2026" className="w-[52px] px-2 py-1.5 border border-gray-200 rounded-md text-xs" />
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <input value={ev.hora} onChange={(e) => act(`eventos.${i}.hora`, e.target.value)} onBlur={() => act(`eventos.${i}.hora`, formatearHora(ev.hora))} placeholder="16:30" className="w-20 px-2 py-1.5 border border-gray-200 rounded-md text-xs" />
                      <span className="text-xs font-semibold text-navy">HRS</span>
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="bg-accent-light">
                <td className="px-3 py-2 font-bold text-accent font-lexend text-xs">CARGA TOTAL</td>
                <td />
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1">
                    <input value={operacion.cargaTotal} onChange={(e) => act('cargaTotal', e.target.value)} onBlur={() => act('cargaTotal', formatearTonelaje(operacion.cargaTotal))} placeholder="19,919.000" className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-xs" />
                    <span className="text-xs font-semibold text-accent">MT</span>
                  </div>
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Cantidades Recibidas" icono={<List size={22} />}>
        {operacion.cantidades.map((c, i) => (
          <div key={i} className="grid grid-cols-[2fr_1fr_80px_1fr_40px] gap-2.5 mb-2.5 items-end">
            <Entrada etiqueta={i === 0 ? 'Descripción' : undefined} value={c.descripcion} onChange={(e) => act(`cantidades.${i}.descripcion`, e.target.value)} placeholder="PIG IRON IN BULK" />
            <Entrada etiqueta={i === 0 ? 'Tipo' : undefined} value={c.tipo} onChange={(e) => act(`cantidades.${i}.tipo`, e.target.value)} placeholder="LOTE" />
            <Entrada etiqueta={i === 0 ? 'Piezas' : undefined} value={c.piezas} onChange={(e) => act(`cantidades.${i}.piezas`, e.target.value)} placeholder="1" />
            <Entrada etiqueta={i === 0 ? 'Tonelaje (MT)' : undefined} value={c.tonelaje} onChange={(e) => act(`cantidades.${i}.tonelaje`, e.target.value)} onBlur={() => act(`cantidades.${i}.tonelaje`, formatearTonelaje(c.tonelaje))} placeholder="19,919.000" />
            <Boton variante="fantasma" className="!p-1.5 mb-0.5" onClick={() => setOperacion((p) => ({ ...p, cantidades: p.cantidades.filter((_, j) => j !== i) }))}><Trash2 size={16} className="text-red-500" /></Boton>
          </div>
        ))}
        <Boton variante="secundario" icono={<Plus size={16} />} onClick={() => setOperacion((p) => ({ ...p, cantidades: [...p.cantidades, { descripcion: '', tipo: 'LOTE', piezas: '1', tonelaje: '' }] }))}>Agregar producto</Boton>
      </Tarjeta>

      <Tarjeta titulo="Bills of Lading (BL)" icono={<FileText size={22} />}>
        {operacion.bls.map((bl, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_80px_1fr_40px] gap-2.5 mb-2.5 items-end">
            <Entrada etiqueta={i === 0 ? 'Número de BL' : undefined} value={bl.numero} onChange={(e) => act(`bls.${i}.numero`, e.target.value)} placeholder="BL-001" />
            <Entrada etiqueta={i === 0 ? 'Puerto/Producto' : undefined} value={bl.puerto} onChange={(e) => act(`bls.${i}.puerto`, e.target.value)} placeholder="PIG IRON" />
            <Entrada etiqueta={i === 0 ? 'Piezas' : undefined} value={bl.piezas} onChange={(e) => act(`bls.${i}.piezas`, e.target.value)} placeholder="1" />
            <Entrada etiqueta={i === 0 ? 'Tonelaje (MT)' : undefined} value={bl.tonelaje} onChange={(e) => act(`bls.${i}.tonelaje`, e.target.value)} onBlur={() => act(`bls.${i}.tonelaje`, formatearTonelaje(bl.tonelaje))} placeholder="19,919.000" />
            <Boton variante="fantasma" className="!p-1.5 mb-0.5" onClick={() => setOperacion((p) => ({ ...p, bls: p.bls.filter((_, j) => j !== i) }))}><Trash2 size={16} className="text-red-500" /></Boton>
          </div>
        ))}
        <Boton variante="secundario" icono={<Plus size={16} />} onClick={() => setOperacion((p) => ({ ...p, bls: [...p.bls, { numero: '', puerto: '', piezas: '1', tonelaje: '' }] }))}>Agregar BL</Boton>
      </Tarjeta>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// PASO 3: STOWAGE PLAN
// ═══════════════════════════════════════════════════════════════════

function PasoStowage({ stowage, setStowage }) {
  const act = (ruta, val) => setStowage((p) => actualizarProfundo(p, ruta, val))
  const total = stowage.bodegas.reduce((s, b) => s + (parsearTonelaje(b.tonelaje)), 0)

  return (
    <div className="flex flex-col gap-6">
      <Tarjeta titulo="Stowage Plan" subtitulo="Distribución de carga por bodega" icono={<Table2 size={22} />}>
        <table className="w-full border-collapse text-[13px]">
          <thead><tr className="bg-navy text-white">
            {['Bodega', 'Producto', 'Tonelaje (MT)'].map((h) => <th key={h} className="px-3 py-2.5 text-left font-lexend font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>
            {stowage.bodegas.map((b, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="px-3 py-2 font-semibold text-navy font-lexend text-xs">{b.numero}</td>
                <td className="px-2 py-1.5"><input value={b.producto} onChange={(e) => act(`bodegas.${i}.producto`, e.target.value)} placeholder={i % 2 === 1 ? 'EMPTY' : 'PIG IRON IN BULK'} className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-xs" /></td>
                <td className="px-2 py-1.5"><input value={b.tonelaje} onChange={(e) => act(`bodegas.${i}.tonelaje`, e.target.value)} onBlur={() => act(`bodegas.${i}.tonelaje`, formatearTonelaje(b.tonelaje))} placeholder="0.000" className="w-[120px] px-2 py-1.5 border border-gray-200 rounded-md text-xs text-right" /></td>
              </tr>
            ))}
            <tr className="bg-accent-light font-bold">
              <td className="px-3 py-2.5 text-accent font-lexend">TOTALES</td><td />
              <td className="px-3 py-2.5 text-accent font-lexend text-right">{formatearTonelaje(total)}</td>
            </tr>
          </tbody>
        </table>
        <div className="mt-3 flex gap-2">
          <Boton variante="secundario" icono={<Plus size={16} />} onClick={() => setStowage((p) => ({ ...p, bodegas: [...p.bodegas, { numero: `No ${String(p.bodegas.length + 1).padStart(2, '0')}`, producto: '', tonelaje: '0.000' }] }))}>Agregar bodega</Boton>
          {stowage.bodegas.length > 1 && <Boton variante="fantasma" onClick={() => setStowage((p) => ({ ...p, bodegas: p.bodegas.slice(0, -1) }))}>Quitar última</Boton>}
        </div>
      </Tarjeta>
      <Tarjeta titulo="Observaciones" subtitulo="Descripción detallada de la operación" icono={<List size={22} />}>
        <textarea value={stowage.observaciones} onChange={(e) => setStowage((p) => ({ ...p, observaciones: e.target.value }))} placeholder="EL BUQUE ARRIBO EL DIA 13 DE ENERO DE 2026 A LAS 06:25 HRS..."
          className="w-full px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-lg text-sm font-source text-navy bg-white resize-y min-h-[200px] placeholder:text-gray-300" />
      </Tarjeta>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// PASO 4: FOTOS (EL PASO CLAVE)
// ═══════════════════════════════════════════════════════════════════

function PasoFotos({ fotos, setFotos, fotosPortada, setFotosPortada, numBodegas }) {
  const inputRef = useRef(null)
  const inputPortadaRef = useRef(null)
  const [bodegaSel, setBodegaSel] = useState(0)
  const [arrastrado, setArrastrado] = useState(null)
  const [sobre, setSobre] = useState(null)

  const categorias = useMemo(() => {
    const cats = []
    for (let i = 1; i <= numBodegas; i++) cats.push({ tipo: 'bodega', numero: i, clave: `bodega-${i}`, etiqueta: `Bodega ${i}` })
    SECCIONES_EXTRA.forEach((s) => cats.push({ tipo: 'seccion', nombre: s, clave: `seccion-${s}`, etiqueta: s }))
    return cats
  }, [numBodegas])

  const fotosPorCat = useMemo(() => {
    const m = {}; categorias.forEach((c) => { m[c.clave] = [] })
    fotos.forEach((f) => { if (m[f.categoriaKey]) m[f.categoriaKey].push(f) })
    return m
  }, [fotos, categorias])

  const catActual = categorias[bodegaSel] || categorias[0]

  const procesarArchivos = async (archivos) => {
    const nuevas = []
    for (const a of archivos) {
      if (!a.type.startsWith('image/')) continue
      nuevas.push({ id: uid(), archivo: a, dataUrl: await leerComoDataURL(a), categoriaKey: catActual.clave, nombre: a.name })
    }
    setFotos((p) => [...p, ...nuevas])
  }

  const procesarPortada = async (archivos) => {
    const nuevas = []
    for (const a of archivos) {
      if (!a.type.startsWith('image/')) continue
      nuevas.push({ id: uid(), archivo: a, dataUrl: await leerComoDataURL(a), nombre: a.name })
    }
    setFotosPortada((p) => [...p, ...nuevas].slice(0, 2))
  }

  const manejarDrop = (e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('zona-drop-activa'); procesarArchivos(Array.from(e.dataTransfer.files)) }
  const manejarDragOver = (e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('zona-drop-activa') }
  const manejarDragLeave = (e) => { e.currentTarget.classList.remove('zona-drop-activa') }

  const finalizarArrastre = () => {
    if (arrastrado && sobre) {
      setFotos((p) => { const a = [...p]; const d = a.findIndex((f) => f.id === arrastrado); const h = a.findIndex((f) => f.id === sobre); if (d < 0 || h < 0) return p; const [item] = a.splice(d, 1); a.splice(h, 0, item); return a })
    }
    setArrastrado(null); setSobre(null)
  }

  const verTodas = bodegaSel === 'todas'

  return (
    <div className="flex flex-col gap-6">
      {/* Portada */}
      <Tarjeta titulo="Fotos de Portada" subtitulo="2 fotos del buque para la primera página" icono={<Ship size={22} />}>
        <div className="flex gap-4 flex-wrap items-center">
          {fotosPortada.map((f, i) => (
            <div key={f.id} className="relative rounded-xl overflow-hidden border-2 border-gray-200">
              <img src={f.dataUrl} alt={`Portada ${i + 1}`} className="w-60 h-[150px] object-cover" />
              <div className="absolute top-1.5 left-1.5 bg-accent text-white px-2 py-0.5 rounded-md text-[11px] font-bold font-lexend">Portada {i + 1}</div>
              <button onClick={() => setFotosPortada((p) => p.filter((_, j) => j !== i))} className="absolute top-1.5 right-1.5 bg-black/60 text-white border-none rounded-md w-[26px] h-[26px] cursor-pointer flex items-center justify-center text-sm hover:bg-black/80">×</button>
            </div>
          ))}
          {fotosPortada.length < 2 && (
            <label className="w-60 h-[150px] border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer text-gray-400 gap-2 hover:border-accent hover:text-accent transition-colors">
              <Upload size={28} /><span className="text-[13px] font-lexend">Subir foto del buque</span>
              <input ref={inputPortadaRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => procesarPortada(Array.from(e.target.files))} />
            </label>
          )}
        </div>
      </Tarjeta>

      {/* Bodegas */}
      <Tarjeta titulo="Fotos de Bodegas y Secciones" subtitulo={`${fotos.length} fotos en total`} icono={<Camera size={22} />}>
        {/* Tabs — bodegas primero, "Todas" al final y discreto */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {categorias.map((c, idx) => (
            <Boton key={c.clave} variante={bodegaSel === idx ? 'primario' : 'secundario'} className="!px-3.5 !py-1.5 !text-xs" onClick={() => setBodegaSel(idx)}>
              {c.etiqueta} ({fotosPorCat[c.clave]?.length || 0})
            </Boton>
          ))}
          <button onClick={() => setBodegaSel('todas')} className={`px-3 py-1.5 text-[11px] rounded-lg border cursor-pointer font-lexend transition-colors ${verTodas ? 'bg-gray-200 border-gray-300 text-navy font-semibold' : 'bg-transparent border-gray-200 text-gray-400 hover:text-gray-500'}`}>
            Todas ({fotos.length})
          </button>
        </div>

        {/* Drop zone — solo cuando hay una categoría seleccionada */}
        {!verTodas && (
          <div onDrop={manejarDrop} onDragOver={manejarDragOver} onDragLeave={manejarDragLeave} onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl px-6 py-8 text-center mb-5 bg-gray-50 cursor-pointer transition-all hover:border-accent/50">
            <Upload size={36} className="mx-auto text-gray-400" />
            <p className="mt-3 mb-1 text-[15px] font-semibold text-navy font-lexend">Arrastra fotos aquí o haz clic para seleccionar</p>
            <p className="m-0 text-[13px] text-gray-400">Se asignarán a <strong className="text-accent">{catActual?.etiqueta}</strong></p>
            <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { procesarArchivos(Array.from(e.target.files)); e.target.value = '' }} />
          </div>
        )}

        {/* Grid */}
        {(verTodas ? categorias : [catActual]).filter(Boolean).map((cat) => {
          const grupo = fotosPorCat[cat.clave] || []
          if (grupo.length === 0 && !verTodas) return (
            <div key={cat.clave} className="py-10 text-center text-gray-400">
              <Camera size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="font-lexend text-sm">No hay fotos para {cat.etiqueta}</p>
            </div>
          )
          if (grupo.length === 0) return null
          return (
            <div key={cat.clave} className="mb-6">
              {verTodas && <h4 className="font-lexend text-sm font-bold text-accent m-0 mb-3 pb-2 border-b-2 border-accent-light">{cat.etiqueta.toUpperCase()} — {grupo.length} fotos</h4>}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
                {grupo.map((foto) => (
                  <div key={foto.id} draggable onDragStart={() => setArrastrado(foto.id)} onDragOver={(e) => { e.preventDefault(); if (arrastrado) setSobre(foto.id) }} onDragEnd={finalizarArrastre}
                    className={`relative rounded-xl overflow-hidden cursor-grab transition-all ${sobre === foto.id ? 'border-2 border-accent' : 'border-2 border-gray-200'} ${arrastrado === foto.id ? 'opacity-50' : ''}`}>
                    <img src={foto.dataUrl} alt={foto.nombre} className="w-full h-[120px] object-cover block" />
                    <div className="px-2 py-1.5 bg-white flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1">
                        <GripVertical size={14} className="text-gray-300" />
                        <select value={foto.categoriaKey} onChange={(e) => setFotos((p) => p.map((f) => f.id === foto.id ? { ...f, categoriaKey: e.target.value } : f))}
                          className="border-none text-[11px] font-semibold text-accent bg-transparent cursor-pointer font-lexend">
                          {categorias.map((c) => <option key={c.clave} value={c.clave}>{c.etiqueta}</option>)}
                        </select>
                      </div>
                      <button onClick={() => setFotos((p) => p.filter((f) => f.id !== foto.id))} className="bg-transparent border-none cursor-pointer p-0.5"><Trash2 size={14} className="text-red-500" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </Tarjeta>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// PASO 5: STATEMENTS OF FACTS
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// PASO 5: GENERAR REPORTE
// ═══════════════════════════════════════════════════════════════════

function PasoGenerar({ config, operacion, stowage, fotos, fotosPortada, generando, onGenerar }) {
  const nombre = `REPORTE_${config.puerto}_${config.consecutivo}-${config.anio}_MV_${(config.buque || 'BUQUE').replace(/\s+/g, '_')}__${config.viaje}_${config.puerto}_IMP.docx`
  const pags = (() => {
    let p = 3 // portada + operación + stowage
    const fpc = {}
    for (const f of fotos) { if (!fpc[f.categoriaKey]) fpc[f.categoriaKey] = []; fpc[f.categoriaKey].push(f) }
    const bodegas = stowage.bodegas.map((_, i) => `bodega-${i + 1}`)
    const secciones = ['seccion-DESCARGA DE BUQUE', 'seccion-AREA DE ALMACENAMIENTO', 'seccion-DOCUMENTOS']
    for (const cat of [...bodegas, ...secciones]) {
      const g = fpc[cat] || []
      const bi = cat.startsWith('bodega-') ? parseInt(cat.replace('bodega-', '')) - 1 : -1
      const esEmpty = bi >= 0 && stowage.bodegas[bi] && stowage.bodegas[bi].producto.toUpperCase().trim() === 'EMPTY' && g.length === 0
      if (esEmpty) { p += 1; continue }
      if (g.length === 0) continue
      p += cat === 'seccion-DOCUMENTOS' ? g.length : Math.ceil(g.length / 2)
    }
    return p
  })()
  const Chk = ({ ok, t }) => (
    <div className="flex items-center gap-2"><div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${ok ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>{ok ? '✓' : '—'}</div><span className={ok ? 'text-navy' : 'text-gray-400'}>{t}</span></div>
  )
  return (
    <div className="flex flex-col gap-6">
      <Tarjeta titulo="Resumen del Reporte" icono={<Eye size={22} />}>
        <div className="grid grid-cols-2 gap-4 mb-5">
          {[
            ['Código', `${config.puerto}-LP-${config.consecutivo}-${config.anio}`],
            ['Buque', `MV ${config.buque || '—'} ${config.viaje}`],
            ['Cliente', 'DEACERO SAPI DE CV'],
            ['Fotos', `${fotosPortada.length} portada + ${fotos.length} bodegas`],
          ].map(([l, v]) => (
            <div key={l} className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400 m-0 mb-1 font-lexend uppercase">{l}</p>
              <p className="text-base font-bold text-navy m-0 font-lexend">{v}</p>
            </div>
          ))}
        </div>
        <div className="p-4 bg-accent-light rounded-xl border border-accent/20 mb-5">
          <p className="text-[13px] text-gray-700 m-0 mb-1"><strong>Archivo:</strong> {nombre}</p>
          <p className="text-[13px] text-gray-700 m-0"><strong>Páginas estimadas:</strong> ~{pags}</p>
        </div>
        <div className="mb-5 p-4 bg-gray-50 rounded-xl">
          <p className="text-xs font-semibold text-gray-500 font-lexend uppercase m-0 mb-3">Contenido incluido</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Chk ok={fotosPortada.length === 2} t="2 fotos de portada" />
            <Chk ok={!!config.buque} t="Nombre del buque" />
            <Chk ok={operacion.eventos.some((e) => e.mes)} t="Fechas de operación" />
            <Chk ok={stowage.bodegas.some((b) => parsearTonelaje(b.tonelaje) > 0)} t="Stowage plan" />
            <Chk ok={!!stowage.observaciones} t="Observaciones" />
            <Chk ok={fotos.length > 0} t={`${fotos.length} fotos de bodegas`} />
          </div>
        </div>
        <Boton onClick={onGenerar} deshabilitado={generando} icono={generando ? null : <Download size={18} />} className="!w-full !py-4 !text-base !rounded-xl">
          {generando ? 'Generando documento...' : 'Generar Reporte .docx'}
        </Boton>
      </Tarjeta>
      <Tarjeta titulo="Preview del Documento" subtitulo={`${pags} páginas estimadas`} icono={<Camera size={22} />}>
        {(() => {
          // Construir páginas que replican la estructura real del .docx
          const paginas = []

          // Pág 1: Portada
          paginas.push({ tipo: 'portada', fotos: fotosPortada })
          // Pág 2: Datos de Operación
          paginas.push({ tipo: 'datos' })
          // Pág 3: Stowage + Observaciones
          paginas.push({ tipo: 'stowage' })

          // Páginas de fotos: agrupar por categoría igual que generarDocx
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
            const titulo = cat.startsWith('bodega-')
              ? `BODEGA No ${cat.replace('bodega-', '').padStart(2, '0')}`
              : cat.replace('seccion-', '')
            const esDoc = cat === 'seccion-DOCUMENTOS'

            if (esEmpty) {
              paginas.push({ tipo: 'empty', titulo })
              continue
            }
            if (fotosGrupo.length === 0) continue

            let i = 0
            let primera = true
            while (i < fotosGrupo.length) {
              if (esDoc) {
                paginas.push({ tipo: 'foto-doc', titulo: primera ? titulo : null, foto: fotosGrupo[i] })
                i += 1
              } else {
                paginas.push({ tipo: 'foto-par', titulo: primera ? titulo : null, f1: fotosGrupo[i], f2: fotosGrupo[i + 1] || null })
                i += 2
              }
              primera = false
            }
          }

          // Miniatura de página base
          const MiniPag = ({ num, children, destacar }) => (
            <div className={`border rounded-xl p-2 bg-white flex flex-col shadow-sm ${destacar ? 'border-accent/40 ring-1 ring-accent/20' : 'border-gray-200'}`} style={{ aspectRatio: '8.5/11' }}>
              <div className="h-1.5 bg-barra rounded-sm mb-1 shrink-0" />
              <div className="text-[7px] text-gray-400 text-center mb-1 shrink-0 font-lexend">Pág. {num}</div>
              <div className="flex-1 flex flex-col justify-center min-h-0 overflow-hidden">{children}</div>
            </div>
          )

          // Agrupar páginas por sección para separadores visuales
          let seccionActual = null
          const elementos = []

          paginas.forEach((p, idx) => {
            const num = idx + 1
            // Determinar sección
            let seccion = null
            if (p.tipo === 'portada' || p.tipo === 'datos' || p.tipo === 'stowage') seccion = 'info'
            else if (p.titulo) seccion = p.titulo
            else seccion = seccionActual

            if (seccion !== seccionActual && seccion !== 'info') {
              seccionActual = seccion
              if (seccion) elementos.push({ tipo: 'separador', texto: seccion })
            } else {
              seccionActual = seccion
            }

            if (p.tipo === 'portada') {
              elementos.push({ tipo: 'pagina', contenido: (
                <MiniPag key={idx} num={num}>
                  <div className="text-[8px] font-bold text-navy text-center mb-1 shrink-0 font-lexend">PORTADA</div>
                  {p.fotos.length > 0 ? (
                    <div className="flex-1 flex flex-col gap-1 min-h-0 px-0.5">
                      {p.fotos.map((fp, fi) => (
                        <div key={fi} className="flex-1 min-h-0 flex items-center">
                          <img src={fp.dataUrl || fp.archivo} className="w-full h-full object-contain rounded" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center"><span className="text-[8px] text-gray-300">Sin fotos</span></div>
                  )}
                </MiniPag>
              )})
            } else if (p.tipo === 'datos') {
              elementos.push({ tipo: 'pagina', contenido: (
                <MiniPag key={idx} num={num}>
                  <div className="text-[8px] font-bold text-navy text-center mb-2 font-lexend">OPERACIÓN</div>
                  <div className="space-y-1 px-2">
                    {[1,2,3].map(t => <div key={t} className="h-2.5 bg-gray-100 rounded-[2px]" />)}
                    <div className="h-0.5 bg-yellow-400 my-1 rounded-full" />
                    {[1,2].map(t => <div key={t} className="h-2 bg-gray-100 rounded-[2px]" />)}
                    <div className="h-0.5 bg-orange-400 my-1 rounded-full" />
                    {[1,2].map(t => <div key={t} className="h-2 bg-gray-100 rounded-[2px]" />)}
                  </div>
                </MiniPag>
              )})
            } else if (p.tipo === 'stowage') {
              elementos.push({ tipo: 'pagina', contenido: (
                <MiniPag key={idx} num={num}>
                  <div className="text-[8px] font-bold text-navy text-center mb-2 font-lexend">STOWAGE</div>
                  <div className="space-y-1 px-2">
                    {stowage.bodegas.slice(0, 5).map((_, bi) => <div key={bi} className="h-2 bg-gray-100 rounded-[2px]" />)}
                    <div className="h-2 bg-accent/10 rounded-[2px]" />
                  </div>
                  <div className="text-[7px] text-gray-400 text-center mt-2">Observaciones</div>
                </MiniPag>
              )})
            } else if (p.tipo === 'empty') {
              elementos.push({ tipo: 'pagina', contenido: (
                <MiniPag key={idx} num={num} destacar>
                  <div className="text-[8px] font-bold text-accent text-center mb-1">{p.titulo}</div>
                  <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg mx-1 my-0.5">
                    <span className="text-xl font-black text-navy tracking-[0.2em]">EMPTY</span>
                  </div>
                </MiniPag>
              )})
            } else if (p.tipo === 'foto-doc') {
              elementos.push({ tipo: 'pagina', contenido: (
                <MiniPag key={idx} num={num}>
                  {p.titulo && <div className="text-[7px] font-bold text-accent text-center mb-1 shrink-0">{p.titulo}</div>}
                  <div className="flex-1 flex items-center justify-center px-1 min-h-0">
                    <img src={p.foto.dataUrl} className="w-full h-full object-contain rounded" />
                  </div>
                </MiniPag>
              )})
            } else if (p.tipo === 'foto-par') {
              elementos.push({ tipo: 'pagina', contenido: (
                <MiniPag key={idx} num={num}>
                  {p.titulo && <div className="text-[7px] font-bold text-accent text-center mb-1 shrink-0">{p.titulo}</div>}
                  <div className="flex-1 flex flex-col gap-1 min-h-0 px-0.5">
                    <div className="flex-1 min-h-0 flex items-center">
                      <img src={p.f1.dataUrl} className="w-full h-full object-contain rounded" />
                    </div>
                    {p.f2 && <div className="flex-1 min-h-0 flex items-center">
                      <img src={p.f2.dataUrl} className="w-full h-full object-contain rounded" />
                    </div>}
                  </div>
                </MiniPag>
              )})
            }
          })

          return (
            <div className="space-y-3">
              {(() => {
                const bloques = []
                let bloque = []
                for (const el of elementos) {
                  if (el.tipo === 'separador') {
                    if (bloque.length > 0) bloques.push({ paginas: bloque, separador: null })
                    bloque = []
                    bloques.push({ paginas: [], separador: el.texto })
                  } else {
                    bloque.push(el.contenido)
                  }
                }
                if (bloque.length > 0) bloques.push({ paginas: bloque, separador: null })

                return bloques.map((b, bi) => {
                  if (b.separador) return (
                    <div key={`sep-${bi}`} className="flex items-center gap-2 pt-2">
                      <div className="h-px flex-1 bg-accent/20" />
                      <span className="text-[10px] font-bold text-accent font-lexend tracking-wide">{b.separador}</span>
                      <div className="h-px flex-1 bg-accent/20" />
                    </div>
                  )
                  return (
                    <div key={`grid-${bi}`} className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
                      {b.paginas}
                    </div>
                  )
                })
              })()}
            </div>
          )
        })()}
      </Tarjeta>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// GENERACIÓN DEL .DOCX
// ═══════════════════════════════════════════════════════════════════

// Datos fijos de DEACERO
const CLIENTE = {
  nombre: 'DEACERO SAPI DE CV',
  rfc: 'DEA7103086X2',
  direccion: 'Av. Lázaro Cárdenas 2333, Col. Valle Oriente, San Pedro Garza Garcia, Nuevo Leon. CP 66269',
  telefono: '01 800 021 33 22',
}

async function generarDocx({ config, operacion, stowage, fotos, fotosPortada }) {
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
  // Dos fotos deben llenar la cuartilla. 590px = 6.14" a 96 DPI (ancho completo del contenido)
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

  // Fila separadora de color (amarilla o naranja) para tablas 2-4
  const filaSeparadora = (cols, color) => new TableRow({ children: cols.map((ancho) => celda('', { ancho, fondo: color })) })

  const cb = { fuente: 'Cambria', tamano: 22 } // Cambria 11 para tablas de cantidades y BL
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

  // Construir lista ordenada de todas las categorías (bodegas del stowage + secciones de fotos)
  const bodegasDelStowage = stowage.bodegas.map((_, idx) => `bodega-${idx + 1}`)
  const seccionesOrdenadas = ['seccion-DESCARGA DE BUQUE', 'seccion-AREA DE ALMACENAMIENTO', 'seccion-DOCUMENTOS']
  const todasCats = [...bodegasDelStowage, ...seccionesOrdenadas]

  // Agrupar fotos por categoría
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
      // Bodega EMPTY sin fotos: página con título + "EMPTY" centrado
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

      // Título de sección al inicio del grupo
      if (!catTituloPuesto) {
        catTituloPuesto = true
        pagina.push(new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 },
          children: [new TextRun({ text: tituloCategoria(cat), bold: true, size: 28, font: 'Arial' })],
        }))
      }

      if (esDocumentos(cat)) {
        // DOCUMENTOS: 1 foto por página, ancho 545px = ~5.7"
        const dims = await obtenerDimensiones(fotosGrupo[i].archivo)
        const altoPt = Math.min(Math.round((dims.alto / dims.ancho) * 545), 710)
        pagina.push(
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: 'jpg', data: await leerImagen(fotosGrupo[i].archivo), transformation: { width: 545, height: altoPt }, altText: { title: 'Foto', description: 'Documento', name: `foto-doc-${i}` } })] }),
        )
        i += 1
      } else {
        // 2 fotos por página, ancho completo 590px = 6.14"
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

  // Quitar el último PageBreak de fotos para evitar página vacía al final
  if (pagsFotos.length > 0) pagsFotos.pop()

  // ═══ PASO 1: Generar documento con docx library (header/footer temporal) ═══
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
  // Renombrar para evitar conflicto con imágenes del body
  const imgBarra = await zipTpl.file('word/media/image1.png')?.async('uint8array')
  const imgLogo = await zipTpl.file('word/media/image2.png')?.async('uint8array')
  zipGen.file('word/media/hdr_barra.png', imgBarra)
  zipGen.file('word/media/hdr_logo.png', imgLogo)

  // Actualizar header2.xml.rels para apuntar a los nombres renombrados
  let hdr2Rels = await zipGen.file('word/_rels/header2.xml.rels').async('string')
  hdr2Rels = hdr2Rels.replace(/media\/image1\.png/g, 'media/hdr_barra.png')
  hdr2Rels = hdr2Rels.replace(/media\/image2\.png/g, 'media/hdr_logo.png')
  zipGen.file('word/_rels/header2.xml.rels', hdr2Rels)

  // Actualizar document.xml.rels: quitar refs de header/footer viejos, agregar los del template
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

  // Actualizar sectPr en document.xml: quitar refs viejas, agregar del template
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

  // Actualizar [Content_Types].xml para incluir todos los headers/footers
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

// ═══════════════════════════════════════════════════════════════════
// HOMEPAGE / DASHBOARD
// ═══════════════════════════════════════════════════════════════════

function formatearFechaRelativa(iso) {
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

function PaginaInicio({ reportes, onNuevo, onAbrir, onEliminar, onDescargar, descargandoId }) {
  const total = reportes.length
  const completados = reportes.filter((r) => r.progreso >= 100).length
  const enProgreso = total - completados

  return (
    <div className="font-source bg-gradient-to-br from-gray-50 to-slate-100 min-h-screen text-navy">
      {/* Barra superior */}
      <div className="bg-navy px-8 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
            <Ship size={22} className="text-white" />
          </div>
          <div>
            <h1 className="m-0 text-lg font-bold text-white font-lexend tracking-tight">SMP Reportes</h1>
            <p className="m-0 text-[11px] text-white/40 font-lexend">Generador de Reportes de Operación</p>
          </div>
        </div>
        <div className="text-xs text-white/30 font-lexend">Naviera SMP, S.A. de C.V.</div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 pt-8 pb-16">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Reportes', valor: total, icono: <BarChart3 size={20} />, color: 'bg-navy' },
            { label: 'Completados', valor: completados, icono: <CheckCircle2 size={20} />, color: 'bg-green-600' },
            { label: 'En Progreso', valor: enProgreso, icono: <Loader2 size={20} />, color: 'bg-accent' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl ${s.color} flex items-center justify-center text-white`}>{s.icono}</div>
              <div>
                <p className="m-0 text-2xl font-bold text-navy font-lexend">{s.valor}</p>
                <p className="m-0 text-xs text-gray-400 font-lexend">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Header + Botón nuevo */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="m-0 text-xl font-bold font-lexend text-navy">Mis Reportes</h2>
          <Boton icono={<Plus size={18} />} onClick={onNuevo} className="!py-3 !px-6 !text-base">Nuevo Reporte</Boton>
        </div>

        {/* Estado vacío */}
        {total === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
            <Ship size={56} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-navy font-lexend m-0 mb-2">No hay reportes todavía</h3>
            <p className="text-sm text-gray-400 m-0 mb-6">Crea tu primer reporte de operación para empezar</p>
            <Boton icono={<Plus size={18} />} onClick={onNuevo} className="!py-3 !px-8 !text-base">Crear Primer Reporte</Boton>
          </div>
        )}

        {/* Grid de tarjetas */}
        {total > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportes.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="m-0 text-base font-bold text-navy font-lexend truncate">
                        {r.buque || 'Sin nombre'}
                      </h3>
                      <p className="m-0 text-xs text-gray-400 font-lexend mt-0.5">
                        {r.puerto}-{r.consecutivo}-{r.anio}  {r.viaje}
                      </p>
                    </div>
                    <div className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-lexend ${r.progreso >= 100 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-accent'}`}>
                      {r.progreso >= 100 ? 'Completo' : `${r.progreso}%`}
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="w-full h-2 bg-gray-100 rounded-full mb-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${r.progreso >= 100 ? 'bg-green-500' : 'bg-accent'}`}
                      style={{ width: `${Math.min(r.progreso, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-400 font-lexend mb-4">
                    <span>{r.numFotos || 0} fotos · {r.numFotosPortada || 0} portada</span>
                    <span>{formatearFechaRelativa(r.ultimaEdicion)}</span>
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2">
                    <Boton onClick={() => onAbrir(r.id)} className="flex-1 !py-2 !text-xs !rounded-lg" icono={<ChevronRight size={14} />}>
                      Continuar
                    </Boton>
                    {r.progreso >= 100 && (
                      <Boton variante="secundario" className="!py-2 !px-3 !rounded-lg" deshabilitado={descargandoId === r.id}
                        onClick={() => onDescargar(r.id)}
                        icono={descargandoId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                      />
                    )}
                    <Boton variante="peligro" className="!py-2 !px-3 !rounded-lg" onClick={() => {
                      if (confirm(`¿Eliminar el reporte de ${r.buque || 'este buque'}?`)) onEliminar(r.id)
                    }} icono={<Trash2 size={14} />} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// APP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

export default function App() {
  const [vista, setVista] = useState('inicio') // 'inicio' | 'wizard'
  const [reporteActualId, setReporteActualId] = useState(null)
  const [reportes, setReportes] = useState([])

  const [paso, setPaso] = useState(0)
  const [maxPasoVisitado, setMaxPasoVisitado] = useState(0)
  const [config, setConfig] = useState(configInicial())
  const [operacion, setOperacion] = useState(operacionInicial())
  const [stowage, setStowage] = useState(stowageInicial())
  const [fotos, setFotos] = useState([])
  const [fotosPortada, setFotosPortada] = useState([])
  const [generando, setGenerando] = useState(false)
  const [generadoFlag, setGeneradoFlag] = useState(false)
  const [descargandoId, setDescargandoId] = useState(null)
  const [cargando, setCargando] = useState(false)

  const irAPaso = useCallback((i) => {
    setPaso(i)
    setMaxPasoVisitado((prev) => Math.max(prev, i))
  }, [])

  const guardadoTimeout = useRef(null)
  const fotosGuardadasRef = useRef(false)

  // Cargar índice al montar
  useEffect(() => {
    setReportes(obtenerIndice())
  }, [])

  // ─── Auto-guardado de datos de texto (debounced 1.5s) ───
  const flushGuardado = useCallback(() => {
    if (!reporteActualId) return
    clearTimeout(guardadoTimeout.current)
    guardarReporte(reporteActualId, { config, operacion, stowage, pasoActual: paso, generado: generadoFlag })
    const indice = obtenerIndice().map((r) =>
      r.id === reporteActualId ? {
        ...r,
        buque: config.buque, puerto: config.puerto, consecutivo: config.consecutivo,
        anio: config.anio, viaje: config.viaje,
        codigo: `${config.puerto}-${config.consecutivo}-${config.anio}`,
        ultimaEdicion: new Date().toISOString(), pasoActual: paso,
        numFotos: fotos.length, numFotosPortada: fotosPortada.length,
        progreso: calcularProgreso({ config, operacion, stowage, numFotos: fotos.length, numFotosPortada: fotosPortada.length, generado: generadoFlag }),
      } : r
    )
    guardarIndice(indice)
    setReportes(indice)
  }, [reporteActualId, config, operacion, stowage, paso, fotos.length, fotosPortada.length, generadoFlag])

  useEffect(() => {
    if (!reporteActualId || vista !== 'wizard') return
    clearTimeout(guardadoTimeout.current)
    guardadoTimeout.current = setTimeout(flushGuardado, 1500)
    return () => clearTimeout(guardadoTimeout.current)
  }, [config, operacion, stowage, paso, flushGuardado, reporteActualId, vista])

  // ─── Guardar fotos en IndexedDB cuando cambian ───
  useEffect(() => {
    if (!reporteActualId || vista !== 'wizard' || cargando) return
    // Evitar guardar justo después de cargar
    if (!fotosGuardadasRef.current) { fotosGuardadasRef.current = true; return }
    guardarFotosReporte(reporteActualId, fotos, fotosPortada).catch(console.error)
  }, [fotos, fotosPortada, reporteActualId, vista, cargando])

  // ─── Acciones de la homepage ───
  const crearReporte = () => {
    const id = uid()
    const nuevoConfig = configInicial()
    const nuevoOp = operacionInicial()
    const nuevoStow = stowageInicial()
    guardarReporte(id, { config: nuevoConfig, operacion: nuevoOp, stowage: nuevoStow, pasoActual: 0, generado: false })
    const entrada = {
      id, buque: '', puerto: nuevoConfig.puerto, consecutivo: nuevoConfig.consecutivo,
      anio: nuevoConfig.anio, viaje: nuevoConfig.viaje,
      codigo: `${nuevoConfig.puerto}-${nuevoConfig.consecutivo}-${nuevoConfig.anio}`,
      ultimaEdicion: new Date().toISOString(), pasoActual: 0,
      progreso: 0, numFotos: 0, numFotosPortada: 0,
    }
    const nuevoIndice = [entrada, ...obtenerIndice()]
    guardarIndice(nuevoIndice)
    setReportes(nuevoIndice)

    setConfig(nuevoConfig)
    setOperacion(nuevoOp)
    setStowage(nuevoStow)
    setFotos([])
    setFotosPortada([])
    setPaso(0)
    setMaxPasoVisitado(0)
    setGeneradoFlag(false)
    setReporteActualId(id)
    fotosGuardadasRef.current = false
    setVista('wizard')
  }

  const abrirReporte = async (id) => {
    setCargando(true)
    const datos = cargarReporte(id)
    if (!datos) { setCargando(false); return }

    setConfig(datos.config || configInicial())
    setOperacion(datos.operacion || operacionInicial())
    setStowage(datos.stowage || stowageInicial())
    const pasoGuardado = datos.pasoActual || 0
    setPaso(pasoGuardado)
    setMaxPasoVisitado(pasoGuardado)
    setGeneradoFlag(datos.generado || false)

    try {
      const { fotos: fotosDB, fotosPortada: portadaDB } = await cargarFotosReporte(id)
      setFotos(fotosDB)
      setFotosPortada(portadaDB)
    } catch (e) {
      console.error('Error cargando fotos:', e)
      setFotos([])
      setFotosPortada([])
    }

    setReporteActualId(id)
    fotosGuardadasRef.current = false
    setVista('wizard')
    setCargando(false)
  }

  const eliminarReporteHandler = async (id) => {
    eliminarReporteStorage(id)
    try { await eliminarFotosReporte(id) } catch (e) { console.error(e) }
    setReportes(obtenerIndice())
  }

  const descargarDesdeInicio = async (id) => {
    setDescargandoId(id)
    try {
      const datos = cargarReporte(id)
      if (!datos) return
      const { fotos: fotosDB, fotosPortada: portadaDB } = await cargarFotosReporte(id)
      await generarDocx({ config: datos.config, operacion: datos.operacion, stowage: datos.stowage, fotos: fotosDB, fotosPortada: portadaDB })
    } catch (err) {
      console.error(err)
      alert('Error al generar: ' + err.message)
    } finally {
      setDescargandoId(null)
    }
  }

  const volverAInicio = () => {
    flushGuardado()
    if (reporteActualId && fotos.length > 0) {
      guardarFotosReporte(reporteActualId, fotos, fotosPortada).catch(console.error)
    }
    setReportes(obtenerIndice())
    setReporteActualId(null)
    setVista('inicio')
  }

  const manejarGenerar = async () => {
    setGenerando(true)
    try {
      await generarDocx({ config, operacion, stowage, fotos, fotosPortada })
      setGeneradoFlag(true)
    } catch (err) {
      console.error(err)
      alert('Error al generar: ' + err.message)
    } finally {
      setGenerando(false)
    }
  }

  // ─── Vista: Homepage ───
  if (vista === 'inicio') {
    return <PaginaInicio
      reportes={reportes}
      onNuevo={crearReporte}
      onAbrir={abrirReporte}
      onEliminar={eliminarReporteHandler}
      onDescargar={descargarDesdeInicio}
      descargandoId={descargandoId}
    />
  }

  // ─── Vista: Wizard (cargando) ───
  if (cargando) {
    return (
      <div className="font-source bg-gradient-to-br from-gray-50 to-slate-100 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-accent mx-auto mb-4" />
          <p className="text-gray-500 font-lexend">Cargando reporte...</p>
        </div>
      </div>
    )
  }

  // ─── Vista: Wizard ───
  return (
    <div className="font-source bg-gradient-to-br from-gray-50 to-slate-100 min-h-screen text-navy">
      {/* Barra superior */}
      <div className="bg-navy px-8 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3.5">
          <button onClick={volverAInicio} className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center border-none cursor-pointer transition-colors" title="Volver a inicio">
            <Home size={20} className="text-white" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
            <Ship size={22} className="text-white" />
          </div>
          <div>
            <h1 className="m-0 text-lg font-bold text-white font-lexend tracking-tight">SMP Reportes</h1>
            <p className="m-0 text-[11px] text-white/40 font-lexend">{config.buque || 'Nuevo Reporte'} — {config.puerto}-{config.consecutivo}-{config.anio}</p>
          </div>
        </div>
        <button onClick={volverAInicio} className="text-xs text-white/50 hover:text-white font-lexend bg-transparent border-none cursor-pointer transition-colors flex items-center gap-1.5">
          <Home size={14} /> Volver a Inicio
        </button>
      </div>

      {/* Navegación */}
      <div className="bg-white border-b border-gray-100 px-8 flex gap-0 overflow-x-auto">
        {PASOS.map((p, i) => {
          const activo = paso === i
          const yaVisitado = i < maxPasoVisitado
          const validacion = yaVisitado && !activo ? validarPaso(i, { config, operacion, stowage, fotos, fotosPortada }) : null
          const completo = validacion?.completo
          const incompleto = validacion && !validacion.completo
          return (
            <button key={p.clave} onClick={() => irAPaso(i)}
              className={`group relative flex items-center gap-2 px-5 py-3.5 bg-transparent cursor-pointer transition-all border-0 border-b-[3px] ${activo ? 'border-b-accent opacity-100' : incompleto ? 'border-b-accent/40 opacity-80' : 'border-b-transparent opacity-50 hover:opacity-75'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-lexend ${activo ? 'bg-accent text-white' : completo ? 'bg-green-500 text-white' : incompleto ? 'bg-orange-100 text-accent border-2 border-accent' : 'bg-gray-200 text-gray-500'}`}>
                {completo ? <Check size={14} /> : incompleto ? '!' : i + 1}
              </div>
              <span className={`text-[13px] whitespace-nowrap font-lexend ${activo ? 'font-bold text-navy' : incompleto ? 'font-semibold text-accent' : 'font-medium text-gray-500'}`}>{p.corta}</span>
              {incompleto && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-navy text-white text-[11px] px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-50 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
                  <div className="font-bold mb-0.5">Falta:</div>
                  {validacion.faltantes.map((f) => <div key={f}>• {f}</div>)}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Contenido */}
      <div className="max-w-[960px] mx-auto px-6 pt-7 pb-16">
        <div className="mb-5">
          <h2 className="m-0 mb-1 text-[22px] font-bold font-lexend text-navy">{PASOS[paso].etiqueta}</h2>
          <p className="m-0 text-[13px] text-gray-400">Paso {paso + 1} de {PASOS.length}</p>
        </div>

        {paso === 0 && <PasoConfig config={config} setConfig={setConfig} />}
        {paso === 1 && <PasoOperacion operacion={operacion} setOperacion={setOperacion} />}
        {paso === 2 && <PasoStowage stowage={stowage} setStowage={setStowage} />}
        {paso === 3 && <PasoFotos fotos={fotos} setFotos={setFotos} fotosPortada={fotosPortada} setFotosPortada={setFotosPortada} numBodegas={stowage.bodegas.length} />}
        {paso === 4 && <PasoGenerar config={config} operacion={operacion} stowage={stowage} fotos={fotos} fotosPortada={fotosPortada} generando={generando} onGenerar={manejarGenerar} />}

        {/* Navegación inferior */}
        <div className="flex justify-between mt-8 pt-5 border-t border-gray-100">
          <Boton variante="secundario" icono={<ChevronLeft size={16} />} onClick={() => irAPaso(Math.max(0, paso - 1))} deshabilitado={paso === 0}>Anterior</Boton>
          {paso < PASOS.length - 1 && <Boton icono={<ChevronRight size={16} />} onClick={() => irAPaso(Math.min(PASOS.length - 1, paso + 1))}>Siguiente</Boton>}
        </div>
      </div>
    </div>
  )
}
