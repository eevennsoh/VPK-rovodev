const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

const BINARY_PATH = path.resolve(
	__dirname,
	"..",
	"..",
	"node_modules",
	".bin",
	process.platform === "win32" ? "agent-browser.cmd" : "agent-browser"
);

const DEFAULT_URL = "about:blank";
const DEFAULT_VIEWPORT = {
	width: 1280,
	height: 900,
};
const MAX_OUTPUT_BYTES = 10 * 1024 * 1024;
const SCREENSHOT_DIR = path.join(os.tmpdir(), "vpk-chromium-preview");
const SCREENSHOT_PATH = path.join(SCREENSHOT_DIR, "latest.png");

function delay(milliseconds) {
	return new Promise((resolve) => {
		setTimeout(resolve, milliseconds);
	});
}

function clampViewportDimension(value, fallback) {
	const parsed = Number.parseInt(String(value), 10);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return fallback;
	}
	return Math.min(Math.max(parsed, 320), 3840);
}

function normalizeUrl(url) {
	if (typeof url !== "string" || !url.trim()) {
		throw new Error("A non-empty URL is required.");
	}

	const trimmed = url.trim();
	if (/^https?:\/\//i.test(trimmed) || trimmed === "about:blank") {
		return trimmed;
	}

	if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
		return trimmed;
	}

	return `https://${trimmed}`;
}

class ChromiumPreviewManager {
	constructor() {
		this._queue = Promise.resolve();
		this._isInstalled = false;
		this._isBrowserReady = false;
		this._title = "";
		this._currentUrl = DEFAULT_URL;
		this._viewport = { ...DEFAULT_VIEWPORT };
		this._history = [DEFAULT_URL];
		this._historyIndex = 0;
		this._pendingHistoryAction = null;
	}

	_enqueue(task) {
		const nextTask = this._queue.then(task, task);
		this._queue = nextTask.catch(() => {});
		return nextTask;
	}

	async _run(args) {
		try {
			const { stdout } = await execFileAsync(BINARY_PATH, args, {
				maxBuffer: MAX_OUTPUT_BYTES,
			});
			return stdout.trim();
		} catch (error) {
			const message =
				error instanceof Error && error.message
					? error.message
					: "Chromium preview command failed.";
			throw new Error(message);
		}
	}

	async _ensureInstalled() {
		if (this._isInstalled) {
			return;
		}

		await this._run(["install"]);
		this._isInstalled = true;
	}

	async _applyViewport() {
		await this._run([
			"set",
			"viewport",
			String(this._viewport.width),
			String(this._viewport.height),
		]);
	}

	async _ensureBrowser() {
		if (this._isBrowserReady) {
			return;
		}

		await this._ensureInstalled();
		await this._run(["open", this._currentUrl]);
		await this._applyViewport();
		this._isBrowserReady = true;
		await delay(100);
		await this._refreshState();
	}

	_recordUrl(nextUrl) {
		if (typeof nextUrl !== "string" || !nextUrl.trim()) {
			return;
		}

		if (this._pendingHistoryAction === "back") {
			this._historyIndex = Math.max(0, this._historyIndex - 1);
		} else if (this._pendingHistoryAction === "forward") {
			this._historyIndex = Math.min(
				this._history.length - 1,
				this._historyIndex + 1
			);
		} else if (this._history[this._historyIndex] !== nextUrl) {
			this._history = this._history.slice(0, this._historyIndex + 1);
			this._history.push(nextUrl);
			this._historyIndex = this._history.length - 1;
		}

		this._pendingHistoryAction = null;
		this._currentUrl = nextUrl;
		if (this._history[this._historyIndex] !== nextUrl) {
			this._history[this._historyIndex] = nextUrl;
		}
	}

	async _refreshState() {
		await this._ensureBrowser();

		const [title, url] = await Promise.all([
			this._run(["get", "title"]).catch(() => this._title),
			this._run(["get", "url"]).catch(() => this._currentUrl),
		]);

		this._title = title;
		this._recordUrl(url || this._currentUrl);
		return this._getStateSnapshot();
	}

