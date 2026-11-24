// Copyright (C) 2026 Francisco Peña Gallardo (Reox Lab)
//
// This file is part of TableRL.
//
// TableRL is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// TableRL is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with TableRL. If not, see <https://www.gnu.org/licenses/>.

// TableRL — cuadrícula editable.
//
// Una <table> real con celdas contenteditable. El texto vive en el modelo
// (src/model.ts); la cuadrícula solo lo muestra. Tab/Enter/flechas se
// mueven entre celdas; las flechas izquierda/derecha respetan el cursor
// dentro del texto. Clic + Shift+clic selecciona un rango (base para
// fusionar celdas en v0.2).

import {
  addCol,
  addRow,
  clearTable,
  deleteCol,
  deleteRow,
  mergeCells,
  normalizeRange,
  setColWidth,
  setRangeBackground,
  setRangeBorders,
  setRangeFormat,
  unmergeCell,
  type Range,
  type TableModel,
} from './model'

export interface Selection {
  row: number
  col: number
}

export interface EditorCallbacks {
  /** El texto de una celda cambió: hay que regenerar el código. */
  onTextChange: () => void
  /** Cambió la estructura (filas/columnas): hay que redibujar y regenerar. */
  onStructureChange: () => void
  /** Cambió la selección: hay que actualizar la barra de formato. */
  onSelectionChange?: () => void
}

export class GridEditor {
  private container: HTMLElement
  private table: TableModel
  private sel: Selection = { row: 0, col: 0 }
  private anchor: Selection = { row: 0, col: 0 }
  private cb: EditorCallbacks
  private gridEl: HTMLTableElement | null = null

  constructor(container: HTMLElement, table: TableModel, cb: EditorCallbacks) {
    this.container = container
    this.table = table
    this.cb = cb
    this.render()
  }

  get selection(): Selection {
    return { ...this.sel }
  }

  /** Rango rectangular entre el ancla y la celda activa. */
  getRange(): Range {
    return normalizeRange(this.anchor.row, this.anchor.col, this.sel.row, this.sel.col)
  }

  /** Formato de la celda activa (para el estado de la barra de formato). */
  selectedCellFormat(): {
    bold: boolean
    italic: boolean
    align: string
    background: string | null
  } {
    const cell = this.table.cells[this.sel.row]?.[this.sel.col]
    return {
      bold: cell?.bold ?? false,
      italic: cell?.italic ?? false,
      align: cell?.align ?? 'left',
      background: cell?.background ?? null,
    }
  }

  /** Ancho explícito de la columna activa, en px (null = automático). */
  selectedColWidth(): number | null {
    return this.table.colWidths[this.sel.col] ?? null
  }

  /** Sustituye la tabla entera (p. ej. tras importar un XLSX). */
  setTable(table: TableModel): void {
    // Se copia EN EL MISMO objeto (no se reemplaza la referencia): main.ts
    // guarda la misma referencia y genera el código a partir de ella. Si
    // se reemplazara, importar una tabla dejaría el panel de código con
    // la tabla vieja.
    this.table.rows = table.rows
    this.table.cols = table.cols
    this.table.cells = table.cells
    this.table.colWidths = table.colWidths
    this.sel = { row: 0, col: 0 }
    this.anchor = { row: 0, col: 0 }
    this.render()
    this.cb.onStructureChange()
  }

  get size(): { rows: number; cols: number } {
    return { rows: this.table.rows, cols: this.table.cols }
  }

  // -- render ---------------------------------------------------------------

  render(keepFocus = false): void {
    const wasFocused =
      keepFocus && this.gridEl?.contains(document.activeElement)
    this.container.innerHTML = ''
    const grid = document.createElement('table')
    grid.className = 'tx-grid'
    for (let r = 0; r < this.table.rows; r++) {
      const tr = document.createElement('tr')
      for (let c = 0; c < this.table.cols; c++) {
        const cell = this.table.cells[r][c]
        // Las celdas cubiertas por una fusión no existen en el DOM: las
        // cubre la celda origen con colspan/rowspan.
        if (cell.coveredBy) continue
        const td = document.createElement('td')
        td.className = 'tx-cell'
        td.contentEditable = 'true'
        td.spellcheck = false
        td.dataset.row = String(r)
        td.dataset.col = String(c)
        if (cell.colspan > 1) td.colSpan = cell.colspan
        if (cell.rowspan > 1) td.rowSpan = cell.rowspan
        if (cell.bold) td.classList.add('tx-cell--bold')
        if (cell.italic) td.classList.add('tx-cell--italic')
        if (cell.align === 'center') td.classList.add('tx-cell--center')
        if (cell.align === 'right') td.classList.add('tx-cell--right')
        if (cell.borders.top) td.classList.add('tx-cell--b-top')
        if (cell.borders.right) td.classList.add('tx-cell--b-right')
        if (cell.borders.bottom) td.classList.add('tx-cell--b-bottom')
        if (cell.borders.left) td.classList.add('tx-cell--b-left')
        if (cell.background) td.style.backgroundColor = cell.background
        td.textContent = cell.text
        tr.appendChild(td)
      }
      grid.appendChild(tr)
    }
    grid.addEventListener('input', (e) => this.onInput(e))
    grid.addEventListener('keydown', (e) => this.onKeyDown(e))
    grid.addEventListener('click', (e) => this.onClick(e))
    grid.addEventListener('paste', (e) => this.onPaste(e))
    grid.addEventListener('focusin', (e) => this.onFocusIn(e))
    this.container.appendChild(grid)
    this.gridEl = grid
    this.paintSelection()
    if (wasFocused) this.focusCell(this.sel.row, this.sel.col, false)
  }

