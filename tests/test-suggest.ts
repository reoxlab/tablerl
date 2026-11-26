// Prueba del buzón de sugerencias (v1.2.0, rl-suggest): asunto, enlace
// mailto codificado con caracteres especiales y estilos theme-aware.
// Se corre con esbuild + node, igual que los demás tests.
import assert from 'node:assert/strict'
import {
  SUGGEST_STYLE,
  buildSuggestMailto,
  suggestSubject,
} from 'rl-suggest'

let count = 0
function test(name: string, fn: () => void): void {
  fn()
  count++
  console.log(`ok ${count} - ${name}`)
}

test('suggestSubject genera [Sugerencia TableRL]', () => {
  assert.equal(suggestSubject('TableRL'), '[Sugerencia TableRL]')
})

test('buildSuggestMailto prefijo y cuerpo codificado', () => {
  const url = buildSuggestMailto('TableRL', 'Mejora X')
  const expectedPrefix =
    'mailto:contacto@reoxlab.com?subject=%5BSugerencia%20TableRL%5D&body='
  assert.ok(url.startsWith(expectedPrefix), `prefijo inesperado: ${url}`)
  assert.equal(url, expectedPrefix + encodeURIComponent('Mejora X'))
})

test('buildSuggestMailto codifica &, acentos y saltos de línea sin romper subject ni body', () => {
  const texto = 'Más opciones & diseño\nSegunda línea con ñ y áéíóú'
  const url = buildSuggestMailto('TableRL', texto)
  const expectedPrefix =
    'mailto:contacto@reoxlab.com?subject=%5BSugerencia%20TableRL%5D&body='
  assert.ok(url.startsWith(expectedPrefix), `prefijo inesperado: ${url}`)

  const query = url.slice(url.indexOf('?') + 1)
  const parts = query.split('&')
  assert.equal(parts.length, 2, 'el carácter & del texto no debe crear nuevos parámetros')

  const [subjectParam, bodyParam] = parts
  assert.ok(subjectParam.startsWith('subject='))
  assert.ok(bodyParam.startsWith('body='))
  assert.equal(decodeURIComponent(subjectParam.slice('subject='.length)), '[Sugerencia TableRL]')
  assert.equal(decodeURIComponent(bodyParam.slice('body='.length)), texto)
  assert.ok(bodyParam.includes('%26'), 'el carácter & debe ir codificado como %26')
  assert.ok(bodyParam.includes('%0A'), 'el salto de línea debe ir codificado como %0A')
})

test('SUGGEST_STYLE incluye .rl-suggest y var(--borde', () => {
  assert.ok(SUGGEST_STYLE.includes('.rl-suggest'), 'falta selector .rl-suggest')
  assert.ok(SUGGEST_STYLE.includes('var(--borde'), 'falta variable CSS var(--borde')
})

console.log('\nTodas las comprobaciones pasaron.')
