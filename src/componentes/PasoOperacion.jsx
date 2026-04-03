import { Clock, List, FileText, Trash2, Plus } from 'lucide-react'
import { MESES } from '../constantes'
import { actualizarProfundo, formatearHora, formatearTonelaje } from '../utilidades'
import { Tarjeta, Entrada, Boton } from './ui'

export default function PasoOperacion({ operacion, setOperacion }) {
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
