import {
  Ship, Plus, ChevronRight, Download, Trash2, Loader2, BarChart3, CheckCircle2,
} from 'lucide-react'
import { formatearFechaRelativa } from '../utilidades'
import { Boton } from './ui'

export default function PaginaInicio({ reportes, onNuevo, onAbrir, onEliminar, onDescargar, descargandoId }) {
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
        <div className="flex items-center gap-3 text-xs font-lexend">
          <span className="text-white/30">Naviera SMP, S.A. de C.V.</span>
          <span className="text-white/20">v1.3.4</span>
        </div>
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
