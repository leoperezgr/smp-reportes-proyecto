const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  esElectron: true,
  plataforma: process.platform,
  // Convierte un .docx (ArrayBuffer) a PDF usando Word COM en Windows.
  // Devuelve { ok: true, pdf: Uint8Array } o { ok: false, error: string }
  convertirDocxAPdf: (docxBuffer, nombreBase) =>
    ipcRenderer.invoke('convertir-docx-a-pdf', { docxBuffer, nombreBase }),
})
