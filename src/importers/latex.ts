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

// TableX — importador LaTeX.
//
// Lee de vuelta lo que genera el exportador (y tablas reales escritas a
// mano con la misma forma): entorno `table` opcional con `\caption` y
// `\label`, `tabular`, `tabularx` y `longtable`, especificación de columnas
// (`l/c/r`, `p{...}`, `X`, barras `|` y prefijos `>{...}`), `\hline` y
// `\cline` (bordes), reglas booktabs (`\toprule`, `\midrule`,
// `\bottomrule`), `\multicolumn`, `\multirow`, `\cellcolor[HTML]{...}`,
// `\textbf` y `\textit`, y deshace los escapes de LaTeX. Lo que no sabe
// representar (por ejemplo `\rowcolor` o un `tabular` anidado) se recoge en
// `warnings` en vez de romper la importación.

import { emptyCell, type TableModel, type TextAlign } from '../model'

export interface ParsedLatex {
  table: TableModel
  style: 'standard' | 'booktabs'
  tabularx: boolean
  longtable: boolean
  caption: string
  label: string
  headerRow: boolean
  warnings: string[]
}

const UNESCAPES: Record<string, string> = {
  '\\textbackslash{}': '\\',
  '\\&': '&',
  '\\%': '%',
  '\\$': '$',
  '\\#': '#',
  '\\_': '_',
  '\\{': '{',
  '\\}': '}',
  '\\textasciitilde{}': '~',
  '\\textasciicircum{}': '^',
}

/** Deshace los escapes que emite el exportador. */
export function unescapeLatex(text: string): string {
  let out = text
  for (const [esc, ch] of Object.entries(UNESCAPES)) {
    out = out.split(esc).join(ch)
  }
  return out
}

/** Lee `{...}` equilibrado a partir del índice de `{`; devuelve el contenido y el índice tras `}`. */
function readBraced(src: string, open: number): { content: string; next: number } {
  let depth = 0
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}') {
      depth--
      if (depth === 0) return { content: src.slice(open + 1, i), next: i + 1 }
    }
  }
  throw new Error('Llave sin cerrar en el código LaTeX.')
}

/** Quita comentarios (% hasta fin de línea, sin contar \%). */
function stripComments(src: string): string {
  return src.replace(/(?<!\\)%[^\n]*/g, '')
}

/** Divide una fila en celdas por `&` fuera de llaves y sin escapar (`\&` es texto). */
function splitCells(row: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < row.length; i++) {
    const ch = row[i]
    if (ch === '{') depth++
    else if (ch === '}') depth--
    else if (ch === '&' && depth === 0 && row[i - 1] !== '\\') {
      parts.push(row.slice(start, i))
      start = i + 1
    }
  }
  parts.push(row.slice(start))
  return parts
}

/** Especificación de columnas: alineación y ancho por columna, y qué separadores llevan `|`. */
interface ColSpec {
  aligns: TextAlign[]
  widthsPx: (number | null)[]
  /** true si hay `|` a la izquierda de la columna c (c = 0..cols). */
  bars: boolean[]
}

function parseColSpec(spec: string, warnings: string[]): ColSpec {
  const aligns: TextAlign[] = []
  const widthsPx: (number | null)[] = []
  const bars: boolean[] = []
  let align: TextAlign = 'left'
  let pendingBar = false
  let i = 0
  const cmToPx = (v: number, unit: string): number =>
    unit === 'cm' ? v * 37.8 : unit === 'mm' ? v * 3.78 : unit === 'pt' ? v * 1.33 : v * 37.8
  // `align` es el prefijo pendiente (de `>{...}`) para la próxima columna;
  // se consume al emitir la columna y vuelve a 'left'.

  while (i < spec.length) {
    const ch = spec[i]
    if (ch === ' ' || ch === '\n' || ch === '\t') {
      i++
      continue
    }
    if (ch === '|') {
      pendingBar = true
      i++
      continue
    }
    if (ch === 'l' || ch === 'c' || ch === 'r') {
      align = ch === 'c' ? 'center' : ch === 'r' ? 'right' : 'left'
      aligns.push(align)
      widthsPx.push(null)
      bars.push(pendingBar)
      pendingBar = false
      i++
      continue
    }
    if (ch === 'X') {
      aligns.push(align)
      widthsPx.push(null)
      bars.push(pendingBar)
      pendingBar = false
      align = 'left'
      i++
      continue
    }
    if (spec.startsWith('p{', i) || spec.startsWith('m{', i) || spec.startsWith('b{', i)) {
      const { content, next } = readBraced(spec, i + 1)
      const m = content.match(/^([\d.]+)\s*(cm|mm|pt|in)$/)
      widthsPx.push(m ? Math.round(cmToPx(parseFloat(m[1]), m[2])) : null)
      aligns.push(align)
      bars.push(pendingBar)
      pendingBar = false
      align = 'left'
      i = next
      continue
    }
    if (spec.startsWith('>{', i)) {
      const { content, next } = readBraced(spec, i + 1)
      if (content.includes('\\centering')) align = 'center'
      else if (content.includes('\\raggedleft')) align = 'right'
      else if (content.includes('\\raggedright')) align = 'left'
      i = next
      continue
    }
    if (spec.startsWith('@{', i)) {
      const { next } = readBraced(spec, i + 1)
      i = next
      continue
    }
    warnings.push(`Se ignoró «${ch}» en la especificación de columnas.`)
    i++
  }
  bars.push(pendingBar)
  return { aligns, widthsPx, bars }
}

