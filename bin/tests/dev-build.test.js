const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { test } = require('node:test')

function fixture(t) {
	const root = mkdtempSync(path.join(os.tmpdir(), 'keeweb-dev-build-'))
	t.after(() => rmSync(root, { recursive: true, force: true }))
	const workspace = path.join(root, 'workspace')
	const origin = path.join(root, 'origin')
	const tools = path.join(root, 'tools')
	mkdirSync(path.join(workspace, 'bin'), { recursive: true })
	mkdirSync(tools)
	mkdirSync(origin)
	const git = spawnSync('which', ['git'], { encoding: 'utf8' }).stdout.trim()
	function runGit(...args) {
		const result = spawnSync(git, args, { encoding: 'utf8' })
		assert.equal(result.status, 0, result.stderr)
		return result.stdout.trim()
	}
	runGit('init', origin)
	writeFileSync(path.join(origin, 'source.txt'), 'upstream source\n')
	runGit('-C', origin, 'add', '.')
	runGit('-C', origin, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'Fixture')
	runGit('-C', origin, 'tag', 'test-version')
	copyFileSync(path.join(__dirname, '../dev-build'), path.join(workspace, 'bin/dev-build'))
	writeFileSync(path.join(workspace, 'keeweb-version'), 'test-version\n')
	writeFileSync(path.join(workspace, 'bin/build'), `#!/bin/bash
set -e
git -C keeweb-source rev-parse --resolve-git-dir .git
echo build >> "$CALLS"
`)
	writeFileSync(path.join(tools, 'git'), `#!/bin/bash
if [[ "$1" == clone ]]; then
  echo clone >> "$CALLS"
  if [[ "\${FAIL_CLONE:-}" == 1 ]]; then
    echo "simulated clone failure" >&2
    exit 42
  fi
  exec "$REAL_GIT" clone --branch "$3" "$ORIGIN" "$5"
fi
exec "$REAL_GIT" "$@"
`, { mode: 0o755 })
	writeFileSync(path.join(tools, 'npm'), '#!/bin/bash\necho "npm $*" >> "$CALLS"\n', { mode: 0o755 })
	const calls = path.join(root, 'calls')
	return {
		workspace,
		origin,
		runGit,
		run(extraEnv = {}) {
			return spawnSync('bash', [path.join(workspace, 'bin/dev-build')], {
				cwd: root,
				encoding: 'utf8',
				env: {
					...process.env,
					PATH: `${tools}:${process.env.PATH}`,
					REAL_GIT: git,
					ORIGIN: origin,
					CALLS: calls,
					...extraEnv,
				},
			})
		},
		calls: () => existsSync(calls) ? readFileSync(calls, 'utf8').trim().split('\n') : [],
		backups: () => readdirSync(workspace).filter(name => name.startsWith('keeweb-source.backup.')),
	}
}

test('clones the configured version and runs both builds when source is missing', t => {
	const f = fixture(t)
	const result = f.run()
	assert.equal(result.status, 0, result.stderr)
	assert.equal(f.runGit('-C', path.join(f.workspace, 'keeweb-source'), 'describe', '--tags'), 'test-version')
	assert.deepEqual(f.calls(), ['clone', 'build', 'npm --prefix keeweb ci', 'npm --prefix keeweb run build'])
	assert.deepEqual(f.backups(), [])
})

test('preserves an existing non-repository directory before cloning', t => {
	const f = fixture(t)
	// An enclosing repository must not be mistaken for the upstream checkout.
	f.runGit('init', f.workspace)
	mkdirSync(path.join(f.workspace, 'keeweb-source'))
	writeFileSync(path.join(f.workspace, 'keeweb-source/local.txt'), 'keep me')
	const result = f.run()
	assert.equal(result.status, 0, result.stderr)
	assert.equal(f.backups().length, 1)
	const backup = f.backups()[0]
	assert.equal(readFileSync(path.join(f.workspace, backup, 'keeweb-source/local.txt'), 'utf8'), 'keep me')
	assert.ok(result.stderr.includes(`${backup}/keeweb-source`))
	assert.ok(existsSync(path.join(f.workspace, 'keeweb-source/.git')))
})

test('reuses a valid checkout on repeated runs', t => {
	const f = fixture(t)
	assert.equal(f.run().status, 0)
	const result = f.run()
	assert.equal(result.status, 0, result.stderr)
	assert.equal(f.calls().filter(call => call === 'clone').length, 1)
	assert.equal(f.calls().filter(call => call === 'build').length, 2)
	assert.deepEqual(f.backups(), [])
})

test('accepts a Git worktree whose .git is a file', t => {
	const f = fixture(t)
	f.runGit('-C', f.origin, 'worktree', 'add', '--detach', path.join(f.workspace, 'keeweb-source'), 'test-version')
	const result = f.run()
	assert.equal(result.status, 0, result.stderr)
	assert.ok(!f.calls().includes('clone'))
	assert.deepEqual(f.backups(), [])
})

test('stops on clone failure, preserves the backup, and supports retrying', t => {
	const f = fixture(t)
	mkdirSync(path.join(f.workspace, 'keeweb-source'))
	writeFileSync(path.join(f.workspace, 'keeweb-source/local.txt'), 'keep me')
	const result = f.run({ FAIL_CLONE: '1' })
	assert.equal(result.status, 42)
	assert.match(result.stderr, /simulated clone failure/)
	assert.deepEqual(f.calls(), ['clone'])
	assert.equal(f.backups().length, 1)
	assert.equal(readFileSync(path.join(f.workspace, f.backups()[0], 'keeweb-source/local.txt'), 'utf8'), 'keep me')
	const retry = f.run()
	assert.equal(retry.status, 0, retry.stderr)
	assert.equal(f.backups().length, 1)
})
