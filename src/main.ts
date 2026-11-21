// Copyright (C) 2026 Francisco Peña Gallardo (Reox Lab)
//
// This file is part of TableX.
//
// TableX is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// TableX is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with TableX. If not, see <https://www.gnu.org/licenses/>.

// TableX — punto de entrada: arma la interfaz (barra de herramientas,
// cuadrícula, opciones y panel de código) y la conecta con el modelo y los
// exportadores. El código generado se actualiza en vivo con cada cambio.

import './style.css'
import { emptyTable } from './model'
import { GridEditor } from './editor'
import { toLatex, type LatexOptions } from './exporters/latex'
import { toMarkdown } from './exporters/markdown'
import { toTypst } from './exporters/typst'
import { importXlsx } from './importers/xlsx'
import { parseLatex } from './importers/latex'

type Format = 'latex' | 'booktabs' | 'markdown' | 'typst'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('Falta #app en index.html')

app.innerHTML = `
  <header class="tx-header">
    <div class="tx-header-inner">
      <a class="tx-brand" href="https://reoxlab.com">← Reox Lab</a>
      <h1>TableX</h1>
      <p class="tx-tagline">Generador gráfico de tablas para LaTeX, Markdown y Typst</p>
    </div>
  </header>
  <main class="tx-main">
    <section class="tx-panel" aria-label="Editor de tabla">
      <h2 class="tx-panel-title">Tu tabla</h2>
      <div class="tx-toolbar">
        <button class="tx-btn" id="btn-row-above" type="button">+ Fila ↑</button>
        <button class="tx-btn" id="btn-row-below" type="button">+ Fila ↓</button>
        <button class="tx-btn" id="btn-row-del" type="button">− Fila</button>
        <button class="tx-btn" id="btn-col-left" type="button">+ Col ←</button>
        <button class="tx-btn" id="btn-col-right" type="button">+ Col →</button>
        <button class="tx-btn" id="btn-col-del" type="button">− Col</button>
        <button class="tx-btn" id="btn-clear" type="button">Limpiar</button>
        <span class="tx-size" id="size-badge">3 × 3</span>
      </div>
      <div class="tx-toolbar tx-toolbar--format">
        <button class="tx-btn tx-btn--fmt" id="btn-bold" type="button" title="Negrita"><strong>B</strong></button>
        <button class="tx-btn tx-btn--fmt" id="btn-italic" type="button" title="Cursiva"><em>I</em></button>
        <button class="tx-btn tx-btn--fmt" id="btn-align-left" type="button" title="Alinear a la izquierda">⇤</button>
        <button class="tx-btn tx-btn--fmt" id="btn-align-center" type="button" title="Centrar">⇔</button>
        <button class="tx-btn tx-btn--fmt" id="btn-align-right" type="button" title="Alinear a la derecha">⇥</button>
        <button class="tx-btn" id="btn-merge" type="button">Fusionar</button>
        <button class="tx-btn" id="btn-unmerge" type="button">Separar</button>
        <button class="tx-btn" id="btn-import-xlsx" type="button">Importar XLSX</button>
        <input type="file" id="file-xlsx" accept=".xlsx,.xls" hidden />
        <button class="tx-btn" id="btn-import-latex" type="button">Importar LaTeX</button>
        <span class="tx-size" id="import-msg"></span>
      </div>
      <div class="tx-toolbar tx-toolbar--format">
        <button class="tx-btn" id="btn-borders-all" type="button">Todos los bordes</button>
        <button class="tx-btn" id="btn-borders-none" type="button">Sin bordes</button>
        <button class="tx-btn tx-btn--fmt" id="btn-border-top" type="button" title="Borde superior">↑</button>
        <button class="tx-btn tx-btn--fmt" id="btn-border-bottom" type="button" title="Borde inferior">↓</button>
        <button class="tx-btn tx-btn--fmt" id="btn-border-left" type="button" title="Borde izquierdo">←</button>
        <button class="tx-btn tx-btn--fmt" id="btn-border-right" type="button" title="Borde derecho">→</button>
        <label class="tx-color-label">Fondo <input type="color" id="opt-bg" value="#fff3d6" /></label>
        <button class="tx-btn" id="btn-bg-clear" type="button">Quitar fondo</button>
        <label class="tx-color-label">Ancho col. <input type="number" id="opt-colwidth" min="40" max="600" step="10" placeholder="auto" /> px</label>
        <button class="tx-btn" id="btn-colwidth-auto" type="button">Auto</button>
      </div>
      <div class="tx-grid-wrap"><div id="grid"></div></div>
      <details class="tx-import-latex" id="import-latex-panel">
        <summary>Importar código LaTeX</summary>
        <p class="tx-hint">Pega el código de un <code>tabular</code>, <code>tabularx</code> o
        <code>longtable</code> (con o sin entorno <code>table</code>) y se carga en la
        cuadrícula: texto, formato, fusiones, bordes, anchos y colores.</p>
        <textarea id="latex-input" rows="6" spellcheck="false"
          placeholder="\\begin{tabular}{lll}&#10;A &amp; B &amp; C \\\\&#10;\\end{tabular}"></textarea>
        <div class="tx-actions">
          <button class="tx-btn tx-btn--primary" id="btn-import-latex-go" type="button">Importar</button>
          <span class="tx-size" id="import-latex-msg"></span>
        </div>
      </details>
      <p class="tx-hint">Haz clic en una celda y escribe. <kbd>Tab</kbd> pasa a la siguiente,
      <kbd>Enter</kbd> baja una fila y las flechas se mueven entre celdas.
      <kbd>Shift</kbd> + clic selecciona un rango.</p>
    </section>
    <section class="tx-panel" aria-label="Código generado">
      <h2 class="tx-panel-title">Código generado</h2>
      <div class="tx-tabs" role="tablist">
        <button class="tx-tab tx-tab--active" id="tab-latex" type="button">LaTeX</button>
        <button class="tx-tab" id="tab-booktabs" type="button">LaTeX booktabs</button>
        <button class="tx-tab" id="tab-markdown" type="button">Markdown</button>
        <button class="tx-tab" id="tab-typst" type="button">Typst</button>
      </div>
      <div class="tx-options">
        <label>Título <input type="text" id="opt-caption" placeholder="Título de la tabla" /></label>
        <label>Etiqueta <input type="text" id="opt-label" placeholder="tab:mi-tabla" /></label>
        <label><input type="checkbox" id="opt-centered" checked /> Centrada</label>
        <label><input type="checkbox" id="opt-header" checked /> Primera fila: encabezado</label>
        <label><input type="checkbox" id="opt-escape" checked /> Escapar caracteres</label>
        <label><input type="checkbox" id="opt-tabularx" /> Ajustar al ancho (tabularx)</label>
      </div>
      <pre class="tx-code"><code id="code"></code></pre>
      <div class="tx-actions">
        <button class="tx-btn tx-btn--primary" id="btn-copy" type="button">Copiar código</button>
        <button class="tx-btn" id="btn-download" type="button">Descargar</button>
        <span class="tx-copied" id="copied-msg" hidden>¡Copiado!</span>
      </div>
    </section>
  </main>
  <footer class="tx-footer">
    TableX es software libre (GPL v3): puedes usarlo, estudiarlo, modificarlo y
    compartirlo. Código en
    <a href="https://github.com/reoxlab/tablex">github.com/reoxlab/tablex</a>.
    Tus datos no salen de tu navegador: la tabla se genera aquí mismo, sin servidor.
  </footer>
`

