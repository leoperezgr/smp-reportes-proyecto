import { parsearTonelaje } from './utilidades'

export const validarPaso = (indicePaso, { config, operacion, stowage, fotos, fotosPortada }) => {
  const faltantes = []
  switch (indicePaso) {
    case 0:
      if (!config.buque.trim()) faltantes.push('Nombre del buque')
      break
    case 1: {
      const tieneEvento = operacion.eventos.some((e) => e.mes && e.dia && e.hora)
      if (!tieneEvento) faltantes.push('Al menos 1 evento con fecha')
      if (!operacion.cargaTotal || parsearTonelaje(operacion.cargaTotal) === 0) faltantes.push('Carga total')
      break
    }
    case 2: {
      const tieneBodega = stowage.bodegas.some((b) => b.producto.trim() && parsearTonelaje(b.tonelaje) > 0)
      if (!tieneBodega) faltantes.push('Al menos 1 bodega con producto y tonelaje')
      break
    }
    case 3:
      if (fotosPortada.length < 2) faltantes.push(`Fotos de portada (${fotosPortada.length}/2)`)
      if (fotos.length < 1) faltantes.push('Al menos 1 foto de bodega')
      break
    default:
      break
  }
  return { completo: faltantes.length === 0, faltantes }
}
