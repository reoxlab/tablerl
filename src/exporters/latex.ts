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

// TableRL — exportador LaTeX (estilo estándar con \hline y estilo booktabs).
//
// Lee solo el TableModel: texto, negrita/cursiva, alineación, bordes,
// fondo, colspan/rowspan y anchos de columna. Las celdas cubiertas por una
// fusión se saltan; la celda origen emite \multicolumn y, si abarca varias
// filas, \multirow. En el estilo estándar las líneas salen de los bordes
// del modelo: \hline cuando la fila entera lleva borde inferior y \cline
// para tramos parciales; las barras verticales salen de los bordes
// laterales. El estilo booktabs ignora los bordes (tiene sus propias
// reglas). Los anchos de columna se emiten como p{...} y, con la opción
// tabularx, como columnas X ajustadas a \textwidth.

import type { TableModel, TextAlign } from '../model'

export interface LatexOptions {
  style: 'standard' | 'booktabs'
  caption: string
  label: string
  centered: boolean
  headerRow: boolean
  escape: boolean
  tabularx: boolean
  /** Tabla larga: entorno longtable con encabezado repetido (incompatible con tabularx). */
  longtable: boolean
}

const ESCAPES: Record<string, string> = {
  '\\': '\\textbackslash{}',
  '&': '\\&',
  '%': '\\%',
  '$': '\\$',
  '#': '\\#',
  _: '\\_',
  '{': '\\{',
  '}': '\\}',
  '~': '\\textasciitilde{}',
  '^': '\\textasciicircum{}',
}

