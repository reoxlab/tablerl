// Prueba rápida de los exportadores (no es un test formal; se corre con esbuild).
import { emptyTable, mergeCells, setColWidth, setRangeBackground, setRangeBorders } from '../src/model'
import { toLatex } from '../src/exporters/latex'
import { toMarkdown } from '../src/exporters/markdown'
import { toTypst } from '../src/exporters/typst'

const t = emptyTable(3, 3)
const texts = [
  ['Elemento', 'Símbolo', 'Masa (u)'],
  ['Hidrógeno', 'H', '1.008'],
  ['Carbono & co.', 'C_6', '12.011 %'],
]
for (let r = 0; r < 3; r++) {
  for (let c = 0; c < 3; c++) {
    t.cells[r][c].text = texts[r][c]
  }
}
t.cells[0][1].align = 'center'
t.cells[0][2].align = 'right'

const latexStd = toLatex(t, {
  style: 'standard',
  caption: 'Masas atómicas',
  label: 'tab:masas',
  centered: true,
  headerRow: true,
  escape: true,
  tabularx: false,
  longtable: false,
})
const latexBook = toLatex(t, {
  style: 'booktabs',
  caption: 'Masas atómicas',
  label: 'tab:masas',
  centered: true,
  headerRow: true,
  escape: true,
  tabularx: false,
  longtable: false,
})
const md = toMarkdown(t, { escape: true })

// Tabla con fusión: encabezado de dos columnas + fila de datos.
const m = emptyTable(2, 3)
m.cells[0][0].text = 'Resultados'
m.cells[0][1].text = ''
m.cells[0][2].text = 'Nota'
m.cells[1][0].text = 'A'
m.cells[1][1].text = 'B'
m.cells[1][2].text = 'ok'
m.cells[0][0].bold = true
const merged = mergeCells(m, { r0: 0, c0: 0, r1: 0, c1: 1 })
const latexMerged = toLatex(m, {
  style: 'standard',
  caption: '',
  label: '',
  centered: false,
  headerRow: true,
  escape: true,
  tabularx: false,
  longtable: false,
})
const typst = toTypst(t, {
  caption: 'Masas atómicas',
  label: 'tab:masas',
  headerRow: true,
  escape: true,
})
const typstMerged = toTypst(m, {
  caption: '',
  label: '',
  headerRow: true,
  escape: true,
})

// Importador de hojas de cálculo: genera un libro de prueba y lo importa
// de vuelta.
import xlsxMod from 'xlsx'
const XLSX = xlsxMod
const wb = XLSX.utils.book_new()
const ws = XLSX.utils.aoa_to_sheet([
  ['Nombre', 'Valor'],
  ['A', 1],
  ['B', 2],
])
ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }]
XLSX.utils.book_append_sheet(wb, ws, 'Hoja1')
const xlsxBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
const { importSpreadsheet } = await import('../src/importers/spreadsheet')
const imported = await importSpreadsheet(new File([xlsxBuf], 'prueba.xlsx'))

// Bordes, fondo y anchos (v0.2 parte 2).
const b = emptyTable(2, 2)
b.cells[0][0].text = 'A'
b.cells[0][1].text = 'B'
b.cells[1][0].text = 'C'
b.cells[1][1].text = 'D'
setRangeBorders(b, { r0: 0, c0: 0, r1: 0, c1: 0 }, { bottom: false })
setRangeBackground(b, { r0: 0, c0: 0, r1: 0, c1: 0 }, '#FF0000')
setColWidth(b, 0, 120)
const latexB = toLatex(b, {
  style: 'standard',
  caption: '',
  label: '',
  centered: false,
  headerRow: true,
  escape: true,
  tabularx: false,
  longtable: false,
})
const latexBx = toLatex(b, {
  style: 'standard',
  caption: '',
  label: '',
  centered: false,
  headerRow: true,
  escape: true,
  tabularx: true,
  longtable: false,
})
const typstB = toTypst(b, {
  caption: '',
  label: '',
  headerRow: true,
  escape: true,
})

console.log('=== LATEX ESTANDAR ===\n' + latexStd)
console.log('\n=== LATEX BOOKTABS ===\n' + latexBook)
console.log('\n=== MARKDOWN ===\n' + md)

