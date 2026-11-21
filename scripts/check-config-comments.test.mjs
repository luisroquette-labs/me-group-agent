import assert from 'node:assert/strict'
import { findComments } from './check-config-comments.mjs'

assert.deepEqual(findComments('config.yml', 'url: "https://example.com/#part"\n# note\n'), [2])
assert.deepEqual(findComments('config.yml', 'description: |\n  # literal\nrun: |\n  # shell comment\n'), [4])
assert.deepEqual(findComments('config.yml', 'run: |\n  cat <<EOF\n  # literal\n  EOF\n  # shell comment\n'), [5])
assert.deepEqual(findComments('Dockerfile', 'FROM node:20\n# note\n'), [2])
assert.deepEqual(findComments('docs/index.html', '<style>p{content:"/*"}</style>\n<!-- note -->\n'), [2])
assert.deepEqual(findComments('docs/index.html', '<script>\n// hidden comment\n</script>\n'), [2])
assert.deepEqual(findComments('docs/index.html', '<script>const url = "https://example.com"</script>\n'), [])
assert.deepEqual(findComments('docs/index.html', '<script>const url = `https://example.com`</script>\n'), [])
assert.deepEqual(findComments('docs/index.html', '<script>\nconst url = `\nhttps://example.com\n`;\n</script>\n'), [])
assert.deepEqual(findComments('docs/index.html', '<script>// comment</script>\n<a href="https://example.com">link</a>\n'), [1])
assert.deepEqual(findComments('docs/index.html', '<script>/* comment */</script>\n<p>https://example.com</p>\n'), [1])
assert.deepEqual(findComments('docs/index.html', '<script>const x = `a ${1 /* comment */}`</script>\n'), [1])
assert.deepEqual(findComments('docs/index.html', '<script>const pattern = /https?:\\/\\//</script>\n'), [])
assert.deepEqual(findComments('docs/index.html', '<div data-example="/* literal */">text</div>\n'), [])
assert.deepEqual(findComments('docs/index.html', '<div>hi</div>\n<!-- unclosed\n'), [2])
assert.deepEqual(findComments('docs/index.html', '<p style="content:\'/*\';color:red">text</p>\n'), [])
assert.deepEqual(findComments('docs/index.html', '<p style="color:red;/* note */">text</p>\n'), [1])

console.log('Config comment scanner tests passed.')
