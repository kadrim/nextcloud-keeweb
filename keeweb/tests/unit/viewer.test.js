const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')
const { runInNewContext } = require('node:vm')

const bundle = readFileSync(path.join(__dirname, '../..', 'js/viewer.js'), 'utf8')

function loadViewer() {
	const window = {
		_oc_webroot: '',
		OC: { config: { modRewriteWorking: true } },
		location: { href: '' },
	}
	const document = {
		readyState: 'complete',
		getElementsByTagName: () => [],
		removeEventListener() {},
		querySelector: () => null,
	}

	runInNewContext(bundle, {
		window,
		document,
		console,
		EventTarget,
		CustomEvent,
		btoa,
		t: (app, text) => text,
	})

	const actions = window._nc_files_scope?.v4_0?.fileActions
	assert.ok(actions, 'The built viewer must use the Nextcloud 34 file-action registry')
	return { window, action: actions.get('keeweb') }
}

test('registers Keeweb in the Nextcloud 34 registry, not the legacy registry', () => {
	const { window, action } = loadViewer()
	assert.ok(action)
	assert.equal(window._nc_fileactions, undefined)
	assert.equal(action.displayName(), 'Open With Keeweb')
	assert.equal(action.default, 'default')
})

test('only enables the action for readable KDBX files', () => {
	const { action } = loadViewer()
	const readable = { mime: 'application/x-kdbx', permissions: 1 }

	assert.equal(action.enabled({ nodes: [readable] }), true)
	assert.equal(action.enabled({ nodes: [readable, readable] }), true)
	assert.equal(action.enabled({ nodes: [] }), false)
	assert.equal(action.enabled({ nodes: [{ ...readable, permissions: 0 }] }), false)
	assert.equal(action.enabled({ nodes: [{ ...readable, mime: 'text/plain' }] }), false)
	assert.equal(action.enabled({
		nodes: [readable, { ...readable, mime: 'text/plain' }],
	}), false)
})

test('opens the selected database with its path URL-encoded', async () => {
	const { window, action } = loadViewer()
	const databasePath = '/Test folder/vault & backup.kdbx'

	assert.equal(await action.exec({ nodes: [{ path: databasePath }] }), null)
	assert.equal(window.location.href, `/apps/keeweb/?open=${encodeURIComponent(databasePath)}`)
})