const table = emptyTable(3, 3)
let format: Format = 'latex'

const gridHost = document.querySelector<HTMLDivElement>('#grid')!
const codeEl = document.querySelector<HTMLElement>('#code')!
const sizeBadge = document.querySelector<HTMLSpanElement>('#size-badge')!
const captionInput = document.querySelector<HTMLInputElement>('#opt-caption')!
const labelInput = document.querySelector<HTMLInputElement>('#opt-label')!
const centeredInput = document.querySelector<HTMLInputElement>('#opt-centered')!
const headerInput = document.querySelector<HTMLInputElement>('#opt-header')!
const escapeInput = document.querySelector<HTMLInputElement>('#opt-escape')!
const tabularxInput = document.querySelector<HTMLInputElement>('#opt-tabularx')!
const bgInput = document.querySelector<HTMLInputElement>('#opt-bg')!
const colwidthInput = document.querySelector<HTMLInputElement>('#opt-colwidth')!
const copiedMsg = document.querySelector<HTMLSpanElement>('#copied-msg')!

function latexOptions(): LatexOptions {
  return {
    style: format === 'booktabs' ? 'booktabs' : 'standard',
    caption: captionInput.value,
    label: labelInput.value,
    centered: centeredInput.checked,
    headerRow: headerInput.checked,
    escape: escapeInput.checked,
    tabularx: tabularxInput.checked,
  }
}

