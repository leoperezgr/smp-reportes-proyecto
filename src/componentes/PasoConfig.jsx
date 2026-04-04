import { Ship, Settings } from 'lucide-react'
import { PUERTOS } from '../constantes'
import { Tarjeta, Entrada } from './ui'

export default function PasoConfig({ config, setConfig }) {
  const act = (c) => (e) => setConfig((p) => ({ ...p, [c]: c === 'buque' ? e.target.value.toUpperCase() : e.target.value }))
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
