// Prueba del importador LaTeX: ida y vuelta (exportar → importar →
// exportar) sin perder contenido, y tablas escritas a mano (longtable,
// \cline, errores). Se corre con esbuild, igual que test-exporters.ts.
import {
  emptyTable,
  mergeCells,
  setColWidth,
  setRangeBackground,
  type TableModel,
} from '../src/model'
import { toLatex } from '../src/exporters/latex'
import { parseLatex, unescapeLatex } from '../src/importers/latex'

let passed = 0
let failed = 0
function check(name: string, cond: boolean, extra = ''): void {
  if (cond) {
    passed++
    console.log(`ok ${passed + failed} - ${name}`)
  } else {
    failed++
    console.log(`FAIL ${passed + failed} - ${name} ${extra}`)
  }
}

/** Proyección comparable del modelo (sin métodos, solo datos). */
function project(t: TableModel, withBorders: boolean) {
  return JSON.stringify({
    rows: t.rows,
    cols: t.cols,
    colWidths: t.colWidths,
    cells: t.cells.map((row) =>
      row.map((c) => ({
        text: c.text,
        bold: c.bold,
        italic: c.italic,
        align: c.align,
        background: c.background,
        borders: withBorders ? c.borders : undefined,
        colspan: c.colspan,
        rowspan: c.rowspan,
        coveredBy: c.coveredBy,
      })),
    ),
  })
}

// ---------------------------------------------------------------------------
// 1. Ida y vuelta estándar (todos los bordes, formatos, escapes).
// ---------------------------------------------------------------------------
const t = emptyTable(3, 3)
const texts = [
  ['Elemento', 'Símbolo', 'Masa (u)'],
  ['Hidrógeno', 'H', '1.008'],
  ['Carbono & co.', 'C_6', '12.011 %'],
]
for (let r = 0; r < 3; r++)
  for (let c = 0; c < 3; c++) t.cells[r][c].text = texts[r][c]
t.cells[0][1].align = 'center'
t.cells[0][2].align = 'right'
t.cells[1][0].bold = true
t.cells[2][2].italic = true

const stdOpts = {
  style: 'standard' as const,
  caption: 'Masas atómicas',
  label: 'tab:masas',
  centered: true,
  headerRow: true,
  escape: true,
  tabularx: false,
  longtable: false,
}
const stdCode = toLatex(t, stdOpts)
const stdBack = parseLatex(stdCode)
check('estándar: modelo idéntico (con bordes)', project(t, true) === project(stdBack.table, true))
check(
  'estándar: re-exportar da el mismo código',
  toLatex(stdBack.table, { ...stdOpts, caption: stdBack.caption, label: stdBack.label }) === stdCode,
)
check('estándar: caption y label', stdBack.caption === 'Masas atómicas' && stdBack.label === 'tab:masas')
check('estándar: sin avisos', stdBack.warnings.length === 0, JSON.stringify(stdBack.warnings))

// ---------------------------------------------------------------------------
// 2. Ida y vuelta booktabs (los bordes no se conservan: booktabs no los usa).
// ---------------------------------------------------------------------------
const bookOpts = { ...stdOpts, style: 'booktabs' as const }
const bookCode = toLatex(t, bookOpts)
const bookBack = parseLatex(bookCode)
check('booktabs: contenido idéntico', project(t, false) === project(bookBack.table, false))
check('booktabs: estilo detectado', bookBack.style === 'booktabs')
check('booktabs: encabezado detectado', bookBack.headerRow === true)
check(
  'booktabs: re-exportar da el mismo código',
  toLatex(bookBack.table, { ...bookOpts, caption: bookBack.caption, label: bookBack.label }) === bookCode,
)

// ---------------------------------------------------------------------------
// 3. Ida y vuelta tabularx: anchos, fusiones, multirow, color, tabularx.
// ---------------------------------------------------------------------------
const x = emptyTable(3, 3)
x.cells[0][0].text = 'A'
x.cells[0][1].text = 'B'
x.cells[0][1].align = 'center'
x.cells[0][2].text = 'C'
x.cells[0][2].align = 'right'
x.cells[1][0].text = 'Vertical'
x.cells[1][0].bold = true
x.cells[1][1].text = 'Total'
x.cells[1][2].text = ''
x.cells[2][0].text = ''
x.cells[2][1].text = 'x'
x.cells[2][2].text = 'y'
setColWidth(x, 0, 100)
setColWidth(x, 2, 100)
mergeCells(x, { r0: 1, c0: 0, r1: 2, c1: 0 })
mergeCells(x, { r0: 1, c0: 1, r1: 1, c1: 2 })
setRangeBackground(x, { r0: 0, c0: 2, r1: 0, c1: 2 }, '#FFEEDD')

