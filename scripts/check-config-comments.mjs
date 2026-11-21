import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parse as parseHtml } from 'parse5'
import ts from 'typescript'

function lineAt(source, offset) {
  return source.slice(0, offset).split('\n').length
}

function cssCommentOffsets(source) {
  const offsets = []
  let quote = ''
  for (let i = 0; i < source.length; i += 1) {
    if (quote) {
      if (source[i] === '\\') i += 1
      else if (source[i] === quote) quote = ''
    } else if (source[i] === '"' || source[i] === "'") quote = source[i]
    else if (source.slice(i, i + 2) === '/*') {
      offsets.push(i)
      const end = source.indexOf('*/', i + 2)
      i = end < 0 ? source.length : end + 1
    }
  }
  return offsets
}

function scriptCommentOffsets(source) {
  const tree = ts.createSourceFile('inline.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  const offsets = new Set()
  const visit = (node) => {
    for (const range of ts.getLeadingCommentRanges(source, node.pos) ?? []) offsets.add(range.pos)
    for (const range of ts.getTrailingCommentRanges(source, node.end) ?? []) offsets.add(range.pos)
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return [...offsets]
}

function htmlComments(source) {
  const lines = []
  const visit = (node) => {
    if (node.nodeName === '#comment') lines.push(node.sourceCodeLocation.startLine)
    if (node.nodeName === 'script' || node.nodeName === 'style') {
      for (const child of node.childNodes ?? []) {
        if (child.nodeName !== '#text') continue
        const offsets = node.nodeName === 'script' ? scriptCommentOffsets(child.value) : cssCommentOffsets(child.value)
        for (const offset of offsets) lines.push(lineAt(source, child.sourceCodeLocation.startOffset + offset))
      }
    }
    const style = node.attrs?.find((attr) => attr.name === 'style')
    if (style) {
      const start = source.indexOf(style.value, node.sourceCodeLocation.attrs.style.startOffset)
      for (const offset of cssCommentOffsets(style.value)) lines.push(lineAt(source, start + offset))
    }
    for (const child of node.childNodes ?? []) visit(child)
  }
  visit(parseHtml(source, { sourceCodeLocationInfo: true }))
  return [...new Set(lines)].sort((a, b) => a - b)
}

export function findComments(file, source) {
  if (file.endsWith('.html')) return htmlComments(source)
  const lines = []
  let scalarIndent = -1
  let scalarCode = false
  let heredoc = ''
  for (const [index, line] of source.split('\n').entries()) {
    if (heredoc) {
      if (line.trim() === heredoc) heredoc = ''
      continue
    }
    const indent = line.match(/^\s*/)[0].length
    if (scalarIndent >= 0) {
      if (!line.trim() || indent > scalarIndent) {
        if (!scalarCode) continue
      } else {
        scalarIndent = -1
        scalarCode = false
      }
    }
    let quote = ''
    let nextHeredoc = ''
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i]
      if (quote) {
        if (char === '\\') i += 1
        else if (char === quote) quote = ''
      } else if (char === '"' || char === "'") {
        quote = char
      } else if (file.endsWith('.css') && line.slice(i, i + 2) === '/*') {
        lines.push(index + 1)
        break
      } else if (!file.endsWith('.css') && char === '#' && (i === 0 || /\s/.test(line[i - 1]))) {
        lines.push(index + 1)
        break
      } else if (scalarCode && char === '<' && line[i - 1] !== '<' && line.slice(i, i + 2) === '<<') {
        const match = line.slice(i).match(/^<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/)
        if (match) nextHeredoc = match[2]
      }
    }
    if (/\.ya?ml$/.test(file) && /:\s*[|>][+-]?(?:\s+#.*)?$/.test(line)) {
      scalarIndent = indent
      scalarCode = /^\s*run\s*:/.test(line)
    }
    if (nextHeredoc) heredoc = nextHeredoc
  }
  return lines
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'])
    .toString().split('\0').filter((file) => (file === 'Dockerfile' || file === '.env.example' || file === '.gitignore' || file === '.dockerignore' || /\.(?:ya?ml|html|css)$/.test(file)) && existsSync(file))
  const failures = files.flatMap((file) => findComments(file, readFileSync(file, 'utf8')).map((line) => `${file}:${line}`))
  if (failures.length) {
    console.error(`Comments are forbidden (baseline: 0):\n${failures.join('\n')}`)
    process.exitCode = 1
  } else console.log('Config comment lint passed (baseline: 0).')
}