/** Escapa los caracteres especiales de LaTeX en una sola pasada. */
export function escapeLatex(text: string): string {
  return text.replace(/[\\&%$#_{}~^]/g, (ch) => ESCAPES[ch])
}

function formatCellText(
  text: string,
  bold: boolean,
  italic: boolean,
  escape: boolean,
): string {
  // Los saltos de línea dentro de una celda no caben en tabular: van como
  // espacio (el usuario puede usar \newline a mano si lo necesita).
  let out = escape ? escapeLatex(text) : text
  out = out.replace(/\n/g, ' ')
  if (bold && italic) return `\\textbf{\\textit{${out}}}`
  if (bold) return `\\textbf{${out}}`
  if (italic) return `\\textit{${out}}`
  return out
}

function alignChar(align: TextAlign): string {
  return align === 'center' ? 'c' : align === 'right' ? 'r' : 'l'
}

/** Alineación de cada columna: la de la celda de la primera fila. */
function columnAligns(table: TableModel): TextAlign[] {
  return Array.from({ length: table.cols }, (_, c) => {
    const cell = table.cells[0]?.[c]
    return cell && !cell.coveredBy ? cell.align : 'left'
  })
}

/** px (pantalla) a cm, con dos decimales como mucho. */
function pxToCm(px: number): string {
  const cm = px / 37.8
  return `${Number(cm.toFixed(2))}cm`
}

/**
 * Especificación de una columna. Con ancho explícito usa p{...} (o X con
 * tabularx); sin ancho, el carácter de alineación (o X). La alineación
 * centrada/derecha en p/X necesita el prefijo >{...} del paquete array.
 */
function columnSpec(
  table: TableModel,
  c: number,
  align: TextAlign,
  tabularx: boolean,
  needs: { array: boolean },
): string {
  const width = table.colWidths[c]
  let base: string
  if (tabularx) {
    base = width ? `p{${pxToCm(width)}}` : 'X'
  } else {
    base = width ? `p{${pxToCm(width)}}` : alignChar(align)
  }
  if (base === 'X' || base.startsWith('p{')) {
    if (align === 'center') {
      needs.array = true
      return `>{\\centering\\arraybackslash}${base}`
    }
    if (align === 'right') {
      needs.array = true
      return `>{\\raggedleft\\arraybackslash}${base}`
    }
  }
  return base
}

/** ¿Alguna celda lleva borde en ese lado de la columna c? Para el borde
 * derecho de una celda fusionada cuenta su última columna. */
function columnHasBorder(
  table: TableModel,
  c: number,
  side: 'left' | 'right',
): boolean {
  for (let r = 0; r < table.rows; r++) {
    for (let cc = 0; cc < table.cols; cc++) {
      const cell = table.cells[r]?.[cc]
      if (!cell || cell.coveredBy) continue
      if (side === 'left' && cc === c && cell.borders.left) return true
      if (
        side === 'right' &&
        cc + cell.colspan - 1 === c &&
        cell.borders.right
      ) {
        return true
      }
    }
  }
  return false
}

/** Especificación de columnas con barras verticales según los bordes. */
function columnSpecWithBars(
  table: TableModel,
  aligns: TextAlign[],
  tabularx: boolean,
  needs: { array: boolean },
): string {
  const specs = aligns.map((a, c) => columnSpec(table, c, a, tabularx, needs))
  let out = ''
  if (columnHasBorder(table, 0, 'left')) out += '|'
  for (let c = 0; c < table.cols; c++) {
    out += specs[c]
    const right =
      columnHasBorder(table, c, 'right') ||
      (c + 1 < table.cols && columnHasBorder(table, c + 1, 'left'))
    if (right) out += '|'
  }
  return out
}

/**
 * Tramos de borde inferior de una fila, en columnas 1-based e incluyendo
 * el ancho de las fusiones. [[1,3]] = \cline{1-3}; un tramo que cubre toda
 * la fila se emite como \hline.
 */
function bottomRuns(table: TableModel, r: number): [number, number][] {
  const runs: [number, number][] = []
  let c = 0
  while (c < table.cols) {
    const cell = table.cells[r][c]
    if (!cell || cell.coveredBy) {
      c++
      continue
    }
    if (cell.borders.bottom) {
      const start = c + 1
      const end = c + cell.colspan
      const last = runs[runs.length - 1]
      if (last && last[1] === start - 1) last[1] = end
      else runs.push([start, end])
    }
    c += cell.colspan
  }
  return runs
}

function renderRow(
  table: TableModel,
  r: number,
  opts: LatexOptions,
  needs: { xcolor: boolean },
): string {
  const parts: string[] = []
  for (let c = 0; c < table.cols; c++) {
    const cell = table.cells[r][c]
    if (cell.coveredBy) continue
    let text = formatCellText(cell.text, cell.bold, cell.italic, opts.escape)
    if (cell.background) {
      needs.xcolor = true
      const hex = cell.background.replace('#', '').toUpperCase()
      text = `\\cellcolor[HTML]{${hex}}${text}`
    }
    if (cell.colspan > 1 && cell.rowspan > 1) {
      parts.push(
        `\\multicolumn{${cell.colspan}}{${alignChar(cell.align)}}{\\multirow{${cell.rowspan}}{*}{${text}}}`,
      )
    } else if (cell.colspan > 1) {
      parts.push(
        `\\multicolumn{${cell.colspan}}{${alignChar(cell.align)}}{${text}}`,
      )
    } else if (cell.rowspan > 1) {
      parts.push(`\\multirow{${cell.rowspan}}{*}{${text}}`)
    } else {
      parts.push(text)
    }
  }
  return parts.join(' & ') + ' \\\\'
}

export function toLatex(table: TableModel, opts: LatexOptions): string {
  const aligns = columnAligns(table)
  const needs = { array: false, xcolor: false }
  const usesMultirow = table.cells.some((row) =>
    row.some((cell) => !cell.coveredBy && cell.rowspan > 1),
  )
  const usesLongtable = opts.longtable
  const usesTabularx = opts.tabularx && !usesLongtable

  const colSpec =
    opts.style === 'booktabs'
      ? aligns
          .map((a, c) => columnSpec(table, c, a, usesTabularx, needs))
          .join('')
      : columnSpecWithBars(table, aligns, usesTabularx, needs)

  const envOpen = usesLongtable
    ? `\\begin{longtable}{${colSpec}}`
    : usesTabularx
      ? `\\begin{tabularx}{\\textwidth}{${colSpec}}`
      : `\\begin{tabular}{${colSpec}}`
  const envClose = usesLongtable
    ? '\\end{longtable}'
    : usesTabularx
      ? '\\end{tabularx}'
      : '\\end{tabular}'

  const lines: string[] = []
  const notes: string[] = []
  if (usesMultirow) notes.push('\\usepackage{multirow}')
  if (usesTabularx) notes.push('\\usepackage{tabularx}')
  if (usesLongtable) notes.push('\\usepackage{longtable}')
  if (needs.array) notes.push('\\usepackage{array}')
  // El color de fondo se detecta al dibujar las filas (ver abajo).
  if (notes.length > 0) {
    lines.push(`% Nota: esta tabla necesita en el preámbulo: ${notes.join(', ')}.`)
  }

  const inTableEnv =
    !usesLongtable && (opts.centered || opts.caption.trim() !== '')
  if (inTableEnv) {
    lines.push('\\begin{table}[htbp]')
    if (opts.centered) lines.push('\\centering')
    if (opts.caption.trim() !== '') {
      lines.push(`\\caption{${opts.escape ? escapeLatex(opts.caption) : opts.caption}}`)
    }
    if (opts.label.trim() !== '') {
      lines.push(`\\label{${opts.label.trim()}}`)
    }
  }

  lines.push(envOpen)

  /** Reglas horizontales tras la fila r (estándar; booktabs solo el \midrule del encabezado). */
  const rowRules = (r: number): string[] => {
    if (opts.style === 'booktabs') {
      return r === 0 && opts.headerRow ? ['\\midrule'] : []
    }
    const runs = bottomRuns(table, r)
    if (runs.length === 1 && runs[0][0] === 1 && runs[0][1] === table.cols) {
      return ['\\hline']
    }
    return runs.map(([a, b]) => `\\cline{${a}-${b}}`)
  }
  /** Regla superior (booktabs: \toprule; estándar: \hline si la fila 0 la lleva). */
  const topRule = (): string[] => {
    if (opts.style === 'booktabs') return ['\\toprule']
    const top = table.cells[0].some(
      (cell) => !cell.coveredBy && cell.borders.top,
    )
    return top ? ['\\hline'] : []
  }
  /** Regla del pie de longtable (la última línea de cada página). */
  const footRule = (): string =>
    opts.style === 'booktabs' ? '\\bottomrule' : '\\hline'

  if (usesLongtable) {
    // El título va dentro del entorno, seguido de \\.
    if (opts.caption.trim() !== '' || opts.label.trim() !== '') {
      let cap = ''
      if (opts.caption.trim() !== '') {
        cap += `\\caption{${opts.escape ? escapeLatex(opts.caption) : opts.caption}}`
      }
      if (opts.label.trim() !== '') cap += `\\label{${opts.label.trim()}}`
      lines.push(`${cap} \\\\`)
    }
    const firstRow = opts.headerRow ? 1 : 0
    if (opts.headerRow && table.rows > 0) {
      lines.push(...topRule())
      lines.push(renderRow(table, 0, opts, needs))
      lines.push(...rowRules(0))
      lines.push('\\endfirsthead')
      lines.push(renderRow(table, 0, opts, needs))
      lines.push(...rowRules(0))
      lines.push('\\endhead')
      lines.push(footRule())
      lines.push('\\endfoot')
      lines.push(footRule())
      lines.push('\\endlastfoot')
    }
    for (let r = firstRow; r < table.rows; r++) {
      lines.push(renderRow(table, r, opts, needs))
      // La última fila no lleva regla: la pone el pie (\endfoot/\endlastfoot).
      if (r < table.rows - 1) lines.push(...rowRules(r))
    }
  } else {
    if (opts.style === 'booktabs') lines.push('\\toprule')
    for (let r = 0; r < table.rows; r++) {
      if (opts.style === 'standard' && r === 0) lines.push(...topRule())
      lines.push(renderRow(table, r, opts, needs))
      lines.push(...rowRules(r))
    }
    if (opts.style === 'booktabs') lines.push('\\bottomrule')
  }

  lines.push(envClose)
  if (inTableEnv) lines.push('\\end{table}')

  // El aviso de xcolor depende de las filas: se inserta al principio si
  // hizo falta.
  if (needs.xcolor) {
    const note =
      '% Nota: esta tabla usa colores de fondo — añade \\usepackage[table]{xcolor} al preámbulo.'
    lines.unshift(note)
  }

  return lines.join('\n')
}