function generate(): string {
  if (format === 'markdown') {
    return toMarkdown(table, { escape: escapeInput.checked })
  }
  if (format === 'typst') {
    return toTypst(table, {
      caption: captionInput.value,
      label: labelInput.value,
      headerRow: headerInput.checked,
      escape: escapeInput.checked,
    })
  }
  return toLatex(table, latexOptions())
}

function updateCode(): void {
  codeEl.textContent = generate()
}

function updateSize(): void {
  const { rows, cols } = editor.size
  sizeBadge.textContent = `${rows} × ${cols}`
  const delRow = document.querySelector<HTMLButtonElement>('#btn-row-del')!
  const delCol = document.querySelector<HTMLButtonElement>('#btn-col-del')!
  delRow.disabled = rows <= 1
  delCol.disabled = cols <= 1
}

function updateLatexOptionsEnabled(): void {
  // Título y etiqueta valen en LaTeX y en Typst (figure); centrado y
  // tabularx solo en LaTeX; encabezado en LaTeX y Typst. Markdown no usa
  // ninguna.
  const isMarkdown = format === 'markdown'
  const isLatex = format === 'latex' || format === 'booktabs'
  captionInput.disabled = isMarkdown
  labelInput.disabled = isMarkdown
  centeredInput.disabled = !isLatex
  headerInput.disabled = isMarkdown
  tabularxInput.disabled = !isLatex
}

const editor = new GridEditor(gridHost, table, {
  onTextChange: updateCode,
  onStructureChange: () => {
    updateCode()
    updateSize()
    updateFormatButtons()
  },
  onSelectionChange: updateFormatButtons,
})

function updateFormatButtons(): void {
  const fmt = editor.selectedCellFormat()
  document
    .querySelector<HTMLButtonElement>('#btn-bold')!
    .classList.toggle('tx-btn--active', fmt.bold)
  document
    .querySelector<HTMLButtonElement>('#btn-italic')!
    .classList.toggle('tx-btn--active', fmt.italic)
  document
    .querySelector<HTMLButtonElement>('#btn-align-left')!
    .classList.toggle('tx-btn--active', fmt.align === 'left')
  document
    .querySelector<HTMLButtonElement>('#btn-align-center')!
    .classList.toggle('tx-btn--active', fmt.align === 'center')
  document
    .querySelector<HTMLButtonElement>('#btn-align-right')!
    .classList.toggle('tx-btn--active', fmt.align === 'right')
  bgInput.value = fmt.background ?? '#fff3d6'
  const width = editor.selectedColWidth()
  colwidthInput.value = width === null ? '' : String(width)
}

function setFormat(next: Format): void {
  format = next
  for (const [id, f] of [
    ['tab-latex', 'latex'],
    ['tab-booktabs', 'booktabs'],
    ['tab-markdown', 'markdown'],
    ['tab-typst', 'typst'],
  ] as const) {
    document
      .querySelector<HTMLButtonElement>(`#${id}`)!
      .classList.toggle('tx-tab--active', f === next)
  }
  const downloadBtn = document.querySelector<HTMLButtonElement>('#btn-download')!
  downloadBtn.textContent =
    next === 'markdown'
      ? 'Descargar .md'
      : next === 'typst'
        ? 'Descargar .typ'
        : 'Descargar .tex'
  updateLatexOptionsEnabled()
  updateCode()
}

document
  .querySelector<HTMLButtonElement>('#tab-latex')!
  .addEventListener('click', () => setFormat('latex'))
document
  .querySelector<HTMLButtonElement>('#tab-booktabs')!
  .addEventListener('click', () => setFormat('booktabs'))
document
  .querySelector<HTMLButtonElement>('#tab-markdown')!
  .addEventListener('click', () => setFormat('markdown'))
