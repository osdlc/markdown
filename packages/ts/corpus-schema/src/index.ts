/**
 * Find the corpora that hold a corpus-schema root file, validate them against version 0 of the
 * corpus-schema spec (packages/conformance/corpus-schema/SPEC.md), and sync the copies of the
 * corpora they extend.
 */
export { type CorpusReport, type Data, findCorpora, idProblem, validateCorpus } from './validate.ts'
export { type SyncReport, syncCorpus } from './sync.ts'
export { encodePath, fold, markdownLink } from './links.ts'
