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

// TableX — exportador Typst.
//
// Genera `#table(...)` con la alineación por columna, la fila 0 como
// `table.header` (si se pide), las fusiones como `table.cell` con
// colspan/rowspan y los colores de fondo como `fill`. Con título o
// etiqueta, se envuelve en `#figure`. Los bordes se emiten como
// `table.hline` / `table.vline` cuando no están todos encendidos (con
// todos encendidos basta el trazo por defecto de Typst). Los anchos de
// columna explícitos salen en puntos.

import type { TableModel } from '../model'

export interface TypstOptions {
  caption: string
  label: string
  headerRow: boolean
  escape: boolean
}

/** Escapa los caracteres con significado en el marcado de Typst. */
export function escapeTypst(text: string): string {
  return text.replace(/([\\*_`$#@<>\[\]])/g, '\\$1')
}

function formatCellText(
  text: string,
  bold: boolean,
  italic: boolean,
  escape: boolean,
): string {
  let out = escape ? escapeTypst(text) : text
  out = out.replace(/\n/g, ' ')
  if (bold && italic) return `_*${out}*_`
  if (bold) return `*${out}*`
  if (italic) return `_${out}_`
  return out
}

/** px (pantalla) a puntos Typst (1 px = 0.75 pt). */
function pxToPt(px: number): string {
  return `${Number((px * 0.75).toFixed(1))}pt`
}

function renderCell(
  table: TableModel,
  r: number,
  c: number,
  opts: TypstOptions,
): string {
  const cell = table.cells[r][c]
  const text = formatCellText(cell.text, cell.bold, cell.italic, opts.escape)
  const inner = `[${text}]`
  const params: string[] = []
  if (cell.colspan > 1) params.push(`colspan: ${cell.colspan}`)
  if (cell.rowspan > 1) params.push(`rowspan: ${cell.rowspan}`)
  if (cell.align !== 'left') params.push(`align: ${cell.align}`)
  if (cell.background) params.push(`fill: rgb("${cell.background}")`)
  if (params.length === 0) return inner
  return `table.cell(${params.join(', ')}, ${inner})`
}

/** ¿Todas las celdas origen llevan los cuatro bordes? */
function allBordersOn(table: TableModel): boolean {
  for (const row of table.cells) {
    for (const cell of row) {
      if (cell.coveredBy) continue
      const b = cell.borders
      if (!b.top || !b.right || !b.bottom || !b.left) return false
    }
  }
  return true
}

/** Celda origen que cubre la posición (r, c): ella misma, o la fusión que
 * la cubre. */
function originAt(
  table: TableModel,
  r: number,
  c: number,
): { row: number; col: number; colspan: number; rowspan: number; top: boolean; right: boolean; bottom: boolean; left: boolean } | undefined {
  const cell = table.cells[r]?.[c]
  if (!cell) return undefined
  const o = cell.coveredBy ?? { row: r, col: c }
  const origin = table.cells[o.row]?.[o.col]
  if (!origin) return undefined
  return {
    row: o.row,
    col: o.col,
    colspan: origin.colspan,
    rowspan: origin.rowspan,
    top: origin.borders.top,
    right: origin.borders.right,
    bottom: origin.borders.bottom,
    left: origin.borders.left,
  }
}

/**
 * Tramos de línea horizontal en la frontera y (0 = arriba, rows = abajo),
 * como [inicio, fin) en columnas. Una línea existe donde la celda de
 * arriba lleva borde inferior o la de abajo lleva borde superior.
 */
function hlineRuns(table: TableModel, y: number): [number, number][] {
  const runs: [number, number][] = []
  for (let c = 0; c < table.cols; c++) {
    const above = y > 0 ? originAt(table, y - 1, c) : undefined
    const below = y < table.rows ? originAt(table, y, c) : undefined
    const on = (above?.bottom ?? false) || (below?.top ?? false)
    if (!on) continue
    const last = runs[runs.length - 1]
    if (last && last[1] === c) last[1] = c + 1
    else runs.push([c, c + 1])
  }
  return runs
}

/**
 * Tramos de línea vertical en la frontera x (0 = izquierda, cols =
 * derecha), como [inicio, fin) en filas.
 */
function vlineRuns(table: TableModel, x: number): [number, number][] {
  const runs: [number, number][] = []
  for (let r = 0; r < table.rows; r++) {
    const left = x > 0 ? originAt(table, r, x - 1) : undefined
    const right = x < table.cols ? originAt(table, r, x) : undefined
    const on = (left?.right ?? false) || (right?.left ?? false)
    if (!on) continue
    const last = runs[runs.length - 1]
    if (last && last[1] === r) last[1] = r + 1
    else runs.push([r, r + 1])
  }
  return runs
}

export function toTypst(table: TableModel, opts: TypstOptions): string {
  const aligns = Array.from({ length: table.cols }, (_, c) => {
    const cell = table.cells[0]?.[c]
    return cell && !cell.coveredBy ? cell.align : 'left'
  })

  const lines: string[] = []
  const hasFigure = opts.caption.trim() !== '' || opts.label.trim() !== ''
  if (hasFigure) lines.push('#figure(')
  // Sin figura, la tabla es una expresión de código y necesita `#`; dentro
  // de #figure ya estamos en modo código.
  lines.push(hasFigure ? '  table(' : '#table(')
  if (table.colWidths.some((w) => w !== null)) {
    const cols = table.colWidths
      .map((w) => (w === null ? 'auto' : pxToPt(w)))
      .join(', ')
    lines.push(`    columns: (${cols}),`)
  } else {
    lines.push(`    columns: ${table.cols},`)
  }
  lines.push(`    align: (${aligns.join(', ')}),`)

  // Bordes: con todos encendidos, el trazo por defecto basta; si falta
  // alguno, se apaga el trazo y se dibujan solo las líneas que tocan.
  if (!allBordersOn(table)) {
    lines.push('    stroke: none,')
    for (let y = 0; y <= table.rows; y++) {
      for (const [start, end] of hlineRuns(table, y)) {
        lines.push(
          end - start === table.cols
            ? `    table.hline(y: ${y}),`
            : `    table.hline(y: ${y}, start: ${start}, end: ${end}),`,
        )
      }
    }
    for (let x = 0; x <= table.cols; x++) {
      for (const [start, end] of vlineRuns(table, x)) {
        lines.push(
          end - start === table.rows
            ? `    table.vline(x: ${x}),`
            : `    table.vline(x: ${x}, start: ${start}, end: ${end}),`,
        )
      }
    }
  }

  for (let r = 0; r < table.rows; r++) {
    const parts: string[] = []
    for (let c = 0; c < table.cols; c++) {
      const cell = table.cells[r][c]
      if (cell.coveredBy) continue
      parts.push(renderCell(table, r, c, opts))
    }
    const rowText = parts.join(', ')
    if (r === 0 && opts.headerRow) {
      lines.push(`    table.header(${rowText}),`)
    } else {
      lines.push(`    ${rowText},`)
    }
  }
  lines.push(hasFigure ? '  ),' : ')')

  if (hasFigure) {
    if (opts.caption.trim() !== '') {
      const caption = opts.escape
        ? escapeTypst(opts.caption)
        : opts.caption
      lines.push(`  caption: [${caption}],`)
    }
    lines.push(')')
    if (opts.label.trim() !== '') {
      lines.push(`<${opts.label.trim()}>`)
    }
  }

  return lines.join('\n')
}
