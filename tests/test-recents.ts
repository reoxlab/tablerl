// Prueba de las tablas recientes y el autoguardado con un almacenamiento
// en memoria (la misma interfaz que localStorage).
import { emptyTable } from '../src/model'
import {
  autosave,
  deleteRecent,
  deriveName,
  loadAutosave,
  loadRecents,
  saveRecent,
} from '../src/recents'

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

function memoryStorage(): {
  getItem(k: string): string | null
  setItem(k: string, v: string): void
  removeItem(k: string): void
} {
  const data = new Map<string, string>()
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v)
    },
    removeItem: (k) => {
      data.delete(k)
    },
  }
}

const storage = memoryStorage()
check('vacío al inicio', loadRecents(storage).length === 0)
check('sin autoguardado al inicio', loadAutosave(storage) === null)

const t = emptyTable(2, 2)
t.cells[0][0].text = 'Nombre'
t.cells[0][1].text = 'Valor'
t.cells[1][0].text = 'A'
t.cells[1][1].text = '1'

let list = saveRecent(storage, t, 'Mi tabla', 'tab:mi')
check('guardar una copia', list.length === 1)
check('nombre del título', list[0].name === 'Mi tabla')
check('título y etiqueta guardados', list[0].caption === 'Mi tabla' && list[0].label === 'tab:mi')
check('modelo guardado', list[0].model.cells[1][0].text === 'A')

// Guardar la misma tabla no duplica: actualiza la fecha.
list = saveRecent(storage, t, 'Mi tabla', 'tab:mi')
check('sin duplicados', list.length === 1)

// Seis copias distintas: se queda con las 5 más recientes.
for (let i = 0; i < 6; i++) {
  const copy = emptyTable(1, 1)
  copy.cells[0][0].text = `Tabla ${i}`
  saveRecent(storage, copy, '', '')
}
list = loadRecents(storage)
check('tope de 5', list.length === 5)
check('la más reciente primero', list[0].name === 'Tabla 5')
check('la más vieja se descarta', list.every((e) => e.name !== 'Tabla 0'))

// Borrar una copia.
const id = list[0].id
list = deleteRecent(storage, id)
check('borrar', list.length === 4 && list.every((e) => e.id !== id))

// Nombres: primera celda si no hay título; genérico si está vacía.
const named = emptyTable(2, 2)
named.cells[1][0].text = 'Primer dato'
check('nombre de la primera celda', deriveName(named, '') === 'Primer dato')
check('nombre genérico', deriveName(emptyTable(1, 1), '') === 'Tabla sin título')

// Autoguardado.
autosave(storage, t, 'Mi tabla', 'tab:mi')
const auto = loadAutosave(storage)
check('autoguardado legible', auto !== null && auto.model.cells[1][1].text === '1')
check('autoguardado con título', auto?.caption === 'Mi tabla')

// Datos corruptos no rompen nada.
storage.setItem('tablex-recents-v1', 'esto no es json')
check('recientes corruptos → vacío', loadRecents(storage).length === 0)
storage.setItem('tablex-autosave-v1', '{"model": "roto"}')
check('autoguardado corrupto → null', loadAutosave(storage) === null)

console.log(`\n${passed} pasadas, ${failed} fallidas`)
if (failed > 0) process.exit(1)
