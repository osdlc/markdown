/**
 * The `sync` verb of the corpus-schema spec (packages/conformance/corpus-schema/SPEC.md): write
 * each parent's copy into `_inherited/<prefix>/`.
 */
import {
  copyFileSync,
  type Dirent,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
} from 'node:fs'
import { dirname, extname, join } from 'node:path'

import {
  entries,
  INHERITED,
  listFiles,
  resolveSource,
  ROOT_FILES,
  sameBytes,
  whyFailed,
} from './inherit.ts'
import { copyFiles, type Data, load, readData } from './validate.ts'

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
   * `extends`, a parent with errors, or `_inherited/` itself a symbolic link, nothing is written.
   */
  errors: string[]
}

const isLink = (abs: string): boolean => {
  try {
    return lstatSync(abs).isSymbolicLink()
  } catch {
    return false
  }
}

const isDir = (abs: string): boolean => {
  try {
    return lstatSync(abs).isDirectory()
  } catch {
    return false
  }
}

/** The first part of `rel`'s path under `base` that is a symbolic link, as `_inherited/...`. */
function linkOnPath(base: string, rel: string): string | undefined {
  const parts = rel.split('/')
  for (let i = 1; i <= parts.length; i++) {
    const sub = parts.slice(0, i).join('/')
    if (isLink(join(base, sub))) return `${INHERITED}/${sub}`
  }
  return undefined
}

/** Remove each empty folder at or below `abs`, deepest first. Symbolic links are not followed. */
function pruneEmpty(abs: string): void {
  let names: Dirent[]
  try {
    names = entries(abs)
  } catch {
    return
  }
  for (const d of names) if (d.isDirectory()) pruneEmpty(join(abs, d.name))
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
 * `_inherited/` is written: a symbolic link in it is an error, and is not followed.
 *
 * Every problem is a line in the report's `errors`, never a throw. When the root file or its
 * `extends` has an error, or a parent has errors of its own, nothing is written.
 */
export function syncCorpus(root: string): SyncReport {
  const c = load(root)
  const report: SyncReport = { root, name: c.name, written: [], removed: [], errors: [...c.fatal] }
  if (c.fatal.length > 0) return report

  const base = join(root, INHERITED)
  const linked = `: (symlink): sync does not write through a symbolic link; remove it`
  if (isLink(base)) {
    report.errors.push(`${INHERITED}${linked}`)
    return report
  }
  const wanted = new Map<string, string>()
  for (const [prefix, parent] of c.parents)
    for (const f of copyFiles(parent)) wanted.set(`${prefix}/${f}`, join(parent.root, f))

  for (const f of listFiles(base)) {
    if (wanted.has(f)) continue
    try {
      rmSync(join(base, f))
      report.removed.push(`${INHERITED}/${f}`)
    } catch (e) {
      report.errors.push(`${INHERITED}/${f}: (file): cannot remove (${whyFailed(e)})`)
    }
  }
  // A parent that turned a folder into a file leaves that folder empty here, or holding only
  // files a corpus skips, such as `.DS_Store`.
  pruneEmpty(base)
  const links = new Set<string>()
  for (const [f, from] of [...wanted].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const to = join(base, f)
    const link = linkOnPath(base, f)
    if (link !== undefined) {
      if (!links.has(link)) report.errors.push(`${link}${linked}`)
      links.add(link)
      continue
    }
    if (sameBytes(from, to)) continue
    try {
      if (isDir(to)) rmSync(to, { recursive: true })
      mkdirSync(dirname(to), { recursive: true })
      copyFileSync(from, to)
      report.written.push(`${INHERITED}/${f}`)
    } catch (e) {
      report.errors.push(`${INHERITED}/${f}: (file): cannot write (${whyFailed(e)})`)
    }
  }
  pruneEmpty(base)
  return report
}

/**
 * The real paths of the parents the corpus at `root` names in `extends` that resolve. Reads only
 * the root file, to order a `sync` of several corpora.
 */
export function parentRoots(root: string): string[] {
  let data: Data
  try {
    const names = readdirSync(root)
    const file = ROOT_FILES.find((f) => names.includes(f))
    if (file === undefined) return []
    data = readData(readFileSync(join(root, file), 'utf8'), extname(file))
  } catch {
    return []
  }
  const map = data['extends']
  if (map === null || typeof map !== 'object') return []
  return Object.values(map).flatMap((source) => {
    const r = typeof source === 'string' ? resolveSource(root, source) : undefined
    return r !== undefined && 'dir' in r ? [r.dir] : []
  })
}
