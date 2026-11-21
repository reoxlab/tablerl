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

// TableX — abrir en Overleaf.
//
// Overleaf acepta crear un documento nuevo con un formulario POST a
// https://www.overleaf.com/docs con el campo `snip` (documento LaTeX
// completo). El exportador genera solo el fragmento de la tabla, así que
// aquí se envuelve en un documento mínimo con los paquetes que la tabla
// necesita (detectados del propio código).

/** Envuelve el fragmento de tabla en un documento LaTeX completo. */
export function wrapForOverleaf(fragment: string): string {
  const body = fragment
    .split('\n')
    .filter((line) => !line.startsWith('% Nota:'))
    .join('\n')
  const packages: string[] = ['\\usepackage[utf8]{inputenc}']
  if (fragment.includes('\\cellcolor')) {
    packages.push('\\usepackage[table]{xcolor}')
  }
  if (fragment.includes('\\toprule') || fragment.includes('\\midrule')) {
    packages.push('\\usepackage{booktabs}')
  }
  if (fragment.includes('\\multirow')) packages.push('\\usepackage{multirow}')
  if (fragment.includes('\\begin{tabularx}')) {
    packages.push('\\usepackage{tabularx}')
  }
  if (fragment.includes('\\begin{longtable}')) {
    packages.push('\\usepackage{longtable}')
  }
  if (fragment.includes('\\arraybackslash')) packages.push('\\usepackage{array}')
  return [
    '\\documentclass{article}',
    ...packages,
    '',
    '\\begin{document}',
    '',
    body,
    '',
    '\\end{document}',
    '',
  ].join('\n')
}

/** Abre el documento en Overleaf (pestaña nueva) con un formulario POST. */
export function openInOverleaf(fragment: string): void {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = 'https://www.overleaf.com/docs'
  form.target = '_blank'
  const input = document.createElement('input')
  input.type = 'hidden'
  input.name = 'snip'
  input.value = wrapForOverleaf(fragment)
  form.appendChild(input)
  document.body.appendChild(form)
  form.submit()
  form.remove()
}
