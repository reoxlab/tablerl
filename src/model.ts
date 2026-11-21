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

// TableX — modelo de datos central.
//
// Una tabla es una cuadrícula de celdas. Cada celda guarda su texto y su
// formato; las celdas fusionadas se representan con colspan/rowspan en la
// celda origen y con `coveredBy` en las celdas cubiertas. Todos los
// exportadores (LaTeX, HTML, Markdown...) leen este modelo y nada más.

export type TextAlign = 'left' | 'center' | 'right'

export interface Cell {
  /** Texto tal como lo escribió el usuario. */
  text: string
  bold: boolean
  italic: boolean
  align: TextAlign
  /** Color de fondo en hex (#RRGGBB) o null si no tiene. */
  background: string | null
  /** Bordes propios de la celda: arriba, derecha, abajo, izquierda. */
  borders: { top: boolean; right: boolean; bottom: boolean; left: boolean }
  /** Columnas que abarca (1 = sin fusionar). */
  colspan: number
  /** Filas que abarca (1 = sin fusionar). */
  rowspan: number
  /** Si la celda está cubierta por una fusión, apunta a la celda origen. */
  coveredBy: { row: number; col: number } | null
}

export interface TableModel {
  rows: number
  cols: number
  cells: Cell[][]
  /** Ancho explícito por columna en px (null = automático). */
  colWidths: (number | null)[]
}

export function emptyCell(): Cell {
  return {
    text: '',
    bold: false,
    italic: false,
    align: 'left',
    background: null,
    // Por defecto la tabla lleva todos los bordes (como tablesgenerator):
    // el estilo estándar de LaTeX dibuja \hline por eso, y quitar un borde
    // es una decisión explícita del usuario.
    borders: { top: true, right: true, bottom: true, left: true },
    colspan: 1,
    rowspan: 1,
    coveredBy: null,
  }
}

export function emptyTable(rows = 3, cols = 3): TableModel {
  return {
    rows,
    cols,
    cells: Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => emptyCell()),
    ),
    colWidths: Array.from({ length: cols }, () => null),
  }
}

// ---------------------------------------------------------------------------
// Operaciones de edición (mutan el modelo; el editor las llama y vuelve a
// dibujar la cuadrícula). Las filas/columnas nunca bajan de 1.
// ---------------------------------------------------------------------------

export function addRow(table: TableModel, index: number): void {
  const at = Math.max(0, Math.min(index, table.rows))
  table.cells.splice(
    at,
    0,
    Array.from({ length: table.cols }, () => emptyCell()),
  )
  table.rows += 1
}

export function deleteRow(table: TableModel, index: number): void {
  if (table.rows <= 1) return
  const at = Math.max(0, Math.min(index, table.rows - 1))
  table.cells.splice(at, 1)
  table.rows -= 1
}

export function addCol(table: TableModel, index: number): void {
  const at = Math.max(0, Math.min(index, table.cols))
  for (const row of table.cells) row.splice(at, 0, emptyCell())
  table.colWidths.splice(at, 0, null)
  table.cols += 1
}

export function deleteCol(table: TableModel, index: number): void {
  if (table.cols <= 1) return
  const at = Math.max(0, Math.min(index, table.cols - 1))
  for (const row of table.cells) row.splice(at, 1)
  table.colWidths.splice(at, 1)
  table.cols -= 1
}

export function clearTable(table: TableModel): void {
  for (const row of table.cells) {
    for (let c = 0; c < row.length; c++) row[c] = emptyCell()
  }
}

// ---------------------------------------------------------------------------
// Formato y fusiones (v0.2). Operan sobre un rango rectangular de celdas;
// las celdas cubiertas por una fusión se saltan (el formato vive en la
// celda origen).
// ---------------------------------------------------------------------------

export interface Range {
  r0: number
  c0: number
  r1: number
  c1: number
}

export function normalizeRange(r0: number, c0: number, r1: number, c1: number): Range {
  return {
    r0: Math.min(r0, r1),
    c0: Math.min(c0, c1),
    r1: Math.max(r0, r1),
    c1: Math.max(c0, c1),
  }
}

/** Aplica negrita/cursiva/alineación a todas las celdas origen del rango. */
export function setRangeFormat(
  table: TableModel,
  range: Range,
  patch: Partial<Pick<Cell, 'bold' | 'italic' | 'align'>>,
): void {
  for (let r = range.r0; r <= range.r1; r++) {
    for (let c = range.c0; c <= range.c1; c++) {
      const cell = table.cells[r]?.[c]
      if (!cell || cell.coveredBy) continue
      Object.assign(cell, patch)
    }
  }
}

/** Enciende o apaga bordes por lado en las celdas origen del rango. */
export function setRangeBorders(
  table: TableModel,
  range: Range,
  patch: Partial<Cell['borders']>,
): void {
  for (let r = range.r0; r <= range.r1; r++) {
    for (let c = range.c0; c <= range.c1; c++) {
      const cell = table.cells[r]?.[c]
      if (!cell || cell.coveredBy) continue
      Object.assign(cell.borders, patch)
    }
  }
}

/** Color de fondo (hex #RRGGBB o null) para las celdas origen del rango. */
export function setRangeBackground(
  table: TableModel,
  range: Range,
  background: string | null,
): void {
  for (let r = range.r0; r <= range.r1; r++) {
    for (let c = range.c0; c <= range.c1; c++) {
      const cell = table.cells[r]?.[c]
      if (!cell || cell.coveredBy) continue
      cell.background = background
    }
  }
}

/** Ancho explícito de una columna en px (null = automático). */
export function setColWidth(
  table: TableModel,
  col: number,
  width: number | null,
): void {
  if (col < 0 || col >= table.cols) return
  table.colWidths[col] = width !== null && width > 0 ? Math.round(width) : null
}

/**
 * Fusiona el rango en una sola celda (origen: esquina superior izquierda).
 * Devuelve false si el rango choca con una fusión existente.
 */
export function mergeCells(table: TableModel, range: Range): boolean {
  const { r0, c0, r1, c1 } = range
  if (r0 === r1 && c0 === c1) return false
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const cell = table.cells[r]?.[c]
      if (!cell) return false
      if (cell.coveredBy) return false
      if ((cell.colspan > 1 || cell.rowspan > 1) && !(r === r0 && c === c0)) {
        return false
      }
    }
  }
  const origin = table.cells[r0][c0]
  origin.colspan = c1 - c0 + 1
  origin.rowspan = r1 - r0 + 1
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (r === r0 && c === c0) continue
      table.cells[r][c].coveredBy = { row: r0, col: c0 }
    }
  }
  return true
}

/** Deshace la fusión de la celda (o de la fusión que la cubre). */
export function unmergeCell(table: TableModel, row: number, col: number): boolean {
  const cell = table.cells[row]?.[col]
  if (!cell) return false
  const originPos = cell.coveredBy ?? { row, col }
  const origin = table.cells[originPos.row]?.[originPos.col]
  if (!origin || (origin.colspan === 1 && origin.rowspan === 1)) return false
  const { colspan, rowspan } = origin
  origin.colspan = 1
  origin.rowspan = 1
  for (let r = originPos.row; r < originPos.row + rowspan; r++) {
    for (let c = originPos.col; c < originPos.col + colspan; c++) {
      const covered = table.cells[r]?.[c]
      if (covered) covered.coveredBy = null
    }
  }
  return true
}