const xOpts = {
  style: 'standard' as const,
  caption: '',
  label: '',
  centered: false,
  headerRow: false,
  escape: true,
  tabularx: true,
  longtable: false,
}
const xCode = toLatex(x, xOpts)
const xBack = parseLatex(xCode)
check('tabularx: modelo idéntico (con bordes)', project(x, true) === project(xBack.table, true))
check('tabularx: detectado', xBack.tabularx === true)
check(
  'tabularx: re-exportar da el mismo código',
  toLatex(xBack.table, xOpts) === xCode,
  `\n--- original ---\n${xCode}\n--- re-exportado ---\n${toLatex(xBack.table, xOpts)}`,
)

// ---------------------------------------------------------------------------
// 4b. Exportar longtable y su ida y vuelta (estándar y booktabs).
// ---------------------------------------------------------------------------
const ltOpts = { ...stdOpts, longtable: true }
const ltCode = toLatex(t, ltOpts)
check('longtable export: entorno', ltCode.includes('\\begin{longtable}{|l|c|r|}'))
check('longtable export: repetición de encabezado', ltCode.includes('\\endfirsthead') && ltCode.includes('\\endhead'))
check('longtable export: pies', ltCode.includes('\\endfoot') && ltCode.includes('\\endlastfoot'))
check('longtable export: nota del paquete', ltCode.includes('\\usepackage{longtable}'))
check('longtable export: caption dentro', ltCode.includes('\\caption{Masas atómicas}\\label{tab:masas} \\\\'))
check('longtable export: sin entorno table', !ltCode.includes('\\begin{table}'))
const ltBack = parseLatex(ltCode)
check('longtable export: modelo idéntico (con bordes)', project(t, true) === project(ltBack.table, true))
check('longtable export: re-exportar da el mismo código', toLatex(ltBack.table, ltOpts) === ltCode)
const ltBookCode = toLatex(t, { ...bookOpts, longtable: true })
check('longtable booktabs: toprule y bottomrule', ltBookCode.includes('\\toprule') && ltBookCode.includes('\\bottomrule'))
check('longtable booktabs: ida y vuelta', toLatex(parseLatex(ltBookCode).table, { ...bookOpts, longtable: true }) === ltBookCode)

// ---------------------------------------------------------------------------
// 4. Tabla larga escrita a mano, con repetición de encabezado.
// ---------------------------------------------------------------------------
const longCode = `
\\begin{longtable}{|l|c|r|}
\\caption{Tabla larga}\\label{tab:larga} \\\\
\\hline
A & B & C \\\\
\\hline
\\endfirsthead
A & B & C \\\\
\\hline
\\endhead
\\hline
\\endfoot
\\hline
\\endlastfoot
1 & 2 & 3 \\\\
\\hline
\\end{longtable}
`
const longBack = parseLatex(longCode)
check('longtable: detectado', longBack.longtable === true)
check('longtable: 2 filas, 3 columnas', longBack.table.rows === 2 && longBack.table.cols === 3)
check('longtable: encabezado', longBack.table.cells[0][0].text === 'A' && longBack.table.cells[0][2].text === 'C')
check('longtable: datos', longBack.table.cells[1][0].text === '1' && longBack.table.cells[1][2].text === '3')
check('longtable: caption y label', longBack.caption === 'Tabla larga' && longBack.label === 'tab:larga')
check('longtable: bordes verticales', longBack.table.cells[1][0].borders.left && longBack.table.cells[1][2].borders.right)
check('longtable: bordes horizontales', longBack.table.cells[0][0].borders.bottom && longBack.table.cells[1][0].borders.bottom)

// ---------------------------------------------------------------------------
// 5. \cline parcial: solo algunas celdas llevan borde inferior.
// ---------------------------------------------------------------------------
const clineCode = `\\begin{tabular}{lll}
A & B & C \\\\
\\cline{1-2}
D & E & F \\\\
\\hline
\\end{tabular}`
const clineBack = parseLatex(clineCode)
check(
  'cline: borde parcial en la fila 0',
  clineBack.table.cells[0][0].borders.bottom &&
    clineBack.table.cells[0][1].borders.bottom &&
    !clineBack.table.cells[0][2].borders.bottom,
)
check(
  'cline: borde completo en la fila 1',
  clineBack.table.cells[1].every((c) => c.borders.bottom),
)
check('cline: sin bordes verticales', !clineBack.table.cells[0][0].borders.left)

// ---------------------------------------------------------------------------
// 6. Errores y escapes.
// ---------------------------------------------------------------------------
let threw = false
try {
  parseLatex('Esto no es una tabla.')
} catch {
  threw = true
}
check('error: sin tabular', threw)
threw = false
try {
  parseLatex('\\begin{tabular}{ll}\\end{tabular}')
} catch {
  threw = true
}
check('error: tabular vacío', threw)
check('unescape: & y %', unescapeLatex('A \\& B \\% C') === 'A & B % C')

console.log(`\n${passed} pasadas, ${failed} fallidas`)
if (failed > 0) process.exit(1)
