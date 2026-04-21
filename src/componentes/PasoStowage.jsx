import { useState } from 'react'
import { Table2, List, Plus, Trash2, Calendar, BarChart3 } from 'lucide-react'
import { actualizarProfundo, parsearTonelaje, formatearTonelaje } from '../utilidades'
import { Tarjeta, Boton, Entrada } from './ui'

function InputProducto({ value, onChange, placeholder, sugerencias }) {
  const [abierto, setAbierto] = useState(false)
  const filtradas = abierto && value
    ? sugerencias.filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value)
    : []
  return (
    <div className="relative">
      <input value={value} onChange={onChange} onFocus={() => setAbierto(true)} onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder={placeholder} className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-xs" />
      {filtradas.length > 0 && (
        <ul className="absolute z-10 left-0 right-0 top-full mt-0.5 bg-white border border-gray-200 rounded-md shadow-lg max-h-32 overflow-y-auto">
          {filtradas.map((s) => (
            <li key={s} onMouseDown={() => { onChange({ target: { value: s } }); setAbierto(false) }}
              className="px-2 py-1.5 text-xs cursor-pointer hover:bg-accent-light text-navy">{s}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function calcularEstadia(fechaArribo, fechaCarga) {
  if (!fechaArribo || !fechaCarga) return ''
  const meses = { ENERO: 0, FEBRERO: 1, MARZO: 2, ABRIL: 3, MAYO: 4, JUNIO: 5, JULIO: 6, AGOSTO: 7, SEPTIEMBRE: 8, OCTUBRE: 9, NOVIEMBRE: 10, DICIEMBRE: 11 }
  const parsear = (f) => {
    const partes = f.toUpperCase().split('-')
    if (partes.length !== 3) return null
    const dia = parseInt(partes[0])
    const mes = meses[partes[1]]
    const anio = parseInt(partes[2])
    if (isNaN(dia) || mes === undefined || isNaN(anio)) return null
    return new Date(anio, mes, dia)
  }
  const d1 = parsear(fechaArribo)
  const d2 = parsear(fechaCarga)
  if (!d1 || !d2) return ''
  const diff = Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24))
  return `${diff} DIAS`
}

export default function PasoStowage({ stowage, setStowage, config, exportacion, setExportacion }) {
  const act = (ruta, val) => setStowage((p) => actualizarProfundo(p, ruta, val))
  const actExp = (ruta, val) => setExportacion((p) => actualizarProfundo(p, ruta, val))
  const total = stowage.bodegas.reduce((s, b) => s + (parsearTonelaje(b.tonelaje)), 0)
  const productosUsados = [...new Set(stowage.bodegas.map((b) => b.producto.trim()).filter(Boolean))]
  const esExp = config?.tipoOperacion === 'EXP'

  const ajustarBodegas = (num) => {
    const n = Math.max(1, Math.min(20, parseInt(num) || 1))
    setStowage((p) => {
      const actuales = p.bodegas
      if (n > actuales.length) {
        const nuevas = Array.from({ length: n - actuales.length }, (_, i) => ({
          numero: `No ${String(actuales.length + i + 1).padStart(2, '0')}`, producto: '', tonelaje: '0.000',
        }))
        return { ...p, bodegas: [...actuales, ...nuevas] }
      }
      return { ...p, bodegas: actuales.slice(0, n) }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {esExp ? (
        <Tarjeta titulo="Bodegas" subtitulo="Cantidad de bodegas para categorizar fotos" icono={<Table2 size={22} />}>
          <div className="flex items-center gap-4">
            <label className="text-xs font-medium text-gray-400 font-lexend uppercase tracking-wider">Número de bodegas</label>
            <input type="number" min="1" max="20" value={stowage.bodegas.length}
              onChange={(e) => ajustarBodegas(e.target.value)}
              className="w-20 px-3 py-2 border-[1.5px] border-gray-200 rounded-lg text-sm font-source text-navy text-center" />
          </div>
        </Tarjeta>
      ) : (
        <Tarjeta titulo="Stowage Plan" subtitulo="Distribución de carga por bodega" icono={<Table2 size={22} />}>
          <table className="w-full border-collapse text-[13px]">
            <thead><tr className="bg-navy text-white">
              {['Bodega', 'Producto', 'Tonelaje (MT)'].map((h) => <th key={h} className="px-3 py-2.5 text-left font-lexend font-semibold">{h}</th>)}
            </tr></thead>
            <tbody>
              {stowage.bodegas.map((b, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="px-3 py-2 font-semibold text-navy font-lexend text-xs">{b.numero}</td>
                  <td className="px-2 py-1.5"><InputProducto value={b.producto} onChange={(e) => act(`bodegas.${i}.producto`, e.target.value)} placeholder={i % 2 === 1 ? 'EMPTY' : 'PIG IRON IN BULK'} sugerencias={productosUsados} /></td>
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
      )}

      <Tarjeta titulo="Observaciones" subtitulo="Descripción detallada de la operación" icono={<List size={22} />}>
        <textarea value={stowage.observaciones} onChange={(e) => setStowage((p) => ({ ...p, observaciones: e.target.value }))} placeholder="EL BUQUE ARRIBO EL DIA 13 DE ENERO DE 2026 A LAS 06:25 HRS..."
          className="w-full px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-lg text-sm font-source text-navy bg-white resize-y min-h-[200px] text-justify placeholder:text-gray-300" />
      </Tarjeta>

      {esExp && exportacion && (
        <>
          <Tarjeta titulo="Tiempo de Partidas en Patios" subtitulo="Fechas de arribo y carga con estadía calculada" icono={<Calendar size={22} />}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-navy text-white">
                    {['', 'Fecha Arribo', 'Fecha de Carga', 'Estadía en Puerto'].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-center font-lexend font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {exportacion.partidas.map((p, i) => {
                    const estadia = calcularEstadia(p.fechaArribo, p.fechaCarga)
                    return (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="px-3 py-2 font-semibold text-navy font-lexend text-xs whitespace-nowrap">{p.etiqueta}</td>
                        <td className="px-2 py-1.5">
                          <input value={p.fechaArribo} onChange={(e) => actExp(`partidas.${i}.fechaArribo`, e.target.value.toUpperCase())}
                            placeholder="19-JULIO-2025" className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-xs text-center" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={p.fechaCarga} onChange={(e) => actExp(`partidas.${i}.fechaCarga`, e.target.value.toUpperCase())}
                            placeholder="15-SEPTIEMBRE-2025" className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-xs text-center" />
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <div className="px-3 py-1.5 bg-gray-50 rounded-md text-xs font-semibold text-navy">{estadia || '—'}</div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Tarjeta>

          <Tarjeta titulo="Existencia de Carga" subtitulo="Tonelaje en puerto antes del arribo" icono={<BarChart3 size={22} />}>
            {exportacion.existencias.map((ex, i) => (
              <div key={i} className="grid grid-cols-[1fr_1.5fr_80px_40px] gap-2.5 mb-2.5 items-end">
                <Entrada etiqueta={i === 0 ? 'Día' : undefined} value={ex.dia} onChange={(e) => actExp(`existencias.${i}.dia`, e.target.value.toUpperCase())} placeholder="15-SEPTIEMBRE-2025" />
                <Entrada etiqueta={i === 0 ? 'Tonelaje en Puerto' : undefined} value={ex.tonelaje} onChange={(e) => actExp(`existencias.${i}.tonelaje`, e.target.value)} placeholder="7,130 MT GUATEMALA" />
                <Entrada etiqueta={i === 0 ? '% Buque' : undefined} value={ex.porcentaje} onChange={(e) => actExp(`existencias.${i}.porcentaje`, e.target.value)} placeholder="100 %" />
                <Boton variante="fantasma" className="!p-1.5 mb-0.5" onClick={() => setExportacion((p) => ({ ...p, existencias: p.existencias.filter((_, j) => j !== i) }))}><Trash2 size={16} className="text-red-500" /></Boton>
              </div>
            ))}
            <Boton variante="secundario" icono={<Plus size={16} />} onClick={() => setExportacion((p) => ({ ...p, existencias: [...p.existencias, { dia: '', tonelaje: '', porcentaje: '' }] }))}>Agregar fila</Boton>
          </Tarjeta>
        </>
      )}
    </div>
  )
}
