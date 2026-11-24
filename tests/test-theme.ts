// Prueba de los temas claro / oscuro / sistema (v1.1.0): resolución según
// la elección guardada y la preferencia del sistema, y persistencia en
// localStorage. Se corre con esbuild, igual que los demás tests.
import {
  THEME_KEY,
  loadThemeChoice,
  resolveTheme,
  saveThemeChoice,
} from '../src/theme'

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

check('sistema + oscuro → oscuro', resolveTheme('system', true) === 'dark')
check('sistema + claro → claro', resolveTheme('system', false) === 'light')
check('oscuro explícito manda', resolveTheme('dark', false) === 'dark')
check('claro explícito manda', resolveTheme('light', true) === 'light')

const store = new Map<string, string>()
const fakeStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    store.set(k, v)
  },
  removeItem: (k: string) => {
    store.delete(k)
  },
}

check('sin guardar → sistema', loadThemeChoice(fakeStorage) === 'system')
saveThemeChoice(fakeStorage, 'dark')
check('guarda y lee oscuro', loadThemeChoice(fakeStorage) === 'dark')
check('clave esperada', store.get(THEME_KEY) === 'dark')
store.set(THEME_KEY, 'basura')
check('valor inválido → sistema', loadThemeChoice(fakeStorage) === 'system')

if (failed > 0) process.exit(1)
console.log('\nTodas las comprobaciones pasaron.')
