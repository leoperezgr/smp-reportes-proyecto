import { Eye, Camera, Download, Ship, FileText } from 'lucide-react'
import { parsearTonelaje, formatearTonelaje } from '../utilidades'
import { Tarjeta, Boton } from './ui'

export default function PasoGenerar({ config, operacion, stowage, exportacion, fotos, fotosPortada, generando, onGenerar, generandoPdf, onGenerarPdf }) {
  const hayElectron = typeof window !== 'undefined' && window.electronAPI && window.electronAPI.esElectron
  const esWindows = hayElectron && window.electronAPI.plataforma === 'win32'
  const esExp = config.tipoOperacion === 'EXP'
  const sufijo = esExp ? 'EXP' : 'IMP'
  const nombre = `REPORTE_${config.puerto}_${config.consecutivo}-${config.anio}_MV_${(config.buque || 'BUQUE').replace(/\s+/g, '_')}__${config.viaje}_${config.puerto}_${sufijo}.docx`
  const pags = (() => {
    let p = esExp ? 3 : 3 // portada + operación + stowage/obs (o obs en EXP)
    if (esExp) p += 1 // página extra de partidas/existencia
    const fpc = {}
    for (const f of fotos) { if (!fpc[f.categoriaKey]) fpc[f.categoriaKey] = []; fpc[f.categoriaKey].push(f) }
    const bodegas = stowage.bodegas.map((_, i) => `bodega-${i + 1}`)
    const secciones = esExp
      ? ['seccion-AREA DE ALMACENAMIENTO', 'seccion-DOCUMENTOS']
      : ['seccion-DESCARGA DE BUQUE', 'seccion-AREA DE ALMACENAMIENTO', 'seccion-CARGA DE EQUIPO FFCC', 'seccion-DOCUMENTOS']

    if (esExp) {
      // En EXP, cada bodega (seccion-BODEGAS + bodegas numeradas) es su propia sección con título
      const bodegaCats = ['seccion-BODEGAS', ...bodegas]
      for (const cat of bodegaCats) {
        const g = fpc[cat] || []
        if (g.length === 0) continue
        p += Math.ceil(g.length / 2)
      }
      for (const cat of secciones) {
        const g = fpc[cat] || []
        if (g.length === 0) continue
        p += cat === 'seccion-DOCUMENTOS' ? g.length : Math.ceil(g.length / 2)
      }
    } else {
      for (const cat of [...bodegas, ...secciones]) {
        const g = fpc[cat] || []
        const bi = cat.startsWith('bodega-') ? parseInt(cat.replace('bodega-', '')) - 1 : -1
        const esEmpty = bi >= 0 && g.length === 0
        if (esEmpty) { p += 1; continue }
        if (g.length === 0) continue
        p += cat === 'seccion-DOCUMENTOS' ? g.length : Math.ceil(g.length / 2)
      }
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
            ['Tipo', esExp ? 'Exportación' : 'Importación'],
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
            {!esExp && <Chk ok={stowage.bodegas.some((b) => parsearTonelaje(b.tonelaje) > 0)} t="Stowage plan" />}
            <Chk ok={!!stowage.observaciones} t="Observaciones" />
            <Chk ok={fotos.length > 0} t={`${fotos.length} fotos de bodegas`} />
            {esExp && <Chk ok={exportacion && exportacion.partidas.some((p) => p.fechaArribo)} t="Partidas en patios" />}
          </div>
        </div>
        <Boton onClick={onGenerar} deshabilitado={generando || generandoPdf} icono={generando ? null : <Download size={18} />} className="!w-full !py-4 !text-base !rounded-xl">
          {generando ? 'Generando documento...' : 'Generar Reporte .docx'}
        </Boton>
        <div className="mt-3">
          <Boton
            onClick={onGenerarPdf}
            deshabilitado={generando || generandoPdf || !esWindows}
            variante="secundario"
            icono={generandoPdf ? null : <FileText size={18} />}
            className="!w-full !py-4 !text-base !rounded-xl"
          >
            {generandoPdf ? 'Generando PDF con Word...' : 'Generar Reporte .pdf'}
          </Boton>
          {!esWindows && (
            <p className="text-[11px] text-gray-400 text-center mt-2 font-lexend">
              {hayElectron
                ? 'La generación de PDF requiere Windows con Microsoft Word instalado.'
                : 'La generación de PDF solo está disponible en la app de escritorio.'}
            </p>
          )}
          {esWindows && (
            <p className="text-[11px] text-gray-400 text-center mt-2 font-lexend">
              El PDF se genera con Microsoft Word (fidelidad 100% al .docx). Puede tardar unos segundos.
            </p>
          )}
        </div>
      </Tarjeta>
      <Tarjeta titulo="Preview del Documento" subtitulo={`${pags} páginas estimadas`} icono={<Camera size={22} />}>
        {(() => {
          const paginas = []

          paginas.push({ tipo: 'portada', fotos: fotosPortada })
          paginas.push({ tipo: 'datos' })
          paginas.push({ tipo: esExp ? 'observaciones' : 'stowage' })
          if (esExp) paginas.push({ tipo: 'partidas' })

          const bodegasDelStowage = stowage.bodegas.map((_, idx) => `bodega-${idx + 1}`)
          const seccionesOrdenadas = esExp
            ? ['seccion-AREA DE ALMACENAMIENTO', 'seccion-DOCUMENTOS']
            : ['seccion-DESCARGA DE BUQUE', 'seccion-AREA DE ALMACENAMIENTO', 'seccion-CARGA DE EQUIPO FFCC', 'seccion-DOCUMENTOS']

          const fotosPorCat = {}
          for (const f of fotos) {
            if (!fotosPorCat[f.categoriaKey]) fotosPorCat[f.categoriaKey] = []
            fotosPorCat[f.categoriaKey].push(f)
          }

          if (esExp) {
            // En EXP cada bodega (seccion-BODEGAS + bodegas numeradas) es su propia sección con título
            const catsPreview = [
              { cat: 'seccion-BODEGAS', fotos: fotosPorCat['seccion-BODEGAS'] || [] },
              ...bodegasDelStowage.map((c) => ({ cat: c, fotos: fotosPorCat[c] || [] })),
              ...seccionesOrdenadas.map((c) => ({ cat: c, fotos: fotosPorCat[c] || [] })),
            ]

            for (const { cat, fotos: fotosGrupo } of catsPreview) {
              if (fotosGrupo.length === 0) continue
              const titulo = cat === 'seccion-BODEGAS'
                ? 'CARGA EN BODEGAS DE BUQUE'
                : cat.startsWith('bodega-')
                  ? `BODEGA No ${cat.replace('bodega-', '').padStart(2, '0')}`
                  : cat.replace('seccion-', '')
              const esDoc = cat === 'seccion-DOCUMENTOS'
              let i = 0, primera = true
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
          } else {
            const todasCats = [...bodegasDelStowage, ...seccionesOrdenadas]
            for (const cat of todasCats) {
              const fotosGrupo = fotosPorCat[cat] || []
              const bodegaIdx = cat.startsWith('bodega-') ? parseInt(cat.replace('bodega-', '')) - 1 : -1
              const esEmpty = bodegaIdx >= 0 && fotosGrupo.length === 0
              const titulo = cat.startsWith('bodega-')
                ? `BODEGA No ${cat.replace('bodega-', '').padStart(2, '0')}`
                : cat.replace('seccion-', '')
              const esDoc = cat === 'seccion-DOCUMENTOS'

              if (esEmpty) { paginas.push({ tipo: 'empty', titulo }); continue }
              if (fotosGrupo.length === 0) continue

              let i = 0, primera = true
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
          }

          const MiniPag = ({ num, children, destacar }) => (
            <div className={`border rounded-xl p-2 bg-white flex flex-col shadow-sm ${destacar ? 'border-accent/40 ring-1 ring-accent/20' : 'border-gray-200'}`} style={{ aspectRatio: '8.5/11' }}>
              <div className="h-1.5 bg-barra rounded-sm mb-1 shrink-0" />
              <div className="text-[7px] text-gray-400 text-center mb-1 shrink-0 font-lexend">Pág. {num}</div>
              <div className="flex-1 flex flex-col justify-center min-h-0 overflow-hidden">{children}</div>
            </div>
          )

          let seccionActual = null
          const elementos = []

          paginas.forEach((p, idx) => {
            const num = idx + 1
            let seccion = null
            if (p.tipo === 'portada' || p.tipo === 'datos' || p.tipo === 'stowage' || p.tipo === 'observaciones' || p.tipo === 'partidas') seccion = 'info'
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
            } else if (p.tipo === 'observaciones') {
              elementos.push({ tipo: 'pagina', contenido: (
                <MiniPag key={idx} num={num}>
                  <div className="text-[8px] font-bold text-navy text-center mb-2 font-lexend">BL + OBS</div>
                  <div className="space-y-1 px-2">
                    {[1,2].map(t => <div key={t} className="h-2 bg-gray-100 rounded-[2px]" />)}
                    <div className="h-0.5 bg-orange-400 my-1 rounded-full" />
                    <div className="h-6 bg-gray-50 rounded-[2px]" />
                  </div>
                </MiniPag>
              )})
            } else if (p.tipo === 'partidas') {
              elementos.push({ tipo: 'pagina', contenido: (
                <MiniPag key={idx} num={num} destacar>
                  <div className="text-[8px] font-bold text-accent text-center mb-2 font-lexend">PARTIDAS</div>
                  <div className="space-y-1 px-2">
                    <div className="h-0.5 bg-yellow-400 rounded-full" />
                    {[1,2].map(t => <div key={t} className="h-2 bg-gray-100 rounded-[2px]" />)}
                    <div className="h-3" />
                    <div className="h-0.5 bg-yellow-400 rounded-full" />
                    {[1].map(t => <div key={t} className="h-2 bg-gray-100 rounded-[2px]" />)}
                  </div>
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
