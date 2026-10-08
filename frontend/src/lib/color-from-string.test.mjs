// Unit test for lib/color-from-string.ts — run: npm run test:unit
// (node:test + Node's built-in TypeScript type stripping; no test framework dependency.)
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { colorFromString, hashString, PALETTE, PALETTE_CLASSES } from './color-from-string.ts'

const SAMPLES = [
  'Microsoft', 'Amazon', 'Google', 'Apple', 'Meta', 'Netflix', 'Tesla', 'Tech Solutions Inc',
  'Digital Marketing Pro', 'Creative Design Studio', 'microsoft.com', 'aws.amazon.com', '', 'Ünïcødé ✓',
]

test('the same input always yields the same colour', () => {
  for (const value of SAMPLES) {
    const first = colorFromString(value)
    for (let i = 0; i < 50; i++) assert.equal(colorFromString(value), first, value)
  }
})

test('it is case- and surrounding-space-insensitive', () => {
  assert.equal(colorFromString('Microsoft'), colorFromString('  microsoft '))
  assert.equal(colorFromString('AWS.Amazon.com'), colorFromString('aws.amazon.com'))
})

test('the output is always one of the five palette tokens', () => {
  for (let i = 0; i < 5000; i++) assert.ok(PALETTE.includes(colorFromString(`value-${i}-${i * 7919}`)))
  for (const value of SAMPLES) assert.ok(PALETTE.includes(colorFromString(value)))
})

test('the hash spreads values over every colour (no colour is starved)', () => {
  const counts = Object.fromEntries(PALETTE.map((c) => [c, 0]))
  for (let i = 0; i < 5000; i++) counts[colorFromString(`company ${i}`)]++
  for (const color of PALETTE) assert.ok(counts[color] > 800 && counts[color] < 1200, `${color}: ${counts[color]}`)
})

test('hashString is a stable 32-bit FNV-1a (fixed vectors)', () => {
  assert.equal(hashString(''), 0x811c9dc5)
  assert.equal(hashString('a'), 0xe40c292c)
  assert.equal(hashString('foobar'), 0xbf9cf968)
})

test('every palette class is a design-system token that exists in globals.css, light and dark', () => {
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
  for (const color of PALETTE) {
    for (const token of [`--stat-${color}:`, `--stat-${color}-label:`]) {
      assert.ok(css.split(token).length - 1 >= 2, `${token} must be defined for light and dark`)
    }
    assert.match(PALETTE_CLASSES[color].soft, new RegExp(`^bg-stat-${color} text-stat-${color}-label$`))
  }
})
