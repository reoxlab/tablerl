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
