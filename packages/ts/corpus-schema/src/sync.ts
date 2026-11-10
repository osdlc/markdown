/**
 * The `sync` verb of the corpus-schema spec (packages/conformance/corpus-schema/SPEC.md): write
 * each parent's copy into `_inherited/<prefix>/`.
 */
import { copyFileSync, mkdirSync, readdirSync, rmdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { INHERITED, listFiles, sameBytes } from './inherit.ts'
import { copyFiles, load } from './validate.ts'

/** What `syncCorpus` did to one corpus. */
export interface SyncReport {
  /** The corpus folder, as passed to `syncCorpus`. */
  root: string
  /** The corpus's name: its folder name. */
  name: string
  /** The corpus-relative paths of the files written under `_inherited/`. */
  written: string[]
  /** The corpus-relative paths of the files removed from `_inherited/`. */
  removed: string[]
  /**
   * One line per error, in the form `validateCorpus` uses. With an error in the root file or its
   * `extends`, nothing is written.
   */
  errors: string[]
}

const why = (e: unknown): string => (e as NodeJS.ErrnoException).code ?? (e as Error).message

/** Remove each empty folder at or below `abs`, deepest first. */
function pruneEmpty(abs: string): void {
  let names: string[]
  try {
    names = readdirSync(abs)
  } catch {
    return
  }
  for (const name of names) pruneEmpty(join(abs, name))
  try {
    if (readdirSync(abs).length === 0) rmdirSync(abs)
  } catch {
    // A file, or a folder that cannot be read: left as it is.
  }
}

/**
 * Make the corpus at `root` hold a copy of each parent its root file's `extends` names, in
 * `_inherited/<prefix>/`: the parent's files and its own `_inherited/`, byte for byte. Files under
 * `_inherited/` that no parent holds are removed. A second run changes nothing. Only
 * `_inherited/` is written.
 *
 * Every problem is a line in the report's `errors`, never a throw. When the root file or its
 * `extends` has an error, nothing is written.
 */
export function syncCorpus(root: string): SyncReport {
  const c = load(root)
  const report: SyncReport = { root, name: c.name, written: [], removed: [], errors: c.fatal }
  if (c.fatal.length > 0) return report

  const base = join(root, INHERITED)
  const wanted = new Map<string, string>()
  for (const [prefix, parent] of c.parents)
    for (const f of copyFiles(parent)) wanted.set(`${prefix}/${f}`, join(parent.root, f))

  for (const f of listFiles(base)) {
    if (wanted.has(f)) continue
    try {
      rmSync(join(base, f))
      report.removed.push(`${INHERITED}/${f}`)
    } catch (e) {
      report.errors.push(`${INHERITED}/${f}: (file): cannot remove (${why(e)})`)
    }
  }
  for (const [f, from] of [...wanted].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const to = join(base, f)
    if (sameBytes(from, to)) continue
    try {
      mkdirSync(dirname(to), { recursive: true })
      copyFileSync(from, to)
      report.written.push(`${INHERITED}/${f}`)
    } catch (e) {
      report.errors.push(`${INHERITED}/${f}: (file): cannot write (${why(e)})`)
    }
  }
  pruneEmpty(base)
  return report
}

/** The real paths of the parents the corpus at `root` names in `extends` that resolve. */
export const parentRoots = (root: string): string[] =>
  [...load(root).parents.values()].map((p) => p.real)
