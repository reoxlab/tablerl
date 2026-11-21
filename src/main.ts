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

type Format = 'latex' | 'booktabs' | 'markdown'

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
      <div class="tx-grid-wrap"><div id="grid"></div></div>
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
      </div>
      <div class="tx-options">
        <label>Título <input type="text" id="opt-caption" placeholder="Título de la tabla" /></label>
        <label>Etiqueta <input type="text" id="opt-label" placeholder="tab:mi-tabla" /></label>
        <label><input type="checkbox" id="opt-centered" checked /> Centrada</label>
        <label><input type="checkbox" id="opt-header" checked /> Primera fila: encabezado</label>
        <label><input type="checkbox" id="opt-escape" checked /> Escapar caracteres</label>
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
    <a href="https://github.com/reoxforlife/tablex">github.com/reoxforlife/tablex</a>.
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
const copiedMsg = document.querySelector<HTMLSpanElement>('#copied-msg')!

function latexOptions(): LatexOptions {
  return {
    style: format === 'booktabs' ? 'booktabs' : 'standard',
    caption: captionInput.value,
    label: labelInput.value,
    centered: centeredInput.checked,
    headerRow: headerInput.checked,
    escape: escapeInput.checked,
  }
}

function generate(): string {
  if (format === 'markdown') {
    return toMarkdown(table, { escape: escapeInput.checked })
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
  const isLatex = format !== 'markdown'
  captionInput.disabled = !isLatex
  labelInput.disabled = !isLatex
  centeredInput.disabled = !isLatex
  headerInput.disabled = !isLatex
}

const editor = new GridEditor(gridHost, table, {
  onTextChange: updateCode,
  onStructureChange: () => {
    updateCode()
    updateSize()
  },
})

function setFormat(next: Format): void {
  format = next
  for (const [id, f] of [
    ['tab-latex', 'latex'],
    ['tab-booktabs', 'booktabs'],
    ['tab-markdown', 'markdown'],
  ] as const) {
    document
      .querySelector<HTMLButtonElement>(`#${id}`)!
      .classList.toggle('tx-tab--active', f === next)
  }
  const downloadBtn = document.querySelector<HTMLButtonElement>('#btn-download')!
  downloadBtn.textContent =
    next === 'markdown' ? 'Descargar .md' : 'Descargar .tex'
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

for (const input of [captionInput, labelInput]) {
  input.addEventListener('input', updateCode)
}
for (const input of [centeredInput, headerInput, escapeInput]) {
  input.addEventListener('change', updateCode)
}

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
  const ext = format === 'markdown' ? 'md' : 'tex'
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
updateCode()