  private cellEl(row: number, col: number): HTMLTableCellElement | null {
    if (!this.gridEl) return null
    return this.gridEl.querySelector(
      `td[data-row="${row}"][data-col="${col}"]`,
    )
  }

  // -- selección ------------------------------------------------------------

  private inRange(row: number, col: number): boolean {
    const r0 = Math.min(this.anchor.row, this.sel.row)
    const r1 = Math.max(this.anchor.row, this.sel.row)
    const c0 = Math.min(this.anchor.col, this.sel.col)
    const c1 = Math.max(this.anchor.col, this.sel.col)
    return row >= r0 && row <= r1 && col >= c0 && col <= c1
  }

  private paintSelection(): void {
    if (!this.gridEl) return
    for (const td of this.gridEl.querySelectorAll('td')) {
      const r = Number(td.dataset.row)
      const c = Number(td.dataset.col)
      td.classList.toggle(
        'tx-cell--active',
        r === this.sel.row && c === this.sel.col,
      )
      td.classList.toggle('tx-cell--selected', this.inRange(r, c))
    }
  }

  private setSelection(row: number, col: number, anchorToo: boolean): void {
    this.sel = {
      row: Math.max(0, Math.min(row, this.table.rows - 1)),
      col: Math.max(0, Math.min(col, this.table.cols - 1)),
    }
    if (anchorToo) this.anchor = { ...this.sel }
    this.paintSelection()
    this.cb.onSelectionChange?.()
  }

  focusCell(row: number, col: number, placeCaretAtEnd = true): void {
    this.setSelection(row, col, true)
    const td = this.cellEl(this.sel.row, this.sel.col)
    if (!td) return
    td.focus()
    if (placeCaretAtEnd) {
      const range = document.createRange()
      range.selectNodeContents(td)
      range.collapse(false)
      const s = window.getSelection()
      if (s) {
        s.removeAllRanges()
        s.addRange(range)
      }
    }
  }

  // -- eventos --------------------------------------------------------------

  private onInput(e: Event): void {
    const td = (e.target as HTMLElement).closest('td')
    if (!td) return
    const r = Number(td.dataset.row)
    const c = Number(td.dataset.col)
    this.table.cells[r][c].text = td.textContent ?? ''
    this.cb.onTextChange()
  }

  private onFocusIn(e: Event): void {
    const td = (e.target as HTMLElement).closest('td')
    if (!td) return
    this.setSelection(Number(td.dataset.row), Number(td.dataset.col), true)
  }

  private onClick(e: MouseEvent): void {
    const td = (e.target as HTMLElement).closest('td')
    if (!td) return
    const r = Number(td.dataset.row)
    const c = Number(td.dataset.col)
    if (e.shiftKey) {
      this.setSelection(r, c, false)
    } else {
      this.setSelection(r, c, true)
    }
  }

  private onPaste(e: ClipboardEvent): void {
    const text = e.clipboardData?.getData('text/plain') ?? ''
    // Pegado tabular (Excel / Google Sheets): filas separadas por saltos de
    // línea y columnas por tabuladores. Se expande desde la celda activa y
    // la tabla crece si hace falta.
    if (text.includes('\t') || text.includes('\n')) {
      e.preventDefault()
      const rows = text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
      // Excel deja una última línea vacía: se quita.
      if (rows.length > 0 && rows[rows.length - 1] === '') rows.pop()
      const startRow = this.sel.row
      const startCol = this.sel.col
      rows.forEach((line, dr) => {
        const values = line.split('\t')
        values.forEach((value, dc) => {
          const r = startRow + dr
          const c = startCol + dc
          while (this.table.rows <= r) {
            addRow(this.table, this.table.rows)
          }
          while (this.table.cols <= c) {
            addCol(this.table, this.table.cols)
          }
          const cell = this.table.cells[r][c]
          if (cell && !cell.coveredBy) cell.text = value
        })
      })
      this.render(true)
      this.cb.onStructureChange()
      return
    }
    // Pegado simple: solo texto plano en la celda.
    e.preventDefault()
    document.execCommand('insertText', false, text)
  }

  private caretAtStart(td: HTMLTableCellElement): boolean {
    const s = window.getSelection()
    if (!s || s.rangeCount === 0) return false
    const range = s.getRangeAt(0)
    if (!range.collapsed) return false
    const node = range.startContainer
    if (node === td) return range.startOffset === 0
    return node === td.firstChild && range.startOffset === 0
  }