document
  .querySelector<HTMLButtonElement>('#tab-typst')!
  .addEventListener('click', () => setFormat('typst'))

document
  .querySelector<HTMLButtonElement>('#btn-row-above')!
  .addEventListener('click', () => editor.addRowAbove())
document
  .querySelector<HTMLButtonElement>('#btn-row-below')!
  .addEventListener('click', () => editor.addRowBelow())
document
  .querySelector<HTMLButtonElement>('#btn-row-del')!
  .addEventListener('click', () => editor.deleteRow())
document
  .querySelector<HTMLButtonElement>('#btn-col-left')!
  .addEventListener('click', () => editor.addColLeft())
document
  .querySelector<HTMLButtonElement>('#btn-col-right')!
  .addEventListener('click', () => editor.addColRight())
document
  .querySelector<HTMLButtonElement>('#btn-col-del')!
  .addEventListener('click', () => editor.deleteCol())
document
  .querySelector<HTMLButtonElement>('#btn-clear')!
  .addEventListener('click', () => editor.clear())

// -- formato y fusiones (v0.2) ----------------------------------------------

document
  .querySelector<HTMLButtonElement>('#btn-bold')!
  .addEventListener('click', () => {
    const fmt = editor.selectedCellFormat()
    editor.applyFormat({ bold: !fmt.bold })
  })
document
  .querySelector<HTMLButtonElement>('#btn-italic')!
  .addEventListener('click', () => {
    const fmt = editor.selectedCellFormat()
    editor.applyFormat({ italic: !fmt.italic })
  })
document
  .querySelector<HTMLButtonElement>('#btn-align-left')!
  .addEventListener('click', () => editor.applyFormat({ align: 'left' }))
document
  .querySelector<HTMLButtonElement>('#btn-align-center')!
  .addEventListener('click', () => editor.applyFormat({ align: 'center' }))
document
  .querySelector<HTMLButtonElement>('#btn-align-right')!
  .addEventListener('click', () => editor.applyFormat({ align: 'right' }))

const importMsg = document.querySelector<HTMLSpanElement>('#import-msg')!
document
  .querySelector<HTMLButtonElement>('#btn-merge')!
  .addEventListener('click', () => {
    if (!editor.mergeSelection()) {
      importMsg.textContent = 'No se puede fusionar esa selección.'
      window.setTimeout(() => {
        importMsg.textContent = ''
      }, 2500)
    }
  })
document
  .querySelector<HTMLButtonElement>('#btn-unmerge')!
  .addEventListener('click', () => {
    if (!editor.unmergeSelection()) {
      importMsg.textContent = 'La celda activa no está fusionada.'
      window.setTimeout(() => {
        importMsg.textContent = ''
      }, 2500)
    }
  })

// -- importar XLSX ------------------------------------------------------------

const fileInput = document.querySelector<HTMLInputElement>('#file-xlsx')!
document
  .querySelector<HTMLButtonElement>('#btn-import-xlsx')!
  .addEventListener('click', () => fileInput.click())
fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0]
  if (!file) return
  importMsg.textContent = 'Importando…'
  importXlsx(file)
    .then((imported) => {
      editor.setTable(imported)
      importMsg.textContent = `Importado: ${file.name}`
      track('table-import-xlsx')
    })
    .catch((err: unknown) => {
      importMsg.textContent =
        err instanceof Error ? err.message : 'No se pudo importar el archivo.'
    })
    .finally(() => {
      fileInput.value = ''
      window.setTimeout(() => {
        importMsg.textContent = ''
      }, 4000)
    })
})

// -- importar LaTeX -----------------------------------------------------------

const latexPanel = document.querySelector<HTMLDetailsElement>('#import-latex-panel')!
const latexInput = document.querySelector<HTMLTextAreaElement>('#latex-input')!
const latexMsg = document.querySelector<HTMLSpanElement>('#import-latex-msg')!
document
  .querySelector<HTMLButtonElement>('#btn-import-latex')!
  .addEventListener('click', () => {
    latexPanel.open = !latexPanel.open
    if (latexPanel.open) latexInput.focus()
  })
