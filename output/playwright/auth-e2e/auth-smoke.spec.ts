import { test, expect } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL || "http://localhost:3074";

test("AI auth e2e smoke", async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto(`${baseUrl}/fullscreen-chat`, { waitUntil: "domcontentloaded" });
	await expect(page.locator("textarea").first()).toBeVisible({ timeout: 20000 });
	await page.screenshot({
		path: "output/playwright/auth-e2e/01-fullscreen-chat-loaded.png",
		fullPage: true,
	});

	const prompt = `Playwright auth smoke ${Date.now()}. Reply with EXACTLY AUTH_OK`;
	const input = page.locator("textarea").first();
	await input.fill(prompt);

	const submitButton = page.getByRole("button", { name: /submit|send/i }).first();
	const chatResponsePromise = page.waitForResponse(
		(response) =>
			response.url().includes("/api/chat-sdk") && response.request().method() === "POST",
		{ timeout: 30000 }
	);

	if (await submitButton.isVisible().catch(() => false)) {
		await submitButton.click();
	} else {
		await input.press("Enter");
	}

	const chatResponse = await chatResponsePromise;
	expect(chatResponse.ok()).toBeTruthy();

	await expect(page.getByText("AUTH_OK", { exact: false }).first()).toBeVisible({
		timeout: 60000,
	});
	await page.screenshot({
		path: "output/playwright/auth-e2e/02-fullscreen-chat-response.png",
		fullPage: true,
	});
});
