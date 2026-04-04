import { useState } from 'react'
import { Table2, List, Plus } from 'lucide-react'
import { actualizarProfundo, parsearTonelaje, formatearTonelaje } from '../utilidades'
import { Tarjeta, Boton } from './ui'

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

export default function PasoStowage({ stowage, setStowage }) {
  const act = (ruta, val) => setStowage((p) => actualizarProfundo(p, ruta, val))
  const total = stowage.bodegas.reduce((s, b) => s + (parsearTonelaje(b.tonelaje)), 0)
  const productosUsados = [...new Set(stowage.bodegas.map((b) => b.producto.trim()).filter(Boolean))]

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
      <Tarjeta titulo="Observaciones" subtitulo="Descripción detallada de la operación" icono={<List size={22} />}>
        <textarea value={stowage.observaciones} onChange={(e) => setStowage((p) => ({ ...p, observaciones: e.target.value }))} placeholder="EL BUQUE ARRIBO EL DIA 13 DE ENERO DE 2026 A LAS 06:25 HRS..."
          className="w-full px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-lg text-sm font-source text-navy bg-white resize-y min-h-[200px] placeholder:text-gray-300" />
      </Tarjeta>
    </div>
  )
}