document
  .querySelector<HTMLButtonElement>('#btn-import-latex-go')!
  .addEventListener('click', () => {
    const code = latexInput.value
    if (code.trim() === '') {
      latexMsg.textContent = 'Pega primero el código LaTeX.'
      return
    }
    try {
      const parsed = parseLatex(code)
      editor.setTable(parsed.table)
      setFormat(parsed.style === 'booktabs' ? 'booktabs' : 'latex')
      captionInput.value = parsed.caption
      labelInput.value = parsed.label
      tabularxInput.checked = parsed.tabularx
      headerInput.checked = parsed.headerRow
      updateCode()
      updateSize()
      const notes = [
        `Importado: ${parsed.table.rows} × ${parsed.table.cols}.`,
        ...(parsed.longtable
          ? ['Es una tabla larga: de momento se edita como tabla normal.']
          : []),
        ...parsed.warnings,
      ]
      latexMsg.textContent = notes.join(' ')
      track('table-import-latex')
    } catch (err: unknown) {
      latexMsg.textContent =
        err instanceof Error ? err.message : 'No se pudo importar el código.'
    }
  })

for (const input of [captionInput, labelInput]) {
  input.addEventListener('input', updateCode)
}
for (const input of [centeredInput, headerInput, escapeInput, tabularxInput]) {
  input.addEventListener('change', updateCode)
}

// -- bordes, fondo y anchos (v0.2 parte 2) ------------------------------------

document
  .querySelector<HTMLButtonElement>('#btn-borders-all')!
  .addEventListener('click', () => editor.allBorders())
document
  .querySelector<HTMLButtonElement>('#btn-borders-none')!
  .addEventListener('click', () => editor.noBorders())

function toggleBorder(side: 'top' | 'right' | 'bottom' | 'left'): void {
  // El botón invierte el estado de la celda activa en ese lado.
  const cell = table.cells[editor.selection.row]?.[editor.selection.col]
  const current = cell?.borders[side] ?? false
  editor.applyBorders({ [side]: !current })
}

document
  .querySelector<HTMLButtonElement>('#btn-border-top')!
  .addEventListener('click', () => toggleBorder('top'))
document
  .querySelector<HTMLButtonElement>('#btn-border-bottom')!
  .addEventListener('click', () => toggleBorder('bottom'))
document
  .querySelector<HTMLButtonElement>('#btn-border-left')!
  .addEventListener('click', () => toggleBorder('left'))
document
  .querySelector<HTMLButtonElement>('#btn-border-right')!
  .addEventListener('click', () => toggleBorder('right'))

bgInput.addEventListener('input', () => editor.applyBackground(bgInput.value))
document
  .querySelector<HTMLButtonElement>('#btn-bg-clear')!
  .addEventListener('click', () => editor.applyBackground(null))

colwidthInput.addEventListener('change', () => {
  const value = colwidthInput.value.trim()
  const width = value === '' ? null : Number.parseInt(value, 10)
  editor.setSelectedColWidth(Number.isFinite(width) ? width : null)
})
document
  .querySelector<HTMLButtonElement>('#btn-colwidth-auto')!
  .addEventListener('click', () => editor.setSelectedColWidth(null))

function track(eventName: string): void {
  const umami = (window as unknown as { umami?: { track: (n: string, d?: Record<string, string>) => void } }).umami
  try {
    umami?.track(eventName, { format })
  } catch {
    // Umami no está disponible (aún sin regla del túnel): no pasa nada.
  }
}

async function copyCode(): Promise<void> {
  const code = generate()
  try {
    await navigator.clipboard.writeText(code)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = code
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
  copiedMsg.hidden = false
  window.setTimeout(() => {
    copiedMsg.hidden = true
  }, 1800)
  track('table-copy')
}

function downloadCode(): void {
  const code = generate()
  const ext = format === 'markdown' ? 'md' : format === 'typst' ? 'typ' : 'tex'
  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tabla.${ext}`
  a.click()
  URL.revokeObjectURL(url)
  track('table-download')
}

document
  .querySelector<HTMLButtonElement>('#btn-copy')!
  .addEventListener('click', () => void copyCode())
document
  .querySelector<HTMLButtonElement>('#btn-download')!
  .addEventListener('click', downloadCode)

updateSize()
updateLatexOptionsEnabled()
updateFormatButtons()
updateCode()
