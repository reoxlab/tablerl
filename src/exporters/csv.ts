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

// TableRL — exportador CSV (v1.1.0).
//
// Separador punto y coma, para que Excel y LibreOffice en español abran
// las columnas sin pelear con la coma decimal. El CSV es texto plano: no
// guarda formato, fusiones ni anchos; las celdas cubiertas por una fusión
// salen vacías, como en Markdown. Un campo se entrecomilla cuando trae el
// separador, comillas o saltos de línea (y las comillas se duplican).
//
// Nota: el CSV no tiene metadatos de encabezado, así que la pregunta «la
// primera fila es encabezado o todo son datos» no cambia las líneas del
// archivo; la respuesta del usuario queda como el ajuste de encabezado de
// la tabla, que sí afecta a LaTeX y a Typst.

import type { TableModel } from '../model'

export interface CsvOptions {
  delimiter: string
}

function escapeCsvField(text: string, delimiter: string): string {
  const needsQuotes =
    text.includes(delimiter) ||
    text.includes('"') ||
    text.includes('\n') ||
    text.includes('\r')
  if (!needsQuotes) return text
  return '"' + text.replace(/"/g, '""') + '"'
}

export function toCsv(table: TableModel, opts: CsvOptions): string {
  const lines: string[] = []
  for (let r = 0; r < table.rows; r++) {
    const cells: string[] = []
    for (let c = 0; c < table.cols; c++) {
      const cell = table.cells[r][c]
      cells.push(cell.coveredBy ? '' : escapeCsvField(cell.text, opts.delimiter))
    }
    lines.push(cells.join(opts.delimiter))
  }
  return lines.join('\n')
}
