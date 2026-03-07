/**
 * Demo: browse a website using agent-browser CLI.
 *
 * Usage:
 *   npx tsx utils/agent-browser/demo.ts [url]
 */

import { AgentBrowser } from "./browser.js";

const url = process.argv[2] || "https://example.com";
const browser = new AgentBrowser();

async function main() {
	console.log(`Opening ${url}…`);
	await browser.open(url);

	console.log("\n--- Accessibility Snapshot ---");
	const snapshot = await browser.snapshot();
	console.log(snapshot);

	console.log("\n--- Page Info ---");
	const title = await browser.getTitle();
	const currentUrl = await browser.getUrl();
	console.log(`Title: ${title}`);
	console.log(`URL:   ${currentUrl}`);

	console.log("\nTaking screenshot…");
	const screenshotResult = await browser.screenshot("demo-screenshot.png");
	console.log(screenshotResult);

	console.log("\nClosing browser…");
	await browser.close();
	console.log("Done.");
}

main().catch((err) => {
	console.error("Demo failed:", err.message);
	browser.close().catch(() => {});
	process.exit(1);
});