/** Contenido de una celda: desanida multicolumn/multirow/cellcolor/negrita/cursiva. */
interface ParsedCell {
  text: string
  bold: boolean
  italic: boolean
  colspan: number
  rowspan: number
  background: string | null
  align: TextAlign | null
}

function parseCell(raw: string, warnings: string[]): ParsedCell {
  let text = raw.trim()
  const out: ParsedCell = {
    text: '',
    bold: false,
    italic: false,
    colspan: 1,
    rowspan: 1,
    background: null,
    align: null,
  }

  // \cellcolor[HTML]{RRGGBB} al inicio de la celda.
  const color = text.match(/^\\cellcolor\[HTML\]\{([0-9A-Fa-f]{6})\}/)
  if (color) {
    out.background = `#${color[1].toUpperCase()}`
    text = text.slice(color[0].length).trim()
  }

  // \multicolumn{n}{spec}{texto} (puede envolver un \multirow).
  if (text.startsWith('\\multicolumn')) {
    let pos = '\\multicolumn'.length
    const num = readBraced(text, pos)
    pos = num.next
    const specPart = readBraced(text, pos)
    pos = specPart.next
    const inner = readBraced(text, pos)
    out.colspan = parseInt(num.content, 10)
    const spec = specPart.content
    if (spec.includes('c')) out.align = 'center'
    else if (spec.includes('r')) out.align = 'right'
    else if (spec.includes('l')) out.align = 'left'
    text = inner.content
  }

  // \multirow{n}{*}{texto} (puede venir solo o dentro del multicolumn).
  if (text.startsWith('\\multirow')) {
    let pos = '\\multirow'.length
    const num = readBraced(text, pos)
    pos = num.next
    const width = readBraced(text, pos)
    pos = width.next
    const inner = readBraced(text, pos)
    out.rowspan = parseInt(num.content, 10)
    text = inner.content
  }

  // Negrita/cursiva, incluso anidadas: \textbf{\textit{...}}.
  let changed = true
  while (changed) {
    changed = false
    for (const [cmd, flag] of [
      ['textbf', 'bold'],
      ['textit', 'italic'],
    ] as const) {
      if (text.startsWith(`\\${cmd}{`) && text.endsWith('}')) {
        const inner = readBraced(text, cmd.length + 1)
        if (inner.next === text.length) {
          out[flag] = true
          text = inner.content
          changed = true
        }
      }
    }
  }

  if (/\\(rowcolor|parbox|includegraphics|footnote|href|url)\b/.test(text)) {
    warnings.push(`La celda «${text.slice(0, 40)}» usa un comando no soportado; se importó como texto.`)
  }
  out.text = unescapeLatex(text.replace(/\\newline/g, ' ').replace(/~/g, ' ').trim())
  return out
}

/**
 * Importa código LaTeX a TableModel. Acepta el fragmento del exportador
 * (con o sin entorno `table`) y tablas escritas a mano con la misma forma.
 * Lanza Error si no encuentra ningún entorno tabular.
 */
