import { useState, useRef, useEffect, useCallback } from 'react'
import { Ship, Home, Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import {
  obtenerIndice, guardarIndice, guardarReporte, cargarReporte, eliminarReporte as eliminarReporteStorage,
  guardarFotosReporte, cargarFotosReporte, eliminarFotosReporte, calcularProgreso,
} from './almacenamiento'
import { PASOS, configInicial, operacionInicial, stowageInicial, exportacionInicial } from './constantes'
import { uid } from './utilidades'
import { validarPaso } from './validacion'
import generarDocx from './generador/generarDocx'
import { Boton } from './componentes/ui'
import PasoConfig from './componentes/PasoConfig'
import PasoOperacion from './componentes/PasoOperacion'
import PasoStowage from './componentes/PasoStowage'
import PasoFotos from './componentes/PasoFotos'
import PasoGenerar from './componentes/PasoGenerar'
import PaginaInicio from './componentes/PaginaInicio'

export default function App() {
  const [vista, setVista] = useState('inicio')
  const [reporteActualId, setReporteActualId] = useState(null)
  const [reportes, setReportes] = useState([])

  const [paso, setPaso] = useState(0)
  const [maxPasoVisitado, setMaxPasoVisitado] = useState(0)
  const [config, setConfig] = useState(configInicial())
  const [operacion, setOperacion] = useState(operacionInicial())
  const [stowage, setStowage] = useState(stowageInicial())
  const [fotos, setFotos] = useState([])
  const [fotosPortada, setFotosPortada] = useState([])
  const [exportacion, setExportacion] = useState(exportacionInicial())
  const [generando, setGenerando] = useState(false)
  const [generandoPdf, setGenerandoPdf] = useState(false)
  const [generadoFlag, setGeneradoFlag] = useState(false)
  const [descargandoId, setDescargandoId] = useState(null)
  const [cargando, setCargando] = useState(false)

  const irAPaso = useCallback((i) => {
    setPaso(i)
    setMaxPasoVisitado((prev) => Math.max(prev, i))
    window.scrollTo({ top: 0, behavior: 'instant' })
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
    guardarReporte(reporteActualId, { config, operacion, stowage, exportacion, pasoActual: paso, generado: generadoFlag })
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
  }, [reporteActualId, config, operacion, stowage, exportacion, paso, fotos.length, fotosPortada.length, generadoFlag])

  useEffect(() => {
    if (!reporteActualId || vista !== 'wizard') return
    clearTimeout(guardadoTimeout.current)
    guardadoTimeout.current = setTimeout(flushGuardado, 1500)
    return () => clearTimeout(guardadoTimeout.current)
  }, [config, operacion, stowage, exportacion, paso, flushGuardado, reporteActualId, vista])

  // ─── Guardar fotos en IndexedDB cuando cambian ───
  useEffect(() => {
    if (!reporteActualId || vista !== 'wizard' || cargando) return
    if (!fotosGuardadasRef.current) { fotosGuardadasRef.current = true; return }
    guardarFotosReporte(reporteActualId, fotos, fotosPortada).catch(console.error)
  }, [fotos, fotosPortada, reporteActualId, vista, cargando])

  // ─── Acciones de la homepage ───
  const crearReporte = () => {
    setVista('seleccion-tipo')
  }

  const iniciarReporteConTipo = (tipo) => {
    const id = uid()
    const nuevoConfig = { ...configInicial(), tipoOperacion: tipo }
    const nuevoOp = operacionInicial(tipo)
    const nuevoStow = stowageInicial(tipo)
    const nuevoExp = exportacionInicial()
    guardarReporte(id, { config: nuevoConfig, operacion: nuevoOp, stowage: nuevoStow, exportacion: nuevoExp, pasoActual: 0, generado: false })
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
    setExportacion(nuevoExp)
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

    const cfg = datos.config || configInicial()
    setConfig(cfg)
    setOperacion(datos.operacion || operacionInicial(cfg.tipoOperacion))
    setStowage(datos.stowage || stowageInicial())
    setExportacion(datos.exportacion || exportacionInicial())
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
      await generarDocx({ config: datos.config, operacion: datos.operacion, stowage: datos.stowage, exportacion: datos.exportacion, fotos: fotosDB, fotosPortada: portadaDB })
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
      await generarDocx({ config, operacion, stowage, exportacion, fotos, fotosPortada })
      setGeneradoFlag(true)
    } catch (err) {
      console.error(err)
      alert('Error al generar: ' + err.message)
    } finally {
      setGenerando(false)
    }
  }

  const manejarGenerarPdf = async () => {
    if (!window.electronAPI || !window.electronAPI.esElectron) {
      alert('La generación de PDF solo está disponible en la app de escritorio.')
      return
    }
    if (window.electronAPI.plataforma !== 'win32') {
      alert('La conversión a PDF requiere Microsoft Word en Windows.')
      return
    }
    setGenerandoPdf(true)
    try {
      const { blob, nombre } = await generarDocx({ config, operacion, stowage, exportacion, fotos, fotosPortada, devolverBlob: true })
      const docxBuffer = await blob.arrayBuffer()
      const nombreBase = nombre.replace(/\.docx$/i, '')
      const resultado = await window.electronAPI.convertirDocxAPdf(docxBuffer, nombreBase)
      if (!resultado.ok) {
        throw new Error(resultado.error || 'No se pudo generar el PDF')
      }
      const pdfBlob = new Blob([resultado.pdf], { type: 'application/pdf' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(pdfBlob)
      link.download = resultado.nombre
      link.click()
      URL.revokeObjectURL(link.href)
      setGeneradoFlag(true)
    } catch (err) {
      console.error(err)
      alert('Error al generar PDF: ' + err.message)
    } finally {
      setGenerandoPdf(false)
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

  // ─── Vista: Selección de tipo ───
  if (vista === 'seleccion-tipo') {
    return (
      <div className="font-source bg-gradient-to-br from-gray-50 to-slate-100 min-h-screen text-navy">
        <div className="bg-navy px-8 py-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3.5">
            <button onClick={() => setVista('inicio')} className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center border-none cursor-pointer transition-colors" title="Volver">
              <Home size={20} className="text-white" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <Ship size={22} className="text-white" />
            </div>
            <div>
              <h1 className="m-0 text-lg font-bold text-white font-lexend tracking-tight">SMP Reportes</h1>
              <p className="m-0 text-[11px] text-white/40 font-lexend">Nuevo Reporte</p>
            </div>
          </div>
        </div>
        <div className="max-w-[600px] mx-auto px-6 pt-16">
          <h2 className="text-center text-2xl font-bold font-lexend text-navy mb-2">Tipo de Operación</h2>
          <p className="text-center text-sm text-gray-400 mb-10 font-lexend">Selecciona el tipo de reporte que deseas crear</p>
          <div className="flex gap-5">
            {[
              { tipo: 'IMP', label: 'Importación', desc: 'Descarga de mercancía al puerto' },
              { tipo: 'EXP', label: 'Exportación', desc: 'Carga de mercancía al buque' },
            ].map((op) => (
              <button key={op.tipo} onClick={() => iniciarReporteConTipo(op.tipo)}
                className="flex-1 p-8 bg-white rounded-2xl border-2 border-gray-200 hover:border-accent hover:shadow-lg cursor-pointer transition-all group text-left">
                <div className="w-14 h-14 rounded-xl bg-accent/10 group-hover:bg-accent flex items-center justify-center mb-5 transition-colors">
                  <Ship size={28} className="text-accent group-hover:text-white transition-colors" />
                </div>
                <h3 className="m-0 text-lg font-bold font-lexend text-navy mb-1">{op.label}</h3>
                <p className="m-0 text-sm text-gray-400 font-source">{op.desc}</p>
                <div className="mt-4 text-xs font-semibold font-lexend text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                  Crear reporte →
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
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
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1.5 rounded-lg text-xs font-lexend font-semibold ${config.tipoOperacion === 'EXP' ? 'bg-accent text-white' : 'bg-white/10 text-white/60'}`}>
            {config.tipoOperacion === 'EXP' ? 'Exportación' : 'Importación'}
          </span>
          <button onClick={volverAInicio} className="text-xs text-white/50 hover:text-white font-lexend bg-transparent border-none cursor-pointer transition-colors flex items-center gap-1.5">
            <Home size={14} /> Volver a Inicio
          </button>
        </div>
      </div>

      {/* Navegación */}
      <div className="bg-white border-b border-gray-100 px-8 flex gap-0">
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
        {paso === 1 && <PasoOperacion operacion={operacion} setOperacion={setOperacion} config={config} />}
        {paso === 2 && <PasoStowage stowage={stowage} setStowage={setStowage} config={config} exportacion={exportacion} setExportacion={setExportacion} />}
        {paso === 3 && <PasoFotos fotos={fotos} setFotos={setFotos} fotosPortada={fotosPortada} setFotosPortada={setFotosPortada} numBodegas={stowage.bodegas.length} config={config} />}
        {paso === 4 && <PasoGenerar config={config} operacion={operacion} stowage={stowage} exportacion={exportacion} fotos={fotos} fotosPortada={fotosPortada} generando={generando} onGenerar={manejarGenerar} generandoPdf={generandoPdf} onGenerarPdf={manejarGenerarPdf} />}

        {/* Navegación inferior */}
        <div className="flex justify-between mt-8 pt-5 border-t border-gray-100">
          <Boton variante="secundario" icono={<ChevronLeft size={16} />} onClick={() => irAPaso(Math.max(0, paso - 1))} deshabilitado={paso === 0}>Anterior</Boton>
          {paso < PASOS.length - 1 && <Boton icono={<ChevronRight size={16} />} onClick={() => irAPaso(Math.min(PASOS.length - 1, paso + 1))}>Siguiente</Boton>}
        </div>
      </div>
    </div>
  )
}
