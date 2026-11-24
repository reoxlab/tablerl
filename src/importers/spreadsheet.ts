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

// TableX — importador de hojas de cálculo (SheetJS, v1.1.0).
//
// Lee XLSX, XLS y ODS: la hoja elegida se convierte en TableModel, con
// las fusiones de la hoja (`!merges`) aplicadas. Si el libro trae varias
// hojas, la interfaz pregunta cuál importar; con una sola hoja se importa
// directo. SheetJS se carga solo cuando se usa (import dinámico), para no
// engordar el bundle inicial. Licencia de SheetJS (community): Apache 2.0.

import { emptyTable, mergeCells, type TableModel } from '../model'

function cellText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value)
}

export interface SpreadsheetBook {
  sheetNames: string[]
  importSheet(name: string): TableModel
}

export async function loadSpreadsheet(file: File): Promise<SpreadsheetBook> {
  const XLSX = await import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  if (wb.SheetNames.length === 0) throw new Error('El libro no tiene hojas.')
  return {
    sheetNames: [...wb.SheetNames],
    importSheet(name: string): TableModel {
      const sheet = wb.Sheets[name]
      if (!sheet) throw new Error(`No existe la hoja «${name}».`)
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        raw: true,
        defval: '',
      })
      const rows = Math.max(aoa.length, 1)
      const cols = Math.max(...aoa.map((r) => r.length), 1)
      const table = emptyTable(rows, cols)
      for (let r = 0; r < aoa.length; r++) {
        for (let c = 0; c < (aoa[r]?.length ?? 0); c++) {
          table.cells[r][c].text = cellText(aoa[r][c])
        }
      }
      // Fusiones de la hoja, si las trae.
      const merges = (sheet['!merges'] ?? []) as {
        s: { r: number; c: number }
        e: { r: number; c: number }
      }[]
      for (const m of merges) {
        mergeCells(table, {
          r0: m.s.r,
          c0: m.s.c,
          r1: m.e.r,
          c1: m.e.c,
        })
      }
      return table
    },
  }
}

export async function importSpreadsheet(
  file: File,
  sheetName?: string,
): Promise<TableModel> {
  const book = await loadSpreadsheet(file)
  return book.importSheet(sheetName ?? book.sheetNames[0])
}
