#!/usr/bin/env node

const fs = require("node:fs")
const fsp = require("node:fs/promises")
const path = require("node:path")

const DEFAULT_BACKEND_URL = "http://localhost:8080"
const DEFAULT_SCREENSHOT_PATH = path.join(
	process.cwd(),
	"output",
	"chromium-preview.png",
)
const BACKEND_PORT_FILE = path.join(process.cwd(), ".dev-backend-port")

function getBackendBaseUrl() {
	if (process.env.BACKEND_URL && process.env.BACKEND_URL.trim()) {
		return process.env.BACKEND_URL.trim().replace(/\/+$/u, "")
	}

	if (process.env.BACKEND_PORT && process.env.BACKEND_PORT.trim()) {
		return `http://localhost:${process.env.BACKEND_PORT.trim()}`
	}

	try {
		const rawPort = fs.readFileSync(BACKEND_PORT_FILE, "utf8").trim()
		if (rawPort) {
			return `http://localhost:${rawPort}`
		}
	} catch {
		// Ignore missing port file and fall back to the default backend URL.
	}

	return DEFAULT_BACKEND_URL
}

function buildUrl(endpointPath) {
	return `${getBackendBaseUrl()}${endpointPath}`
}

function parseCliArgs(argv) {
	let workspaceId = null
	const args = []

	for (let index = 0; index < argv.length; index += 1) {
		const value = argv[index]
		if (value === "--workspace" || value === "-w") {
			workspaceId = argv[index + 1] ?? null
			index += 1
			continue
		}

		if (value.startsWith("--workspace=")) {
			workspaceId = value.slice("--workspace=".length) || null
			continue
		}

		args.push(value)
	}

	return {
		workspaceId,
		args,
	}
}

function getWorkspaceBasePath(workspaceId) {
	return `/api/browser-workspaces/${encodeURIComponent(workspaceId)}`
}

async function parseErrorResponse(response) {
	const rawText = await response.text()
	if (!rawText.trim()) {
		return `${response.status} ${response.statusText}`.trim()
	}

	try {
		const parsed = JSON.parse(rawText)
		if (parsed && typeof parsed === "object") {
			if (typeof parsed.error === "string" && parsed.error.trim()) {
				return parsed.error.trim()
			}
			if (typeof parsed.details === "string" && parsed.details.trim()) {
				return parsed.details.trim()
			}
		}
	} catch {
		// Fall through to return the raw text.
	}

	return rawText.trim()
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
	})

	if (!response.ok) {
		throw new Error(await parseErrorResponse(response))
	}

	return response.json()
}

async function requestBinary(endpointPath) {
	const response = await fetch(buildUrl(endpointPath), {
		method: "GET",
	})

	if (!response.ok) {
		throw new Error(await parseErrorResponse(response))
	}

	return Buffer.from(await response.arrayBuffer())
}

function printJson(value) {
	process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}

function printUsage() {
	process.stdout.write(
		[
			"chromium-preview-agent - control the embedded browser preview workspace",
			"",
			"Usage:",
			"  node scripts/chromium-preview-agent.js [--workspace <id>] open <url>",
			"  node scripts/chromium-preview-agent.js [--workspace <id>] state",
			"  node scripts/chromium-preview-agent.js [--workspace <id>] snapshot [-i|--interactive]",
			"  node scripts/chromium-preview-agent.js [--workspace <id>] click-ref <ref>",
			"  node scripts/chromium-preview-agent.js [--workspace <id>] hover-ref <ref>",
			"  node scripts/chromium-preview-agent.js [--workspace <id>] fill-ref <ref> <text>",
			"  node scripts/chromium-preview-agent.js [--workspace <id>] type-ref <ref> <text>",
			"  node scripts/chromium-preview-agent.js [--workspace <id>] select-ref <ref> <value...>",
			"  node scripts/chromium-preview-agent.js [--workspace <id>] scroll <up|down|left|right> [pixels]",
			"  node scripts/chromium-preview-agent.js [--workspace <id>] press <key>",
			"  node scripts/chromium-preview-agent.js [--workspace <id>] type <text>",
			"  node scripts/chromium-preview-agent.js [--workspace <id>] back",
			"  node scripts/chromium-preview-agent.js [--workspace <id>] forward",
			"  node scripts/chromium-preview-agent.js [--workspace <id>] reload",
			"  node scripts/chromium-preview-agent.js [--workspace <id>] screenshot [outputPath]",
			"  node scripts/chromium-preview-agent.js --workspace <id> tab list",
			"  node scripts/chromium-preview-agent.js --workspace <id> tab new [url]",
			"  node scripts/chromium-preview-agent.js --workspace <id> tab switch <index>",
			"  node scripts/chromium-preview-agent.js --workspace <id> tab close [index]",
			"",
			"Notes:",
			"  - With --workspace, commands target the explicit browser workspace used by the utility Agent Browser surface.",
			"  - Without --workspace, commands use the legacy singleton Chromium preview endpoints for compatibility.",
			"  - `snapshot -i` outputs the raw accessibility tree with refs.",
			`  - Screenshots default to ${DEFAULT_SCREENSHOT_PATH}`,
			"",
		].join("\n"),
	)
}

