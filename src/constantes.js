import { Settings, Clock, Table2, Camera, Download } from 'lucide-react'

export const NAVY = '#0C1D2E'
export const ACCENT = '#EA580C'

export const PUERTOS = [
  { codigo: 'VER', nombre: 'Veracruz' },
  { codigo: 'ALT', nombre: 'Altamira' },
  { codigo: 'LZC', nombre: 'Lázaro Cárdenas' },
  { codigo: 'MZT', nombre: 'Mazatlán' },
  { codigo: 'MNZ', nombre: 'Manzanillo' },
  { codigo: 'HOU', nombre: 'Houston' },
  { codigo: 'NOL', nombre: 'New Orleans' },
]

export const EVENTOS = [
  'ARRIBO',
  'NOR TENDERED',
  'ATRAQUE',
  'INICIO OPERACIONES',
  'TERMINO OPERACIONES',
]

export const MESES = [
  'ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
  'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE',
]

export const SECCIONES_EXTRA = [
  'DESCARGA DE BUQUE',
  'AREA DE ALMACENAMIENTO',
  'DOCUMENTOS',
]

export const PASOS = [
  { clave: 'config', etiqueta: 'Configuración', corta: 'Config', icono: Settings },
  { clave: 'operacion', etiqueta: 'Datos de Operación', corta: 'Operación', icono: Clock },
  { clave: 'stowage', etiqueta: 'Stowage Plan', corta: 'Stowage', icono: Table2 },
  { clave: 'fotos', etiqueta: 'Fotos de Bodegas', corta: 'Fotos', icono: Camera },
  { clave: 'generar', etiqueta: 'Generar Reporte', corta: 'Generar', icono: Download },
]

// Medidas exactas del documento original (DXA: 1440 = 1 pulgada)
export const DOC = {
  anchoHoja: 12240,
  altoHoja: 15840,
  margenTop: 1417,
  margenBottom: 1417,
  margenLeft: 1701,
  margenRight: 1701,
  header: 708,
  footer: 708,
  anchoContenido: 8838,
  anchoImagenEMU: 5612130,
}

// Anchos de tablas del documento original
export const TABLA_EVENTOS = { cols: [4416, 4412], total: 8828 }
export const TABLA_CANTIDADES = { cols: [4600, 1035, 978, 2215], total: 8828 }
export const TABLA_BL = { cols: [2802, 2976, 993, 2348], total: 9119 }
export const TABLA_STOWAGE = { cols: [1701, 2976, 2348], total: 7025 }

// Datos fijos de DEACERO
export const CLIENTE = {
  nombre: 'DEACERO SAPI DE CV',
  rfc: 'DEA7103086X2',
  direccion: 'Av. Lázaro Cárdenas 2333, Col. Valle Oriente, San Pedro Garza Garcia, Nuevo Leon. CP 66269',
  telefono: '01 800 021 33 22',
}

// Valores iniciales de estado
export const configInicial = () => ({
  puerto: 'VER', consecutivo: '001', anio: String(new Date().getFullYear()),
  buque: '', viaje: 'V01',
})

export const operacionInicial = () => ({
  arriboA: '',
  eventos: EVENTOS.map((n) => ({ nombre: n, mes: '', dia: '', anio: String(new Date().getFullYear()), hora: '' })),
  cargaTotal: '',
  cantidades: [{ descripcion: '', tipo: 'LOTE', piezas: '1', tonelaje: '' }],
  bls: [{ numero: 'BL-001', puerto: '', piezas: '1', tonelaje: '' }],
})

export const stowageInicial = () => ({
  bodegas: Array.from({ length: 5 }, (_, i) => ({
    numero: `No ${String(i + 1).padStart(2, '0')}`, producto: '', tonelaje: '0.000',
  })),
  observaciones: '',
})
