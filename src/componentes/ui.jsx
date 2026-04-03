export function Tarjeta({ titulo, subtitulo, icono, children }) {
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

export function Entrada({ etiqueta, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {etiqueta && <label className="text-xs font-medium text-gray-400 font-lexend uppercase tracking-wider">{etiqueta}</label>}
      <input {...props} className={`px-3.5 py-2.5 border-[1.5px] border-gray-200 rounded-lg text-sm font-source text-navy bg-white placeholder:text-gray-300 ${className}`} />
    </div>
  )
}

export function Boton({ children, variante = 'primario', icono, className = '', deshabilitado, ...props }) {
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
