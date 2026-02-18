const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");

const ARTIFACT_DIR = path.resolve("output/playwright/auth-e2e");
const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3074";

async function existsAndVisible(page, selector) {
	const locator = page.locator(selector).first();
	const count = await locator.count();
	if (!count) {
		return false;
	}
	return locator.isVisible().catch(() => false);
}

async function clickSendOrPressEnter(page) {
	const candidates = [
		'button:has-text("Send")',
		'button[aria-label*="Send" i]',
		'button[title*="Send" i]',
		'button[data-testid*="send" i]',
	];

	for (const selector of candidates) {
		if (await existsAndVisible(page, selector)) {
			await page.locator(selector).first().click();
			return `clicked:${selector}`;
		}
	}

	await page.locator("textarea").first().press("Enter");
	return "pressed:Enter";
}

(async () => {
	const result = {
		baseUrl: BASE_URL,
		status: "started",
		timestamp: new Date().toISOString(),
		artifacts: {
			before: path.join(ARTIFACT_DIR, "01-fullscreen-chat-loaded.png"),
			after: path.join(ARTIFACT_DIR, "02-fullscreen-chat-response.png"),
		},
		details: {},
	};

	let browser;
	try {
		await fs.mkdir(ARTIFACT_DIR, { recursive: true });
		browser = await chromium.launch({ headless: true });
		const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		const page = await context.newPage();

		await page.goto(`${BASE_URL}/fullscreen-chat`, { waitUntil: "domcontentloaded", timeout: 45000 });
		await page.waitForSelector("textarea", { timeout: 30000 });
		await page.screenshot({ path: result.artifacts.before, fullPage: true });

		const prompt = `Playwright auth smoke ${Date.now()}. Reply with EXACTLY AUTH_OK`;
		result.details.prompt = prompt;
		await page.locator("textarea").first().fill(prompt);

		const chatRequest = page.waitForResponse(
			(response) => response.url().includes("/api/chat-sdk") && response.request().method() === "POST",
			{ timeout: 30000 }
		);

		result.details.submitMethod = await clickSendOrPressEnter(page);

		const response = await chatRequest;
		result.details.chatSdkStatus = response.status();
		if (!response.ok()) {
			throw new Error(`chat-sdk returned status ${response.status()}`);
		}

		await page.waitForFunction(
			() => {
				const bodyText = document.body?.innerText || "";
				return bodyText.includes("AUTH_OK");
			},
			{ timeout: 60000 }
		);

		await page.screenshot({ path: result.artifacts.after, fullPage: true });

		result.status = "passed";
		result.details.assertion = 'Found "AUTH_OK" in chat transcript';
	} catch (error) {
		result.status = "failed";
		result.error = error instanceof Error ? error.message : String(error);
	} finally {
		if (browser) {
			await browser.close().catch(() => {});
		}
		await fs.writeFile(path.join(ARTIFACT_DIR, "result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
		if (result.status !== "passed") {
			console.error(JSON.stringify(result, null, 2));
			process.exit(1);
		}
		console.log(JSON.stringify(result, null, 2));
	}
})();
