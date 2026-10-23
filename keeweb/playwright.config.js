const { defineConfig, devices } = require('@playwright/test')

module.exports = defineConfig({
	testDir: './tests/e2e',
	forbidOnly: !!process.env.CI,
	workers: 1,
	timeout: 60_000,
	expect: { timeout: 15_000 },
	reporter: [['list'], ['html', { open: 'never' }]],
	use: {
		baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
	],
})
