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

// TableRL — exportador Markdown (GitHub Flavored Markdown).
//
// La fila 0 es el encabezado. La alineación de cada columna sale de la
// celda del encabezado. Las celdas cubiertas por una fusión se emiten
// vacías; la celda origen conserva su texto.

import type { TableModel, TextAlign } from '../model'

export interface MarkdownOptions {
  escape: boolean
}

function escapeMarkdown(text: string): string {
  return text.replace(/[\\|]/g, (ch) => (ch === '\\' ? '\\\\' : '\\|'))
}

function formatCellText(
  text: string,
  bold: boolean,
  italic: boolean,
  escape: boolean,
): string {
  let out = escape ? escapeMarkdown(text) : text
  out = out.replace(/\n/g, '<br>')
  if (bold && italic) return `***${out}***`
  if (bold) return `**${out}**`
  if (italic) return `*${out}*`
  return out
}

function separator(align: TextAlign): string {
  if (align === 'center') return ':---:'
  if (align === 'right') return '---:'
  return '---'
}

export function toMarkdown(table: TableModel, opts: MarkdownOptions): string {
  const renderCell = (r: number, c: number): string => {
    const cell = table.cells[r][c]
    if (cell.coveredBy) return ''
    return formatCellText(cell.text, cell.bold, cell.italic, opts.escape)
  }

  const lines: string[] = []
  // Encabezado (fila 0).
  lines.push(
    '| ' +
      Array.from({ length: table.cols }, (_, c) => renderCell(0, c)).join(
        ' | ',
      ) +
      ' |',
  )
  // Separador con la alineación de cada columna.
  lines.push(
    '| ' +
      Array.from({ length: table.cols }, (_, c) => {
        const cell = table.cells[0][c]
        return separator(cell && !cell.coveredBy ? cell.align : 'left')
      }).join(' | ') +
      ' |',
  )
  // Cuerpo.
  for (let r = 1; r < table.rows; r++) {
    lines.push(
      '| ' +
        Array.from({ length: table.cols }, (_, c) => renderCell(r, c)).join(
          ' | ',
        ) +
        ' |',
    )
  }
  return lines.join('\n')
}