  private caretAtEnd(td: HTMLTableCellElement): boolean {
    const s = window.getSelection()
    if (!s || s.rangeCount === 0) return false
    const range = s.getRangeAt(0)
    if (!range.collapsed) return false
    const node = range.startContainer
    if (node === td) return true
    if (node === td.firstChild && node.nodeType === Node.TEXT_NODE) {
      return range.startOffset === (node.textContent ?? '').length
    }
    return false
  }

  private onKeyDown(e: KeyboardEvent): void {
    const td = (e.target as HTMLElement).closest('td')
    if (!td) return
    const r = Number(td.dataset.row)
    const c = Number(td.dataset.col)

    if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) {
        if (c > 0) this.focusCell(r, c - 1)
        else if (r > 0) this.focusCell(r - 1, this.table.cols - 1)
      } else {
        if (c < this.table.cols - 1) this.focusCell(r, c + 1)
        else if (r < this.table.rows - 1) this.focusCell(r + 1, 0)
      }
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        if (r > 0) this.focusCell(r - 1, c)
      } else if (r < this.table.rows - 1) {
        this.focusCell(r + 1, c)
      }
      return
    }
    if (e.key === 'ArrowLeft' && this.caretAtStart(td)) {
      e.preventDefault()
      if (c > 0) this.focusCell(r, c - 1)
      else if (r > 0) this.focusCell(r - 1, this.table.cols - 1)
      return
    }
    if (e.key === 'ArrowRight' && this.caretAtEnd(td)) {
      e.preventDefault()
      if (c < this.table.cols - 1) this.focusCell(r, c + 1)
      else if (r < this.table.rows - 1) this.focusCell(r + 1, 0)
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (r > 0) this.focusCell(r - 1, c)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (r < this.table.rows - 1) this.focusCell(r + 1, c)
      return
    }
  }

  // -- estructura -----------------------------------------------------------

  addRowAbove(): void {
    addRow(this.table, this.sel.row)
    this.render(true)
    this.cb.onStructureChange()
  }

  addRowBelow(): void {
    addRow(this.table, this.sel.row + 1)
    this.render(true)
    this.cb.onStructureChange()
  }

  deleteRow(): void {
    if (this.table.rows <= 1) return
    deleteRow(this.table, this.sel.row)
    this.setSelection(Math.min(this.sel.row, this.table.rows - 1), this.sel.col, true)
    this.render(true)
    this.cb.onStructureChange()
  }

  addColLeft(): void {
    addCol(this.table, this.sel.col)
    this.render(true)
    this.cb.onStructureChange()
  }

  addColRight(): void {
    addCol(this.table, this.sel.col + 1)
    this.render(true)
    this.cb.onStructureChange()
  }

  deleteCol(): void {
    if (this.table.cols <= 1) return
    deleteCol(this.table, this.sel.col)
    this.setSelection(this.sel.row, Math.min(this.sel.col, this.table.cols - 1), true)
    this.render(true)
    this.cb.onStructureChange()
  }

  clear(): void {
    clearTable(this.table)
    this.render(true)
    this.cb.onStructureChange()
  }

  // -- formato y fusiones (v0.2) --------------------------------------------

  /** Negrita/cursiva/alineación sobre el rango seleccionado. */
  applyFormat(patch: Partial<{ bold: boolean; italic: boolean; align: 'left' | 'center' | 'right' }>): void {
    setRangeFormat(this.table, this.getRange(), patch)
    this.render(true)
    this.cb.onStructureChange()
  }

  /** Fusiona el rango seleccionado. Devuelve false si no se pudo. */
  mergeSelection(): boolean {
    const ok = mergeCells(this.table, this.getRange())
    if (!ok) return false
    this.render(true)
    this.cb.onStructureChange()
    return true
  }

  /** Deshace la fusión de la celda activa. Devuelve false si no había. */
  unmergeSelection(): boolean {
    const ok = unmergeCell(this.table, this.sel.row, this.sel.col)
    if (!ok) return false
    this.render(true)
    this.cb.onStructureChange()
    return true
  }

  // -- bordes, fondo y anchos (v0.2 parte 2) -------------------------------

  /** Enciende o apaga bordes por lado sobre el rango seleccionado. */
  applyBorders(patch: Partial<{ top: boolean; right: boolean; bottom: boolean; left: boolean }>): void {
    setRangeBorders(this.table, this.getRange(), patch)
    this.render(true)
    this.cb.onStructureChange()
  }

  /** Todos los bordes de la selección. */
  allBorders(): void {
    this.applyBorders({ top: true, right: true, bottom: true, left: true })
  }

  /** Ningún borde en la selección. */
  noBorders(): void {
    this.applyBorders({ top: false, right: false, bottom: false, left: false })
  }

  /** Color de fondo (hex o null) sobre el rango seleccionado. */
  applyBackground(background: string | null): void {
    setRangeBackground(this.table, this.getRange(), background)
    this.render(true)
    this.cb.onStructureChange()
  }

  /** Ancho explícito de la columna activa, en px (null = automático). */
  setSelectedColWidth(width: number | null): void {
    setColWidth(this.table, this.sel.col, width)
    this.render(true)
    this.cb.onStructureChange()
  }
}
