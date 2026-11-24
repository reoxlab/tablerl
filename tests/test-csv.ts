// Prueba del exportador CSV (v1.1.0): separador punto y coma, entrecomillado
// de campos con separador, comillas o saltos de línea, y celdas cubiertas
// por una fusión que salen vacías. Se corre con esbuild, igual que los
// demás tests.
import { emptyTable, mergeCells } from '../src/model'
import { toCsv } from '../src/exporters/csv'

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

const t = emptyTable(3, 3)
t.cells[0][0].text = 'Nombre'
t.cells[0][1].text = 'Edad'
t.cells[0][2].text = 'Nota'
t.cells[1][0].text = 'Ana'
t.cells[1][1].text = '28'
t.cells[1][2].text = '9,5'
t.cells[2][0].text = 'Luis; el "jefe"'
t.cells[2][1].text = '31'
t.cells[2][2].text = 'línea1\nlínea2'

check(
  'separador punto y coma',
  toCsv(t, { delimiter: ';' }).split('\n')[0] === 'Nombre;Edad;Nota',
)
check(
  'coma decimal no entrecomilla',
  toCsv(t, { delimiter: ';' }).split('\n')[1] === 'Ana;28;9,5',
)
check(
  'campo con ; y comillas se entrecomilla y duplica',
  toCsv(t, { delimiter: ';' }) ===
    'Nombre;Edad;Nota\nAna;28;9,5\n"Luis; el ""jefe""";31;"línea1\nlínea2"',
  toCsv(t, { delimiter: ';' }),
)

const m = emptyTable(2, 2)
m.cells[0][0].text = 'A'
m.cells[0][1].text = 'B'
mergeCells(m, { r0: 0, c0: 0, r1: 0, c1: 1 })
check(
  'celda cubierta por fusión sale vacía',
  toCsv(m, { delimiter: ';' }).split('\n')[0] === 'A;',
)

const e = emptyTable(1, 1)
check('tabla vacía', toCsv(e, { delimiter: ';' }) === '')

if (failed > 0) process.exit(1)
console.log('\nTodas las comprobaciones pasaron.')
