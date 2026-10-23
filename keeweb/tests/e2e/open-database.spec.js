const { test, expect } = require('@playwright/test')

test.beforeEach(async ({ page }) => {
	await page.goto('/index.php/login?redirect_url=/apps/files/')
	await page.getByRole('textbox', { name: 'Account name or email' }).fill('admin')
	await page.getByRole('textbox', { name: 'Password', exact: true }).fill('admin')
	await page.getByRole('button', { name: 'Log in', exact: true }).click()
	await expect(page).toHaveURL(/\/apps\/files\//)
})

for (const method of ['context menu', 'default file action']) {
	test(`opens and unlocks the sample database via the ${method}`, async ({ page }) => {
		const row = page.getByRole('row', { name: /dummy\.kdbx/ })
		const openButton = row.getByRole('button', { name: 'Open With Keeweb: dummy.kdbx', exact: true })
		await expect(openButton).toBeVisible()

		if (method === 'context menu') {
			await row.click({ button: 'right' })
			await page.getByRole('menuitem', { name: 'Open With Keeweb', exact: true }).click()
		} else {
			await openButton.click()
		}

		await expect(page).toHaveURL(/\/apps\/keeweb\/\?open=%2Fdummy\.kdbx$/)
		const keeweb = page.frameLocator('iframe')
		const password = keeweb.getByRole('textbox', { name: /^Password for \/dummy\.kdbx on / })
		await password.fill('admin')
		await password.press('Enter')
		await expect(keeweb.getByRole('heading', { name: 'Nextcloud', exact: true })).toBeVisible()
		await expect(password).not.toBeVisible()
	})
}
