// Regenerates src/api/types.ts from the running backend's OpenAPI spec.
// Usage: start the backend, then `npm run gen:api` (override with API_DOCS_URL=...).
import { writeFileSync } from 'node:fs'

const url = process.env.API_DOCS_URL ?? 'http://localhost:8080/api/v1/v3/api-docs'
const docs = await (await fetch(url)).json()
const schemas = docs.components.schemas

function ts(p) {
  if (p.$ref) return p.$ref.split('/').pop()
  if (p.enum) return p.enum.map((e) => `'${e}'`).join(' | ')
  if (p.type === 'array') return p.items.enum ? `(${ts(p.items)})[]` : `${ts(p.items)}[]`
  if (p.type === 'integer' || p.type === 'number') return 'number'
  if (p.type === 'boolean') return 'boolean'
  if (p.type === 'object') return 'Record<string, unknown>'
  return 'string'
}

const out = ['// Generated from the backend OpenAPI spec (/v3/api-docs) by scripts/gen-api-types.mjs. Do not edit by hand.', '']
for (const name of Object.keys(schemas).sort()) {
  const s = schemas[name]
  const required = new Set(s.required ?? [])
  out.push(`export interface ${name} {`)
  for (const [key, value] of Object.entries(s.properties ?? {})) {
    out.push(`  ${key}${required.has(key) ? '' : '?'}: ${ts(value)};`)
  }
  out.push('}\n')
}
writeFileSync(new URL('../src/api/types.ts', import.meta.url), out.join('\n'))
console.log(`${Object.keys(schemas).length} types written to src/api/types.ts`)
