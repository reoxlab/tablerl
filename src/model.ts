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
    borders: { top: false, right: false, bottom: false, left: false },
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
