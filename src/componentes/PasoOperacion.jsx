import { Clock, List, FileText, Trash2, Plus, Package } from 'lucide-react'
import { MESES, blExpInicial } from '../constantes'
import { actualizarProfundo, formatearHora, formatearTonelaje, parsearTonelaje } from '../utilidades'

import { Tarjeta, Entrada, Boton } from './ui'

export default function PasoOperacion({ operacion, setOperacion, config }) {
  const act = (ruta, val) => setOperacion((p) => actualizarProfundo(p, ruta, val))
  const esExp = config.tipoOperacion === 'EXP'

  return (
    <div className="flex flex-col gap-6">
      <Tarjeta titulo="Fechas y Horarios" subtitulo="Eventos principales de la operación" icono={<Clock size={22} />}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-navy text-white">
                {['Evento', 'Mes', 'Día, Año', 'Hora'].map((h) => (
                  <th key={h} className={`px-3 py-2.5 font-lexend font-semibold ${h === 'Evento' ? 'text-left' : 'text-center'}`}>{h}</th>
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
                  <td className="px-2 py-1.5 text-center">
                    <select value={ev.mes} onChange={(e) => act(`eventos.${i}.mes`, e.target.value)} className="px-2 py-1.5 border border-gray-200 rounded-md text-xs bg-white text-center">
                      <option value="">—</option>
                      {MESES.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex gap-1.5 justify-center">
                      <input value={ev.dia} onChange={(e) => act(`eventos.${i}.dia`, e.target.value)} placeholder="16" className="w-10 px-2 py-1.5 border border-gray-200 rounded-md text-xs text-center" />
                      <input value={ev.anio} onChange={(e) => act(`eventos.${i}.anio`, e.target.value)} placeholder="2026" className="w-[52px] px-2 py-1.5 border border-gray-200 rounded-md text-xs text-center" />
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1 justify-center">
                      <input value={ev.hora} onChange={(e) => act(`eventos.${i}.hora`, e.target.value)} onBlur={() => act(`eventos.${i}.hora`, formatearHora(ev.hora))} placeholder="16:30" className="w-20 px-2 py-1.5 border border-gray-200 rounded-md text-xs text-center" />
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

      {!esExp && (
        <Tarjeta titulo="Cantidades Recibidas" icono={<List size={22} />}>
          <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100">
            <Entrada etiqueta="Puerto Origen" value={operacion.puertoOrigen} onChange={(e) => act('puertoOrigen', e.target.value.toUpperCase())} placeholder="IMMINGHAM" className="uppercase" />
            <Entrada etiqueta="País" value={operacion.paisOrigen} onChange={(e) => act('paisOrigen', e.target.value.toUpperCase())} placeholder="UK" className="uppercase" />
          </div>
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
      )}

      {esExp ? (
        <>
          {operacion.bls.map((bl, i) => {
            const totalPiezas = (bl.cantidades || []).reduce((s, c) => s + (parseInt(c.piezas) || 0), 0)
            const totalTonelaje = (bl.cantidades || []).reduce((s, c) => s + parsearTonelaje(c.tonelaje), 0)
            return (
              <Tarjeta key={i} titulo={`FORMAMOS ACERO BL ${String(i + 1).padStart(3, '0')}`} subtitulo={bl.puerto && bl.pais ? `(${bl.puerto}, ${bl.pais})` : ''} icono={<Package size={22} />}>
                <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-gray-100">
                  <Entrada etiqueta="Puerto" value={bl.puerto} onChange={(e) => act(`bls.${i}.puerto`, e.target.value.toUpperCase())} placeholder="MATARANI" />
                  <Entrada etiqueta="País" value={bl.pais || ''} onChange={(e) => act(`bls.${i}.pais`, e.target.value.toUpperCase())} placeholder="PERU" />
                  <Entrada etiqueta="Ciudad" value={bl.ciudad || ''} onChange={(e) => act(`bls.${i}.ciudad`, e.target.value.toUpperCase())} placeholder="PIURA" />
                </div>
                <p className="text-xs font-medium text-gray-400 font-lexend uppercase tracking-wider mb-2">Productos</p>
                {(bl.cantidades || []).map((c, j) => (
                  <div key={j} className="grid grid-cols-[2fr_1fr_80px_1fr_40px] gap-2.5 mb-2.5 items-end">
                    <Entrada etiqueta={j === 0 ? 'Descripción' : undefined} value={c.descripcion} onChange={(e) => act(`bls.${i}.cantidades.${j}.descripcion`, e.target.value)} placeholder="BARRA CORRUGADA..." />
                    <Entrada etiqueta={j === 0 ? 'Tipo' : undefined} value={c.tipo} onChange={(e) => act(`bls.${i}.cantidades.${j}.tipo`, e.target.value)} placeholder="BUNDLES" />
                    <Entrada etiqueta={j === 0 ? 'Piezas' : undefined} value={c.piezas} onChange={(e) => act(`bls.${i}.cantidades.${j}.piezas`, e.target.value)} placeholder="1" />
                    <Entrada etiqueta={j === 0 ? 'Tonelaje (MT)' : undefined} value={c.tonelaje} onChange={(e) => act(`bls.${i}.cantidades.${j}.tonelaje`, e.target.value)} onBlur={() => act(`bls.${i}.cantidades.${j}.tonelaje`, formatearTonelaje(c.tonelaje))} placeholder="778.000" />
                    <Boton variante="fantasma" className="!p-1.5 mb-0.5" onClick={() => setOperacion((p) => {
                      const nuevos = JSON.parse(JSON.stringify(p.bls))
                      nuevos[i].cantidades = nuevos[i].cantidades.filter((_, k) => k !== j)
                      return { ...p, bls: nuevos }
                    })}><Trash2 size={16} className="text-red-500" /></Boton>
                  </div>
                ))}
                <div className="flex items-center justify-between mt-2">
                  <Boton variante="secundario" icono={<Plus size={16} />} onClick={() => setOperacion((p) => {
                    const nuevos = JSON.parse(JSON.stringify(p.bls))
                    nuevos[i].cantidades = [...(nuevos[i].cantidades || []), { descripcion: '', tipo: 'BUNDLES', piezas: '1', tonelaje: '' }]
                    return { ...p, bls: nuevos }
                  })}>Agregar producto</Boton>
                  <div className="text-xs font-lexend text-gray-500">
                    Total: <strong className="text-navy">{totalPiezas.toLocaleString()} pzas</strong> / <strong className="text-accent">{formatearTonelaje(totalTonelaje)} MT</strong>
                  </div>
                </div>
              </Tarjeta>
            )
          })}
          <div className="flex gap-2">
            <Boton variante="secundario" icono={<Plus size={16} />} onClick={() => setOperacion((p) => ({ ...p, bls: [...p.bls, blExpInicial(p.bls.length + 1)] }))}>Agregar BL</Boton>
            {operacion.bls.length > 1 && <Boton variante="fantasma" onClick={() => setOperacion((p) => ({ ...p, bls: p.bls.slice(0, -1) }))}>Quitar último BL</Boton>}
          </div>

          <Tarjeta titulo="Gran Total (BL)" subtitulo="Resumen auto-calculado de todos los BLs" icono={<FileText size={22} />}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-navy text-white">
                    {['Número de BL', 'Puerto', 'Piezas', 'Tonelaje (MT)'].map((h) => (
                      <th key={h} className={`px-3 py-2.5 font-lexend font-semibold ${h === 'Número de BL' ? 'text-left' : 'text-center'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {operacion.bls.map((bl, i) => {
                    const totalPiezas = (bl.cantidades || []).reduce((s, c) => s + (parseInt(c.piezas) || 0), 0)
                    const totalTonelaje = formatearTonelaje((bl.cantidades || []).reduce((s, c) => s + parsearTonelaje(c.tonelaje), 0))
                    const puertoPais = bl.puerto && bl.pais ? `${bl.puerto}, ${bl.pais}` : bl.puerto || ''
                    return (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="px-3 py-2.5 font-semibold text-navy font-lexend text-xs">{`BL ${String(i + 1).padStart(3, '0')} FORMAMOS ACERO`}</td>
                        <td className="px-3 py-2.5 text-center text-xs">{puertoPais}</td>
                        <td className="px-3 py-2.5 text-center text-xs font-semibold">{totalPiezas.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-center text-xs font-semibold">{totalTonelaje}</td>
                      </tr>
                    )
                  })}
                  <tr className="bg-accent-light font-bold">
                    <td className="px-3 py-2.5 text-accent font-lexend">TOTALES</td>
                    <td />
                    <td className="px-3 py-2.5 text-accent font-lexend text-center">{operacion.bls.reduce((s, bl) => s + (bl.cantidades || []).reduce((s2, c) => s2 + (parseInt(c.piezas) || 0), 0), 0).toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-accent font-lexend text-center">{formatearTonelaje(operacion.bls.reduce((s, bl) => s + (bl.cantidades || []).reduce((s2, c) => s2 + parsearTonelaje(c.tonelaje), 0), 0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Tarjeta>
        </>
      ) : (
        <Tarjeta titulo="Bills of Lading (BL)" icono={<FileText size={22} />}>
          {operacion.bls.map((bl, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_80px_1fr_40px] gap-2.5 mb-2.5 items-end">
              <div className="flex flex-col gap-1">
                {i === 0 && <label className="text-xs font-medium text-gray-400 font-lexend uppercase tracking-wider">Número de BL</label>}
                <div className="px-3.5 py-2.5 bg-gray-100 border-[1.5px] border-gray-200 rounded-lg text-sm font-source text-navy font-semibold">{`BL-${String(i + 1).padStart(3, '0')}`}</div>
              </div>
              <Entrada etiqueta={i === 0 ? 'Puerto/Producto' : undefined} value={bl.puerto} onChange={(e) => act(`bls.${i}.puerto`, e.target.value)} placeholder="PIG IRON" />
              <Entrada etiqueta={i === 0 ? 'Piezas' : undefined} value={bl.piezas} onChange={(e) => act(`bls.${i}.piezas`, e.target.value)} placeholder="1" />
              <Entrada etiqueta={i === 0 ? 'Tonelaje (MT)' : undefined} value={bl.tonelaje} onChange={(e) => act(`bls.${i}.tonelaje`, e.target.value)} onBlur={() => act(`bls.${i}.tonelaje`, formatearTonelaje(bl.tonelaje))} placeholder="19,919.000" />
              <Boton variante="fantasma" className="!p-1.5 mb-0.5" onClick={() => setOperacion((p) => ({ ...p, bls: p.bls.filter((_, j) => j !== i) }))}><Trash2 size={16} className="text-red-500" /></Boton>
            </div>
          ))}
          <Boton variante="secundario" icono={<Plus size={16} />} onClick={() => setOperacion((p) => ({ ...p, bls: [...p.bls, { numero: `BL-${String(p.bls.length + 1).padStart(3, '0')}`, puerto: '', piezas: '1', tonelaje: '' }] }))}>Agregar BL</Boton>
        </Tarjeta>
      )}
    </div>
  )
}