	_getStateSnapshot() {
		return {
			ready: this._isBrowserReady,
			title: this._title,
			url: this._currentUrl,
			viewportWidth: this._viewport.width,
			viewportHeight: this._viewport.height,
			canGoBack: this._historyIndex > 0,
			canGoForward: this._historyIndex < this._history.length - 1,
		};
	}

	getState() {
		return this._enqueue(async () => {
			return this._refreshState();
		});
	}

	navigate(url) {
		return this._enqueue(async () => {
			const normalizedUrl = normalizeUrl(url);
			this._pendingHistoryAction = "navigate";
			this._currentUrl = normalizedUrl;
			await this._ensureBrowser();
			await this._run(["open", normalizedUrl]);
			await delay(250);
			return this._refreshState();
		});
	}

	setViewport(width, height) {
		return this._enqueue(async () => {
			this._viewport = {
				width: clampViewportDimension(width, DEFAULT_VIEWPORT.width),
				height: clampViewportDimension(height, DEFAULT_VIEWPORT.height),
			};

			if (this._isBrowserReady) {
				await this._applyViewport();
				await delay(75);
				return this._refreshState();
			}

			return this._getStateSnapshot();
		});
	}

	goBack() {
		return this._enqueue(async () => {
			await this._ensureBrowser();
			this._pendingHistoryAction = "back";
			await this._run(["eval", "window.history.back()"]);
			await delay(250);
			return this._refreshState();
		});
	}

	goForward() {
		return this._enqueue(async () => {
			await this._ensureBrowser();
			this._pendingHistoryAction = "forward";
			await this._run(["eval", "window.history.forward()"]);
			await delay(250);
			return this._refreshState();
		});
	}

	reload() {
		return this._enqueue(async () => {
			await this._ensureBrowser();
			this._pendingHistoryAction = "reload";
			await this._run(["eval", "window.location.reload()"]);
			await delay(250);
			return this._refreshState();
		});
	}

	click(x, y) {
		return this._enqueue(async () => {
			await this._ensureBrowser();
			const resolvedX = Math.max(0, Math.round(Number(x) || 0));
			const resolvedY = Math.max(0, Math.round(Number(y) || 0));
			await this._run(["mouse", "move", String(resolvedX), String(resolvedY)]);
			await this._run(["mouse", "down", "left"]);
			await this._run(["mouse", "up", "left"]);
			await delay(250);
			return this._refreshState();
		});
	}

	wheel(deltaX, deltaY) {
		return this._enqueue(async () => {
			await this._ensureBrowser();
			const resolvedDeltaX = Math.round(Number(deltaX) || 0);
			const resolvedDeltaY = Math.round(Number(deltaY) || 0);
			await this._run([
				"mouse",
				"wheel",
				String(resolvedDeltaY),
				String(resolvedDeltaX),
			]);
			await delay(125);
			return this._refreshState();
		});
	}

	press(key) {
		return this._enqueue(async () => {
			await this._ensureBrowser();
			if (typeof key !== "string" || !key.trim()) {
				throw new Error("A keyboard key is required.");
			}
			await this._run(["press", key.trim()]);
			await delay(125);
			return this._refreshState();
		});
	}

	insertText(text) {
		return this._enqueue(async () => {
			await this._ensureBrowser();
			if (typeof text !== "string" || !text) {
				throw new Error("Text input is required.");
			}
			await this._run(["keyboard", "inserttext", text]);
			await delay(100);
			return this._refreshState();
		});
	}

	async screenshot() {
		return this._enqueue(async () => {
			await this._ensureBrowser();
			await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
			await this._run(["screenshot", SCREENSHOT_PATH]);
			const buffer = await fs.readFile(SCREENSHOT_PATH);
			await this._refreshState();
			return {
				buffer,
				contentType: "image/png",
				state: this._getStateSnapshot(),
			};
		});
	}

	snapshot(options) {
		return this._enqueue(async () => {
			await this._ensureBrowser();
			const args = ["snapshot"];
			if (options?.interactive) args.push("-i");
			const tree = await this._run(args);
			return { snapshot: tree, state: this._getStateSnapshot() };
		});
	}
}

const chromiumPreviewManager = new ChromiumPreviewManager();

module.exports = {
	chromiumPreviewManager,
	normalizeChromiumPreviewUrl: normalizeUrl,
};
