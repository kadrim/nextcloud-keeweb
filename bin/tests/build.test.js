const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { test } = require('node:test')

function fixture(t) {
	const root = mkdtempSync(path.join(os.tmpdir(), 'keeweb-build-'))
	t.after(() => rmSync(root, { recursive: true, force: true }))
	for (const dir of ['bin', 'tools', 'keeweb-source', 'keeweb/templates']) {
		mkdirSync(path.join(root, dir), { recursive: true })
	}
	copyFileSync(path.join(__dirname, '../build'), path.join(root, 'bin/build'))
	writeFileSync(path.join(root, 'keeweb-version'), 'test-version\n')
	for (const name of ['mock_codesignconfig', 'default_settings', 'updater']) {
		writeFileSync(path.join(root, `${name}.patch`), '')
	}
	writeFileSync(path.join(root, 'tools/git'), '#!/bin/bash\nexit 0\n', { mode: 0o755 })
	writeFileSync(path.join(root, 'tools/npm'), `#!/bin/bash
echo "npm $*" >> "$CALLS"
if [[ "$*" != install ]]; then
  echo "unexpected npm command: $*" >&2
  exit 99
fi
if [[ "\${FAIL_INSTALL:-}" == 1 ]]; then
  echo "simulated install failure" >&2
  exit 42
fi
`, { mode: 0o755 })
	writeFileSync(path.join(root, 'tools/npx'), `#!/bin/bash
echo "npx $*" >> "$CALLS"
echo "NODE_OPTIONS=$NODE_OPTIONS" >> "$CALLS"
mkdir -p dist
echo '<html><script>app()</script></html>' > dist/index.html
echo 'worker()' > dist/service-worker.js
`, { mode: 0o755 })
	const calls = path.join(root, 'calls')
	return {
		root,
		run(extraEnv = {}) {
			return spawnSync('bash', [path.join(root, 'bin/build')], {
				cwd: os.tmpdir(),
				encoding: 'utf8',
				env: {
					...process.env,
					PATH: `${path.join(root, 'tools')}:${process.env.PATH}`,
					CALLS: calls,
					...extraEnv,
				},
			})
		},
		calls: () => existsSync(calls) ? readFileSync(calls, 'utf8').trim().split('\n') : [],
	}
}

test('installs legacy upstream dependencies once, then builds and copies the templates', t => {
	const f = fixture(t)
	const result = f.run()
	assert.equal(result.status, 0, result.stderr)
	assert.deepEqual(f.calls(), [
		'npm install',
		'npx grunt build-web-app --skip-sign --force',
		'NODE_OPTIONS=--openssl-legacy-provider',
	])
	assert.match(readFileSync(path.join(f.root, 'keeweb/templates/keeweb.php'), 'utf8'), /<script nonce=/)
	assert.equal(readFileSync(path.join(f.root, 'keeweb/templates/service-worker.js'), 'utf8'), 'worker()\n')
})

test('stops before building or copying templates when dependency installation fails', t => {
	const f = fixture(t)
	const result = f.run({ FAIL_INSTALL: '1' })
	assert.equal(result.status, 42)
	assert.match(result.stderr, /simulated install failure/)
	assert.deepEqual(f.calls(), ['npm install'])
	assert.ok(!existsSync(path.join(f.root, 'keeweb/templates/keeweb.php')))
})
