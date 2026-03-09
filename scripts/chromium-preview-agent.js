#!/usr/bin/env node

const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_BACKEND_URL = "http://localhost:8080";
const DEFAULT_SCREENSHOT_PATH = path.join(
	process.cwd(),
	"output",
	"chromium-preview.png"
);
const BACKEND_PORT_FILE = path.join(process.cwd(), ".dev-backend-port");

function getBackendBaseUrl() {
	if (process.env.BACKEND_URL && process.env.BACKEND_URL.trim()) {
		return process.env.BACKEND_URL.trim().replace(/\/+$/u, "");
	}

	if (process.env.BACKEND_PORT && process.env.BACKEND_PORT.trim()) {
		return `http://localhost:${process.env.BACKEND_PORT.trim()}`;
	}

	try {
		const rawPort = fs.readFileSync(BACKEND_PORT_FILE, "utf8").trim();
		if (rawPort) {
			return `http://localhost:${rawPort}`;
		}
	} catch {
		// Ignore missing port file and fall back to the default backend URL.
	}

	return DEFAULT_BACKEND_URL;
}

function buildUrl(endpointPath) {
	return `${getBackendBaseUrl()}${endpointPath}`;
}

async function parseErrorResponse(response) {
	const rawText = await response.text();
	if (!rawText.trim()) {
		return `${response.status} ${response.statusText}`.trim();
	}

	try {
		const parsed = JSON.parse(rawText);
		if (parsed && typeof parsed === "object") {
			if (typeof parsed.error === "string" && parsed.error.trim()) {
				return parsed.error.trim();
			}
			if (typeof parsed.details === "string" && parsed.details.trim()) {
				return parsed.details.trim();
			}
		}
	} catch {
		// Fall through to return the raw text.
	}

	return rawText.trim();
}

async function requestJson(method, endpointPath, body) {
	const response = await fetch(buildUrl(endpointPath), {
		method,
		headers:
			body === undefined
				? undefined
				: {
						"Content-Type": "application/json",
					},
		body: body === undefined ? undefined : JSON.stringify(body),
	});

	if (!response.ok) {
		throw new Error(await parseErrorResponse(response));
	}

	return response.json();
}

async function requestBinary(endpointPath) {
	const response = await fetch(buildUrl(endpointPath), {
		method: "GET",
	});

	if (!response.ok) {
		throw new Error(await parseErrorResponse(response));
	}

	return Buffer.from(await response.arrayBuffer());
}

