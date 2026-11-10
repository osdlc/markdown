/**
 * Finding a corpus's parents (the corpus-schema spec's Extends section,
 * packages/conformance/corpus-schema/SPEC.md): resolving an `extends` source to a folder, and
 * listing the files of an `_inherited/` copy.
 */
import { type Dirent, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'

/** The folder at a corpus's root that holds the copies of its parents. */
export const INHERITED = '_inherited'
/** A prefix in `extends`: lowercase letters, digits and `-`. */
export const PREFIX = /^[a-z0-9-]+$/
export const ROOT_FILES = ['corpus-schema.md', 'corpus-schema.yaml', 'corpus-schema.json']

const PACKAGE_NAME = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/

/** `s` on one line, so each problem stays one line. */
export const oneLine = (s: string): string => s.replace(/\s*\r?\n\s*/g, ' ').trim()
/** Why a file or folder could not be read or written: its error code, such as EACCES, or the message. */
export const whyFailed = (e: unknown): string =>
  (e as NodeJS.ErrnoException).code ?? oneLine((e as Error).message)

export const skipped = (name: string): boolean => name.startsWith('.') || name === 'node_modules'
export const entries = (abs: string): Dirent[] => readdirSync(abs, { withFileTypes: true })
// Exact names: existsSync ignores case on macOS and Windows.
export const hasRootFile = (names: Dirent[]): boolean =>
  names.some((d) => d.isFile() && ROOT_FILES.includes(d.name))

const isDir = (abs: string): boolean => {
  try {
    return statSync(abs).isDirectory()
  } catch {
    return false
  }
}

/** The folder a package named `name` is installed in, found as Node finds it from `root`. */
function findPackage(root: string, name: string): string | undefined {
  // createRequire takes only an absolute path.
  const paths = createRequire(join(resolve(root), 'package.json')).resolve.paths(name) ?? []
  return paths.map((p) => join(p, name)).find((dir) => isDir(dir))
}

/**
 * The corpus folder an `extends` source names, from the corpus at `root`, as a real path. A
 * source starting `./` or `../` is a path from `root`. Anything else is a package name: the
 * package's folder, or the folder its package.json's `corpus` field names. The folder must hold a
 * root file.
 */
export function resolveSource(root: string, source: string): { dir: string } | { problem: string } {
  let dir: string
  if (source.startsWith('./') || source.startsWith('../')) {
    dir = resolve(root, source)
    if (!isDir(dir)) return { problem: `${source}: no such folder` }
  } else {
    if (!PACKAGE_NAME.test(source))
      return { problem: `${source}: not a package name, nor a path starting ./ or ../` }
    const pkg = findPackage(root, source)
    if (pkg === undefined) return { problem: `package ${source} is not installed` }
    let corpus: unknown
    try {
      corpus = (JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8')) as { corpus?: unknown })
        .corpus
    } catch (e) {
      // A package with no package.json has no corpus field.
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT')
        return { problem: `package ${source}: cannot read its package.json (${whyFailed(e)})` }
    }
    if (corpus !== undefined && (typeof corpus !== 'string' || corpus === ''))
      return { problem: `package ${source}: its "corpus" field must be a folder path` }
    dir = corpus === undefined ? pkg : resolve(pkg, corpus)
    if (!isDir(dir)) return { problem: `package ${source}: its "corpus" folder does not exist` }
  }
  dir = realpathSync(dir)
  let names: Dirent[]
  try {
    names = entries(dir)
  } catch {
    return { problem: `${source}: cannot read folder` }
  }
  if (!hasRootFile(names)) return { problem: `${source}: holds no corpus-schema root file` }
  return { dir }
}

/** Whether the files at `a` and `b` hold the same bytes. False when either cannot be read. */
export const sameBytes = (a: string, b: string): boolean => {
  try {
    return readFileSync(a).equals(readFileSync(b))
  } catch {
    return false
  }
}

/**
 * Every file at or below `abs`, relative and with `/`, sorted. Paths with a `.` component or
 * `node_modules`, and symbolic links, are left out, as from a corpus. A folder that cannot be read
 * is left out too.
 */
export function listFiles(abs: string): string[] {
  const out: string[] = []
  const visit = (rel: string): void => {
    let names: Dirent[]
    try {
      names = entries(join(abs, rel))
    } catch {
      return
    }
    for (const d of names) {
      if (skipped(d.name)) continue
      const path = rel === '' ? d.name : `${rel}/${d.name}`
      if (d.isFile()) out.push(path)
      else if (d.isDirectory()) visit(path)
    }
  }
  visit('')
  return out.sort()
}
