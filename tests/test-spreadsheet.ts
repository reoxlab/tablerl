// Prueba del importador de hojas de cálculo (v1.1.0): libros con varias
// hojas (se elige cuál importar), fusiones, y lectura de ODS además de
// XLSX. Se corre con esbuild, igual que los demás tests.
import * as XLSX from 'xlsx'
import { loadSpreadsheet } from '../src/importers/spreadsheet'

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

function makeFile(bytes: Uint8Array, name: string): File {
  // File no existe en Node 18 sin flags: se pasa un objeto con el método
  // que usa el importador (arrayBuffer), con el tipo de File.
  return {
    name,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  } as unknown as File
}

function buildWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  const s1 = XLSX.utils.aoa_to_sheet([
    ['A', 'B'],
    [1, 2],
  ])
  s1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }]
  const s2 = XLSX.utils.aoa_to_sheet([
    ['X', 'Y', 'Z'],
    ['hola', 'mundo', '!'],
  ])
  XLSX.utils.book_append_sheet(wb, s1, 'Primera')
  XLSX.utils.book_append_sheet(wb, s2, 'Segunda')
  return wb
}

const xlsxBytes = new Uint8Array(
  XLSX.write(buildWorkbook(), { bookType: 'xlsx', type: 'array' }) as ArrayBuffer,
)
const book = await loadSpreadsheet(makeFile(xlsxBytes, 'prueba.xlsx'))
check(
  'lista las hojas en orden',
  JSON.stringify(book.sheetNames) === JSON.stringify(['Primera', 'Segunda']),
  book.sheetNames.join(','),
)
const second = book.importSheet('Segunda')
check('segunda hoja: 2 × 3', second.rows === 2 && second.cols === 3)
check('segunda hoja: contenido', second.cells[1][0].text === 'hola' && second.cells[1][2].text === '!')
const first = book.importSheet('Primera')
check('primera hoja: fusión aplicada', first.cells[0][0].colspan === 2)
check('primera hoja: celda cubierta vacía', first.cells[0][1].coveredBy !== null)

let threw = false
try {
  book.importSheet('NoExiste')
} catch {
  threw = true
}
check('hoja inexistente lanza error', threw)

// ODS: mismo libro, escrito como .ods, se lee igual.
const odsBytes = new Uint8Array(
  XLSX.write(buildWorkbook(), { bookType: 'ods', type: 'array' }) as ArrayBuffer,
)
const odsBook = await loadSpreadsheet(makeFile(odsBytes, 'prueba.ods'))
check(
  'ODS lista las hojas',
  JSON.stringify(odsBook.sheetNames) === JSON.stringify(['Primera', 'Segunda']),
  odsBook.sheetNames.join(','),
)
check(
  'ODS segunda hoja: contenido',
  odsBook.importSheet('Segunda').cells[1][1].text === 'mundo',
)

if (failed > 0) process.exit(1)
console.log('\nTodas las comprobaciones pasaron.')