function printJson(value) {
	process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function printUsage() {
	process.stdout.write(
		[
			"chromium-preview-agent - control the embedded Chromium preview session",
			"",
			"Usage:",
			"  node scripts/chromium-preview-agent.js open <url>",
			"  node scripts/chromium-preview-agent.js state",
			"  node scripts/chromium-preview-agent.js snapshot [-i|--interactive]",
			"  node scripts/chromium-preview-agent.js click-ref <ref>",
			"  node scripts/chromium-preview-agent.js hover-ref <ref>",
			"  node scripts/chromium-preview-agent.js fill-ref <ref> <text>",
			"  node scripts/chromium-preview-agent.js type-ref <ref> <text>",
			"  node scripts/chromium-preview-agent.js select-ref <ref> <value...>",
			"  node scripts/chromium-preview-agent.js scroll <up|down|left|right> [pixels]",
			"  node scripts/chromium-preview-agent.js press <key>",
			"  node scripts/chromium-preview-agent.js type <text>",
			"  node scripts/chromium-preview-agent.js back",
			"  node scripts/chromium-preview-agent.js forward",
			"  node scripts/chromium-preview-agent.js reload",
			"  node scripts/chromium-preview-agent.js screenshot [outputPath]",
			"",
			"Notes:",
			"  - This CLI controls the same Chromium session shown in the embedded preview panel.",
			"  - `snapshot -i` outputs the raw accessibility tree with refs.",
			`  - Screenshots default to ${DEFAULT_SCREENSHOT_PATH}`,
			"",
		].join("\n")
	);
}

async function saveScreenshot(outputPath) {
	const resolvedOutputPath = path.resolve(
		outputPath && outputPath.trim() ? outputPath.trim() : DEFAULT_SCREENSHOT_PATH
	);
	const screenshotBuffer = await requestBinary("/api/chromium-preview/screenshot");
	await fsp.mkdir(path.dirname(resolvedOutputPath), { recursive: true });
	await fsp.writeFile(resolvedOutputPath, screenshotBuffer);
	process.stdout.write(`${resolvedOutputPath}\n`);
}

async function main() {
	const [command, ...args] = process.argv.slice(2);

	if (!command || command === "help" || command === "--help" || command === "-h") {
		printUsage();
		return;
	}

	switch (command) {
		case "open": {
			const url = args[0];
			if (!url) {
				throw new Error("Usage: open <url>");
			}
			printJson(await requestJson("POST", "/api/chromium-preview", { url }));
			return;
		}

		case "state": {
			printJson(await requestJson("GET", "/api/chromium-preview"));
			return;
		}

		case "snapshot": {
			const interactive = args.includes("-i") || args.includes("--interactive");
			const result = await requestJson(
				"GET",
				`/api/chromium-preview/snapshot${interactive ? "?interactive=true" : ""}`
			);
			process.stdout.write(`${result.snapshot ?? ""}\n`);
			return;
		}

		case "click-ref": {
			const ref = args[0];
			if (!ref) {
				throw new Error("Usage: click-ref <ref>");
			}
			printJson(
				await requestJson("POST", "/api/chromium-preview/click-ref", { ref })
			);
			return;
		}

		case "hover-ref": {
			const ref = args[0];
			if (!ref) {
				throw new Error("Usage: hover-ref <ref>");
			}
			printJson(
				await requestJson("POST", "/api/chromium-preview/hover-ref", { ref })
			);
			return;
		}

		case "fill-ref": {
			const ref = args[0];
			if (!ref || args.length < 2) {
				throw new Error('Usage: fill-ref <ref> <text>');
			}
			const text = args.slice(1).join(" ");
			printJson(
				await requestJson("POST", "/api/chromium-preview/fill-ref", {
					ref,
					text,
				})
			);
			return;
		}

		case "type-ref": {
			const ref = args[0];
			if (!ref || args.length < 2) {
				throw new Error("Usage: type-ref <ref> <text>");
			}
			const text = args.slice(1).join(" ");
			printJson(
				await requestJson("POST", "/api/chromium-preview/type-ref", {
					ref,
					text,
				})
			);
			return;
		}

		case "select-ref": {
			const ref = args[0];
			const values = args.slice(1);
			if (!ref || values.length === 0) {
				throw new Error("Usage: select-ref <ref> <value...>");
			}
			printJson(
				await requestJson("POST", "/api/chromium-preview/select-ref", {
					ref,
					values,
				})
			);
			return;
		}

		case "scroll": {
			const direction = args[0];
			const pixels = args[1];
			if (!direction) {
				throw new Error("Usage: scroll <up|down|left|right> [pixels]");
			}
			printJson(
				await requestJson("POST", "/api/chromium-preview/scroll", {
					direction,
					pixels,
				})
			);
			return;
		}

		case "press": {
			if (args.length === 0) {
				throw new Error("Usage: press <key>");
			}
			printJson(
				await requestJson("POST", "/api/chromium-preview/press", {
					key: args.join(" "),
				})
			);
			return;
		}

		case "type": {
			if (args.length === 0) {
				throw new Error("Usage: type <text>");
			}
			printJson(
				await requestJson("POST", "/api/chromium-preview/type", {
					text: args.join(" "),
				})
			);
			return;
		}

		case "back":
		case "forward":
		case "reload": {
			printJson(
				await requestJson("POST", `/api/chromium-preview/${command}`)
			);
			return;
		}

		case "screenshot": {
			await saveScreenshot(args[0]);
			return;
		}

		default:
			throw new Error(`Unknown command: ${command}`);
	}
}

main().catch((error) => {
	process.stderr.write(
		`${error instanceof Error ? error.message : String(error)}\n`
	);
	process.exit(1);
});
