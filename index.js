// dsh-plugin-builder DSH bundle: registers the dsh-plugin-builder agent skill
// on ctx.skills so sessions can load it through the skill tool. The skill body
// lives in skills/dsh-plugin-builder/ (SKILL.md + references + example) and is
// also usable outside DSH via the agent-skills CLI.

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-plugin-builder'

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

function parseFrontmatter(raw) {
  const match = raw.match(FRONTMATTER)
  if (match === null) return undefined
  const fields = {}
  for (const line of match[1].split(/\r?\n/)) {
    const entry = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*([\s\S]*)$/)
    if (entry === null) continue
    let value = entry[2].trim()
    const quoted = value.match(/^(["'])([\s\S]*)\1$/)
    if (quoted !== null) value = quoted[2]
    fields[entry[1]] = value
  }
  return fields
}

/**
 * Register the bundled skill on ctx.skills.
 * @returns the effect factory for ctx.effect, or undefined when the service is absent.
 */
export function registerSkillEffect(ctx, log = () => {}) {
  const skills = ctx.get('skills')
  if (skills === undefined || typeof skills.register !== 'function') {
    log('skills service unavailable; dsh-plugin-builder skill not registered')
    return undefined
  }
  const dir = join(dirname(fileURLToPath(import.meta.url)), 'skills', 'dsh-plugin-builder')
  const file = join(dir, 'SKILL.md')
  if (!existsSync(file)) {
    log(`skill file "${file}" missing; dsh-plugin-builder skill not registered`)
    return undefined
  }
  const raw = readFileSync(file, 'utf8')
  const fields = parseFrontmatter(raw)
  if (fields === undefined || typeof fields.description !== 'string' || fields.description === '') {
    log(`skill file "${file}" has no usable frontmatter; dsh-plugin-builder skill not registered`)
    return undefined
  }
  const body = raw.slice(raw.match(FRONTMATTER)[0].length)
  const registration = {
    name: 'dsh-plugin-builder',
    description: fields.description,
    ...(typeof fields.version === 'string' ? { version: fields.version } : {}),
    content: body.trimEnd(),
    source: 'bundled',
    provider: 'dsh-plugin-builder',
    path: file,
    resourceBase: { kind: 'directory', path: dir },
    metadata: { origin: 'chrischjh/dsh-plugin-builder' },
  }
  return () => skills.register(registration)
}

export function apply(ctx, config = {}, log = () => {}) {
  const effect = registerSkillEffect(ctx, log)
  if (effect !== undefined) ctx.effect(effect, 'dsh-plugin-builder skill')
}
