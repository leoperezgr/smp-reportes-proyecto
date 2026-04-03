import { useState, useRef, useMemo } from 'react'
import { Ship, Camera, Upload, Trash2, GripVertical } from 'lucide-react'
import { SECCIONES_EXTRA } from '../constantes'
import { uid, leerComoDataURL } from '../utilidades'
import { Tarjeta, Boton } from './ui'

export default function PasoFotos({ fotos, setFotos, fotosPortada, setFotosPortada, numBodegas }) {
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
        {/* Tabs */}
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

        {/* Drop zone */}
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
