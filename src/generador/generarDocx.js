// Entry point — delega al generador según el tipo de operación
import generarDocxImp from './generarDocxImp'
import generarDocxExp from './generarDocxExp'

export default async function generarDocx(params) {
  if (params.config.tipoOperacion === 'EXP') {
    return generarDocxExp(params)
  }
  return generarDocxImp(params)
}