const checks: [string, boolean][] = [
  ['std tiene tabular con |l|c|r|', latexStd.includes('\\begin{tabular}{|l|c|r|}')],
  ['std escapa &', latexStd.includes('Carbono \\& co.')],
  ['std escapa _', latexStd.includes('C\\_6')],
  ['std escapa %', latexStd.includes('12.011 \\%')],
  ['std tiene caption', latexStd.includes('\\caption{Masas atómicas}')],
  ['std tiene label', latexStd.includes('\\label{tab:masas}')],
  ['std tiene hline', latexStd.includes('\\hline')],
  ['booktabs tiene toprule', latexBook.includes('\\toprule')],
  ['booktabs tiene midrule', latexBook.includes('\\midrule')],
  ['booktabs tiene bottomrule', latexBook.includes('\\bottomrule')],
  ['booktabs sin barras verticales', !latexBook.includes('|')],
  ['md tiene separador centrado', md.includes(':---:')],
  ['md tiene separador derecha', md.includes('---:')],
  ['md escapa pipe n/a', true],
  ['fusion aceptada', merged === true],
  ['latex fusion usa multicolumn', latexMerged.includes('\\multicolumn{2}{l}{\\textbf{Resultados}}')],
  ['typst tiene table', typst.includes('table(')],
  ['typst tiene header', typst.includes('table.header(')],
  ['typst tiene figure con caption', typst.includes('#figure(') && typst.includes('caption: [Masas atómicas]')],
  ['typst tiene label', typst.includes('<tab:masas>')],
  ['typst fusion usa table.cell', typstMerged.includes('table.cell(colspan: 2,')],
  ['xlsx filas', imported.rows === 3],
  ['xlsx columnas', imported.cols === 2],
  ['xlsx texto', imported.cells[0][0].text === 'Nombre'],
  ['xlsx numero a texto', imported.cells[1][1].text === '1'],
  ['xlsx fusion importada', imported.cells[0][0].colspan === 2],
  ['latex cline parcial', latexB.includes('\\cline{2-2}')],
  ['latex cellcolor', latexB.includes('\\cellcolor[HTML]{FF0000}A')],
  ['latex ancho p-columna', latexB.includes('p{3.17cm}')],
  ['latex tabularx', latexBx.includes('\\begin{tabularx}{\\textwidth}') && latexBx.includes('X')],
  ['typst fill', typstB.includes('fill: rgb("#FF0000")')],
  ['typst ancho pt', typstB.includes('90pt')],
  ['typst sin trazo por bordes parciales', typstB.includes('stroke: none')],
  ['typst hline parcial', typstB.includes('table.hline')],
  ['typst vline parcial', typstB.includes('table.vline')],
]
let failed = 0
for (const [name, ok] of checks) {
  console.log(`${ok ? 'OK  ' : 'FALLO'} ${name}`)
  if (!ok) failed++
}

// Guardar las salidas para compilar el LaTeX en Magi.
const { writeFileSync } = await import('node:fs')
writeFileSync('/tmp/tabla-prueba.tex', latexStd)
writeFileSync('/tmp/tabla-prueba-booktabs.tex', latexBook)
writeFileSync('/tmp/tabla-prueba.md', md)
writeFileSync('/tmp/tabla-prueba.typ', typst)
writeFileSync('/tmp/tabla-prueba-fusion.typ', typstMerged)
writeFileSync('/tmp/tabla-prueba-fusion.tex', latexMerged)
writeFileSync('/tmp/tabla-parte2.tex', latexB)
writeFileSync('/tmp/tabla-parte2-tabularx.tex', latexBx)
writeFileSync('/tmp/tabla-parte2.typ', typstB)
writeFileSync(
  '/tmp/tabla-larga.tex',
  toLatex(t, {
    style: 'standard',
    caption: 'Masas atómicas',
    label: 'tab:masas',
    centered: false,
    headerRow: true,
    escape: true,
    tabularx: false,
    longtable: true,
  }),
)
writeFileSync(
  '/tmp/tabla-larga-booktabs.tex',
  toLatex(t, {
    style: 'booktabs',
    caption: 'Masas atómicas',
    label: 'tab:masas',
    centered: false,
    headerRow: true,
    escape: true,
    tabularx: false,
    longtable: true,
  }),
)
if (failed > 0) process.exit(1)
console.log('\nTodas las comprobaciones pasaron.')
