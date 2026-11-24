// Prueba del envoltorio para Overleaf: el documento completo lleva los
// paquetes que la tabla necesita y el fragmento tal cual (sin las notas).
import { wrapForOverleaf } from '../src/overleaf'

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

const plain = `\\begin{tabular}{ll}
A & B \\\\
\\end{tabular}`
const docPlain = wrapForOverleaf(plain)
check('básico: documentclass y document', docPlain.includes('\\documentclass{article}') && docPlain.includes('\\begin{document}'))
check('básico: fragmento dentro', docPlain.includes(plain))
check('básico: sin paquetes extra', !docPlain.includes('booktabs') && !docPlain.includes('multirow'))

const rich = `% Nota: esta tabla necesita en el preámbulo: \\usepackage{multirow}, \\usepackage{tabularx}, \\usepackage{array}.
% Nota: esta tabla usa colores de fondo — añade \\usepackage[table]{xcolor} al preámbulo.
\\begin{tabularx}{\\textwidth}{|>{\\centering\\arraybackslash}X|l|}
\\multirow{2}{*}{A} & \\cellcolor[HTML]{FFEEDD}B \\\\
\\end{tabularx}`
const docRich = wrapForOverleaf(rich)
check('rico: multirow', docRich.includes('\\usepackage{multirow}'))
check('rico: tabularx', docRich.includes('\\usepackage{tabularx}'))
check('rico: array', docRich.includes('\\usepackage{array}'))
check('rico: xcolor', docRich.includes('\\usepackage[table]{xcolor}'))
check('rico: notas fuera del documento', !docRich.includes('% Nota:'))
check('rico: fragmento dentro', docRich.includes('\\multirow{2}{*}{A}'))

const long = `\\begin{longtable}{ll}
A & B \\\\
\\end{longtable}`
check('longtable: paquete', wrapForOverleaf(long).includes('\\usepackage{longtable}'))

const book = `\\begin{tabular}{ll}
\\toprule
A & B \\\\
\\midrule
C & D \\\\
\\bottomrule
\\end{tabular}`
check('booktabs: paquete', wrapForOverleaf(book).includes('\\usepackage{booktabs}'))

console.log(`\n${passed} pasadas, ${failed} fallidas`)
if (failed > 0) process.exit(1)