export function parseLatex(code: string): ParsedLatex {
  const warnings: string[] = []
  const src = stripComments(code)

  const captionMatch = src.match(/\\caption\{([^{}]*)\}/)
  const labelMatch = src.match(/\\label\{([^{}]*)\}/)
  const caption = captionMatch ? unescapeLatex(captionMatch[1]) : ''
  const label = labelMatch ? labelMatch[1].trim() : ''

  const envMatch = src.match(/\\begin\{(tabularx?|longtable)\}/)
  if (!envMatch) {
    throw new Error(
      'No encontré ningún entorno tabular, tabularx o longtable en el código.',
    )
  }
  const envName = envMatch[1]
  const tabularx = envName === 'tabularx'
  const longtable = envName === 'longtable'
  // La especificación puede llevar llaves anidadas (p{2cm}, >{...}):
  // se lee con readBraced, no con una expresión regular.
  let pos = (envMatch.index ?? 0) + envMatch[0].length
  if (tabularx) {
    const textwidth = readBraced(src, pos)
    pos = textwidth.next
  }
  const specPart = readBraced(src, pos)
  const spec = parseColSpec(specPart.content, warnings)

  const envEnd = `\\end{${envName}}`
  const bodyStart = specPart.next
  const bodyEnd = src.indexOf(envEnd, bodyStart)
  if (bodyEnd === -1) throw new Error(`Falta \\end{${envName}}.`)
  const body = src.slice(bodyStart, bodyEnd)

  // Filas: se cortan por \\ (con su [..] opcional) y se anotan las líneas.
  const rows: string[] = []
  const hlinesAfter: Set<number> = new Set()
  const clinesAfter: Map<number, [number, number][]> = new Map()
  let booktabs = false
  let midruleAfterRow: number | null = null
  let current = ''
  let i = 0
  let pendingHlineTop = false
  // En longtable, las reglas entre \endhead y la primera fila del cuerpo
  // son el pie (\endfoot/\endlastfoot): pertenecen a la ÚLTIMA fila, que
  // aún no se ha leído. Se guardan aparte y se aplican al final.
  let headJustEnded = false
  let bodyRowsStarted = false
  let lastRowBottom = false
  const lastRowClines: [number, number][] = []

  const flushRow = () => {
    const trimmed = current.trim()
    if (trimmed !== '') {
      rows.push(trimmed)
      if (headJustEnded) {
        bodyRowsStarted = true
        headJustEnded = false
      }
    }
    current = ''
  }

  while (i < body.length) {
    if (body.startsWith('\\\\', i)) {
      flushRow()
      i += 2
      // [longitud] opcional tras \\ (solo si parece una medida, para no
      // comerse una celda que empiece por `[`).
      const spacing = body.slice(i).match(/^\[[\d.]+(pt|mm|cm|ex|em|in)?\]/)
      if (spacing) i += spacing[0].length
      continue
    }
    if (body.startsWith('\\hline', i)) {
      if (headJustEnded && !bodyRowsStarted) {
        lastRowBottom = true
      } else if (rows.length === 0 && current.trim() === '') {
        pendingHlineTop = true
      } else {
        hlinesAfter.add(rows.length - 1)
      }
      i += 6
      continue
    }
    const cline = body.slice(i).match(/^\\cline\{(\d+)-(\d+)\}/)
    if (cline) {
      if (headJustEnded && !bodyRowsStarted) {
        lastRowClines.push([parseInt(cline[1], 10), parseInt(cline[2], 10)])
      } else {
        const r = rows.length - 1
        const list = clinesAfter.get(r) ?? []
        list.push([parseInt(cline[1], 10), parseInt(cline[2], 10)])
        clinesAfter.set(r, list)
      }
      i += cline[0].length
      continue
    }
    if (body.startsWith('\\toprule', i)) {
      booktabs = true
      pendingHlineTop = true
      i += 8
      continue
    }
    if (body.startsWith('\\midrule', i)) {
      booktabs = true
      midruleAfterRow = rows.length - 1
      i += 8
      continue
    }
    if (body.startsWith('\\bottomrule', i)) {
      booktabs = true
      if (headJustEnded && !bodyRowsStarted) lastRowBottom = true
      else hlinesAfter.add(rows.length - 1)
      i += 11
      continue
    }
    if (
      body.startsWith('\\endfirsthead', i) ||
      body.startsWith('\\endhead', i) ||
      body.startsWith('\\endfoot', i) ||
      body.startsWith('\\endlastfoot', i)
    ) {
      // La repetición de encabezado de longtable duplica filas: se salta
      // el bloque repetido (va entre \endfirsthead y \endhead).
      const cmd = body.slice(i).match(/^\\end(firsthead|head|foot|lastfoot)/)
      const cmdLen = cmd ? cmd[0].length : 0
      if (body.startsWith('\\endfirsthead', i)) {
        const endHead = body.indexOf('\\endhead', i + cmdLen)
        if (endHead !== -1) {
          i = endHead + '\\endhead'.length
          current = ''
          headJustEnded = true
          bodyRowsStarted = false
          continue
        }
      }
      i += cmdLen
      continue
    }
    if (body.startsWith('\\caption', i) || body.startsWith('\\label', i)) {
      const cmd = body.startsWith('\\caption', i) ? 'caption' : 'label'
      const { next } = readBraced(body, i + cmd.length + 1)
      i = next
      continue
    }
    current += body[i]
    i++
  }
  flushRow()

  if (rows.length === 0) throw new Error('El entorno tabular no tiene filas.')

  // Construir el modelo: las celdas nacen sin bordes y se encienden solo
  // los que el código marca (así la ida y vuelta es exacta).
  const ncols = spec.aligns.length
  const table: TableModel = {
    rows: rows.length,
    cols: ncols,
    cells: [],
    colWidths: spec.widthsPx,
  }
  for (let r = 0; r < rows.length; r++) {
    const rowCells = []
    for (let c = 0; c < ncols; c++) {
      const cell = emptyCell()
      cell.borders = { top: false, right: false, bottom: false, left: false }
      rowCells.push(cell)
    }
    table.cells.push(rowCells)
  }

  // Bordes verticales desde la especificación: bars[c] = `|` a la
  // izquierda de la columna c (bars tiene ncols+1 entradas).
  for (let c = 0; c < ncols; c++) {
    if (spec.bars[c]) {
      for (let r = 0; r < rows.length; r++) table.cells[r][c].borders.left = true
    }
    if (spec.bars[c + 1]) {
      for (let r = 0; r < rows.length; r++) table.cells[r][c].borders.right = true
    }
  }
  // Bordes horizontales: \hline superior, tras cada fila, y \cline.
  // Una línea es a la vez el borde inferior de la fila r y el superior
  // de la r+1 (el exportador no distingue: emite una sola \hline).
  if (pendingHlineTop) {
    for (let c = 0; c < ncols; c++) table.cells[0][c].borders.top = true
  }
  for (const r of hlinesAfter) {
    if (r < 0 || r >= rows.length) continue
    for (let c = 0; c < ncols; c++) table.cells[r][c].borders.bottom = true
    if (r + 1 < rows.length) {
      for (let c = 0; c < ncols; c++) table.cells[r + 1][c].borders.top = true
    }
  }
  for (const [r, runs] of clinesAfter) {
    if (r < 0 || r >= rows.length) continue
    for (const [a, b] of runs) {
      for (let c = a - 1; c <= b - 1 && c < ncols; c++) {
        table.cells[r][c].borders.bottom = true
        if (r + 1 < rows.length) table.cells[r + 1][c].borders.top = true
      }
    }
  }
  // El pie de longtable (\endfoot/\endlastfoot) es el borde inferior de
  // la última fila.
  if (lastRowBottom && rows.length > 0) {
    for (let c = 0; c < ncols; c++) {
      table.cells[rows.length - 1][c].borders.bottom = true
    }
  }
  for (const [a, b] of lastRowClines) {
    for (let c = a - 1; c <= b - 1 && c < ncols; c++) {
      table.cells[rows.length - 1][c].borders.bottom = true
    }
  }

  // Contenido de las celdas, con fusiones. El exportador omite las celdas
  // cubiertas por un \multirow en las filas siguientes (la fila lleva menos
  // partes que columnas); una tabla escrita a mano puede llevar el hueco
  // vacío. Se distingue por el número de partes: si coincide con las
  // columnas no cubiertas, las cubiertas no consumen parte.
  rows.forEach((rowText, r) => {
    const parts = splitCells(rowText)
    const nonCovered = table.cells[r]
      .map((cell, c) => (cell.coveredBy ? -1 : c))
      .filter((c) => c >= 0)
    const isCompact = parts.length === nonCovered.length
    let pi = 0
    let c = 0
    while (c < ncols && pi < parts.length) {
      const cell = table.cells[r][c]
      if (cell.coveredBy) {
        if (!isCompact) pi++
        c++
        continue
      }
      const parsed = parseCell(parts[pi], warnings)
      cell.text = parsed.text
      cell.bold = parsed.bold
      cell.italic = parsed.italic
      cell.background = parsed.background
      // La alineación de la columna vive en la fila 0 (así la lee el
      // exportador); en las demás filas la celda queda a la izquierda salvo
      // que su propio \multicolumn diga otra cosa.
      cell.align = parsed.align ?? (r === 0 ? (spec.aligns[c] ?? 'left') : 'left')
      cell.colspan = Math.min(parsed.colspan, ncols - c)
      cell.rowspan = Math.min(parsed.rowspan, rows.length - r)
      for (let dr = 0; dr < cell.rowspan; dr++) {
        for (let dc = 0; dc < cell.colspan; dc++) {
          if (dr === 0 && dc === 0) continue
          const covered = table.cells[r + dr]?.[c + dc]
          if (covered) {
            covered.coveredBy = { row: r, col: c }
            // Las celdas cubiertas se ignoran al exportar: quedan con los
            // bordes por defecto de una celda vacía (como al fusionar).
            covered.borders = { top: true, right: true, bottom: true, left: true }
          }
        }
      }
      pi++
      c += cell.colspan
    }
    if (pi < parts.length) {
      warnings.push(`La fila ${r + 1} tiene más celdas que columnas; se ignoró el resto.`)
    }
  })

  return {
    table,
    style: booktabs ? 'booktabs' : 'standard',
    tabularx,
    longtable,
    caption,
    label,
    headerRow: midruleAfterRow === 0,
    warnings,
  }
}
