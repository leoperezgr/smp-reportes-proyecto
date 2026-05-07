const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { spawn } = require('child_process')

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
}

let mainWindow = null

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'SMP Reportes',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  // En desarrollo carga el servidor de Vite, en producción carga el build
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  win.setMenuBarVisibility(false)

  // Menú contextual con clic derecho (Cortar / Copiar / Pegar / Seleccionar todo)
  win.webContents.on('context-menu', (_ev, params) => {
    const { isEditable, editFlags, selectionText } = params
    const tieneSeleccion = selectionText && selectionText.trim().length > 0
    const plantilla = []

    if (isEditable) {
      plantilla.push(
        { label: 'Cortar', role: 'cut', enabled: editFlags.canCut && tieneSeleccion },
        { label: 'Copiar', role: 'copy', enabled: editFlags.canCopy && tieneSeleccion },
        { label: 'Pegar', role: 'paste', enabled: editFlags.canPaste },
        { type: 'separator' },
        { label: 'Seleccionar todo', role: 'selectAll', enabled: editFlags.canSelectAll }
      )
    } else if (tieneSeleccion) {
      plantilla.push(
        { label: 'Copiar', role: 'copy', enabled: editFlags.canCopy }
      )
    }

    if (plantilla.length > 0) {
      Menu.buildFromTemplate(plantilla).popup({ window: win })
    }
  })

  return win
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.whenReady().then(() => {
  mainWindow = createWindow()
  autoUpdater.checkForUpdatesAndNotify()
})

// ─── IPC: Convertir .docx a PDF usando Word COM (Windows) ───
ipcMain.handle('convertir-docx-a-pdf', async (_event, { docxBuffer, nombreBase }) => {
  if (process.platform !== 'win32') {
    return { ok: false, error: 'La conversión a PDF solo está disponible en Windows (requiere Microsoft Word).' }
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smp-pdf-'))
  const safe = (nombreBase || 'reporte').replace(/[^\w.-]/g, '_')
  const docxPath = path.join(tmpDir, `${safe}.docx`)
  const pdfPath = path.join(tmpDir, `${safe}.pdf`)

  try {
    fs.writeFileSync(docxPath, Buffer.from(docxBuffer))

    // Script PowerShell: abre el .docx con Word COM y exporta a PDF.
    // Usa ExportAsFixedFormat con OptimizeFor=1 (wdExportOptimizeForOnScreen) para reducir el tamaño
    // (Word remuestrea imágenes y aplica compresión adicional). Si falla, hace fallback a SaveAs.
    const docxArg = docxPath.replace(/\\/g, '\\\\')
    const pdfArg = pdfPath.replace(/\\/g, '\\\\')
    const ps = [
      '$ErrorActionPreference = "Stop"',
      'try {',
      '  $word = New-Object -ComObject Word.Application',
      '  $word.Visible = $false',
      '  $word.DisplayAlerts = 0',
      `  $doc = $word.Documents.Open("${docxArg}", $false, $true)`,
      '  try {',
      // ExportAsFixedFormat: OutputFileName, ExportFormat=17 (PDF), OpenAfterExport=$false,
      // OptimizeFor=1 (OnScreen, archivos más pequeños), Range=0 (AllDocument), From=1, To=1,
      // Item=0 (DocumentContent), IncludeDocProps=$false, KeepIRM=$true, CreateBookmarks=0,
      // DocStructureTags=$false, BitmapMissingFonts=$true, UseISO19005_1=$false
      `    $doc.ExportAsFixedFormat("${pdfArg}", 17, $false, 1, 0, 1, 1, 0, $false, $true, 0, $false, $true, $false)`,
      '  } catch {',
      `    $doc.SaveAs([ref] "${pdfArg}", [ref] 17)`,
      '  }',
      '  $doc.Close($false)',
      '  $word.Quit()',
      '  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($doc) | Out-Null',
      '  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null',
      '  exit 0',
      '} catch {',
      '  Write-Error $_.Exception.Message',
      '  try { if ($word) { $word.Quit() } } catch {}',
      '  exit 1',
      '}',
    ].join('\n')

    await new Promise((resolve, reject) => {
      const proc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { windowsHide: true })
      let stderr = ''
      proc.stderr.on('data', (d) => { stderr += d.toString() })
      proc.on('error', reject)
      proc.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(stderr.trim() || `PowerShell salió con código ${code}`))
      })
    })

    if (!fs.existsSync(pdfPath)) {
      throw new Error('Word no generó el archivo PDF.')
    }

    const pdfBytes = fs.readFileSync(pdfPath)
    return { ok: true, pdf: pdfBytes, nombre: `${safe}.pdf` }
  } catch (err) {
    return { ok: false, error: err.message || String(err) }
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}
  }
})

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Actualización disponible',
    message: 'Se descargó una nueva versión. La app se reiniciará para actualizar.',
    buttons: ['Reiniciar ahora'],
  }).then(() => {
    autoUpdater.quitAndInstall()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