async function saveScreenshot(outputPath, workspaceId) {
	const resolvedOutputPath = path.resolve(
		outputPath && outputPath.trim() ? outputPath.trim() : DEFAULT_SCREENSHOT_PATH,
	)
	const screenshotBuffer = await requestBinary(
		workspaceId
			? `${getWorkspaceBasePath(workspaceId)}/screenshot`
			: "/api/chromium-preview/screenshot",
	)
	await fsp.mkdir(path.dirname(resolvedOutputPath), { recursive: true })
	await fsp.writeFile(resolvedOutputPath, screenshotBuffer)
	process.stdout.write(`${resolvedOutputPath}\n`)
}

async function resolveActiveTabIndex(workspaceId) {
	const state = await requestJson("GET", getWorkspaceBasePath(workspaceId))
	if (typeof state?.activeTabIndex !== "number" || state.activeTabIndex < 0) {
		throw new Error("Could not resolve the active tab index for the workspace.")
	}

	return state.activeTabIndex
}

async function main() {
	const parsedCli = parseCliArgs(process.argv.slice(2))
	const [command, ...args] = parsedCli.args
	const workspaceId =
		typeof parsedCli.workspaceId === "string" && parsedCli.workspaceId.trim()
			? parsedCli.workspaceId.trim()
			: null

	if (!command || command === "help" || command === "--help" || command === "-h") {
		printUsage()
		return
	}

	switch (command) {
		case "open": {
			const url = args[0]
			if (!url) {
				throw new Error("Usage: open <url>")
			}

			printJson(
				await requestJson(
					"POST",
					workspaceId
						? `${getWorkspaceBasePath(workspaceId)}/navigate`
						: "/api/chromium-preview",
					{ url },
				),
			)
			return
		}

		case "state": {
			printJson(
				await requestJson(
					"GET",
					workspaceId
						? getWorkspaceBasePath(workspaceId)
						: "/api/chromium-preview",
				),
			)
			return
		}

		case "snapshot": {
			const interactive = args.includes("-i") || args.includes("--interactive")
			const endpointPath = workspaceId
				? `${getWorkspaceBasePath(workspaceId)}/snapshot${interactive ? "?interactive=true" : ""}`
				: `/api/chromium-preview/snapshot${interactive ? "?interactive=true" : ""}`
			const result = await requestJson("GET", endpointPath)
			process.stdout.write(`${result.snapshot ?? ""}\n`)
			return
		}

		case "click-ref": {
			const ref = args[0]
			if (!ref) {
				throw new Error("Usage: click-ref <ref>")
			}

			printJson(
				await requestJson(
					"POST",
					workspaceId
						? `${getWorkspaceBasePath(workspaceId)}/click-ref`
						: "/api/chromium-preview/click-ref",
					{ ref },
				),
			)
			return
		}

		case "hover-ref": {
			const ref = args[0]
			if (!ref) {
				throw new Error("Usage: hover-ref <ref>")
			}

			printJson(
				await requestJson(
					"POST",
					workspaceId
						? `${getWorkspaceBasePath(workspaceId)}/hover-ref`
						: "/api/chromium-preview/hover-ref",
					{ ref },
				),
			)
			return
		}

		case "fill-ref": {
			const ref = args[0]
			if (!ref || args.length < 2) {
				throw new Error("Usage: fill-ref <ref> <text>")
			}
			const text = args.slice(1).join(" ")

			printJson(
				await requestJson(
					"POST",
					workspaceId
						? `${getWorkspaceBasePath(workspaceId)}/fill-ref`
						: "/api/chromium-preview/fill-ref",
					{ ref, text },
				),
			)
			return
		}

		case "type-ref": {
			const ref = args[0]
			if (!ref || args.length < 2) {
				throw new Error("Usage: type-ref <ref> <text>")
			}
			const text = args.slice(1).join(" ")

			printJson(
				await requestJson(
					"POST",
					workspaceId
						? `${getWorkspaceBasePath(workspaceId)}/type-ref`
						: "/api/chromium-preview/type-ref",
					{ ref, text },
				),
			)
			return
		}

		case "select-ref": {
			const ref = args[0]
			const values = args.slice(1)
			if (!ref || values.length === 0) {
				throw new Error("Usage: select-ref <ref> <value...>")
			}

			printJson(
				await requestJson(
					"POST",
					workspaceId
						? `${getWorkspaceBasePath(workspaceId)}/select-ref`
						: "/api/chromium-preview/select-ref",
					{ ref, values },
				),
			)
			return
		}

		case "scroll": {
			const direction = args[0]
			const pixels = args[1]
			if (!direction) {
				throw new Error("Usage: scroll <up|down|left|right> [pixels]")
			}

			printJson(
				await requestJson(
					"POST",
					workspaceId
						? `${getWorkspaceBasePath(workspaceId)}/scroll`
						: "/api/chromium-preview/scroll",
					{ direction, pixels },
				),
			)
			return
		}

		case "press": {
			if (args.length === 0) {
				throw new Error("Usage: press <key>")
			}

			printJson(
				await requestJson(
					"POST",
					workspaceId
						? `${getWorkspaceBasePath(workspaceId)}/press`
						: "/api/chromium-preview/press",
					{ key: args.join(" ") },
				),
			)
			return
		}

		case "type": {
			if (args.length === 0) {
				throw new Error("Usage: type <text>")
			}

			printJson(
				await requestJson(
					"POST",
					workspaceId
						? `${getWorkspaceBasePath(workspaceId)}/type`
						: "/api/chromium-preview/type",
					{ text: args.join(" ") },
				),
			)
			return
		}

		case "back":
		case "forward":
		case "reload": {
			printJson(
				await requestJson(
					"POST",
					workspaceId
						? `${getWorkspaceBasePath(workspaceId)}/${command}`
						: `/api/chromium-preview/${command}`,
				),
			)
			return
		}

		case "screenshot": {
			await saveScreenshot(args[0], workspaceId)
			return
		}

		case "tab": {
			if (!workspaceId) {
				throw new Error("The tab command requires --workspace <id>.")
			}

			const subcommand = args[0]
			if (!subcommand) {
				throw new Error("Usage: tab <list|new|switch|close>")
			}

			if (subcommand === "list") {
				printJson(
					await requestJson("GET", `${getWorkspaceBasePath(workspaceId)}/tabs`),
				)
				return
			}

			if (subcommand === "new") {
				printJson(
					await requestJson(
						"POST",
						`${getWorkspaceBasePath(workspaceId)}/tabs`,
						args[1] ? { url: args[1] } : {},
					),
				)
				return
			}

			if (subcommand === "switch" || /^\d+$/u.test(subcommand)) {
				const indexValue =
					subcommand === "switch" ? args[1] : subcommand
				if (!indexValue) {
					throw new Error("Usage: tab switch <index>")
				}

				const tabIndex = Number.parseInt(indexValue, 10)
				if (!Number.isInteger(tabIndex) || tabIndex < 0) {
					throw new Error("Tab index must be a non-negative integer.")
				}

				printJson(
					await requestJson(
						"POST",
						`${getWorkspaceBasePath(workspaceId)}/tabs/${tabIndex}/activate`,
						{},
					),
				)
				return
			}

			if (subcommand === "close") {
				const providedIndex = args[1]
				const tabIndex =
					providedIndex !== undefined
						? Number.parseInt(providedIndex, 10)
						: await resolveActiveTabIndex(workspaceId)
				if (!Number.isInteger(tabIndex) || tabIndex < 0) {
					throw new Error("Tab index must be a non-negative integer.")
				}

				printJson(
					await requestJson(
						"DELETE",
						`${getWorkspaceBasePath(workspaceId)}/tabs/${tabIndex}`,
					),
				)
				return
			}

			throw new Error(`Unknown tab subcommand: ${subcommand}`)
		}

		default:
			throw new Error(`Unknown command: ${command}`)
	}
}

main().catch((error) => {
	process.stderr.write(
		`${error instanceof Error ? error.message : String(error)}\n`,
	)
	process.exit(1)
})
