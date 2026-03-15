const DEFAULT_DEVICE_SCALE_FACTOR = 1
const DEFAULT_VIEWPORT = {
	width: 1280,
	height: 900,
}
const DEFAULT_SCREENCAST_QUALITY = 82
const DEFAULT_SCREENCAST_MAX_WIDTH = 1600
const DEFAULT_SCREENCAST_MAX_HEIGHT = 1200

let browserManagerPromise = null

function clampDeviceScaleFactor(value) {
	const parsed = Number.parseFloat(String(value))
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return DEFAULT_DEVICE_SCALE_FACTOR
	}

	return Math.min(Math.max(parsed, 1), 3)
}

async function loadBrowserManagerClass() {
	if (!browserManagerPromise) {
		browserManagerPromise = import("agent-browser/dist/browser.js")
			.then((module) => module.BrowserManager)
			.catch((error) => {
				browserManagerPromise = null
				throw error
			})
	}

	return browserManagerPromise
}

class AgentBrowserRuntime {
	constructor({
		sessionId,
		viewport = DEFAULT_VIEWPORT,
		deviceScaleFactor = DEFAULT_DEVICE_SCALE_FACTOR,
	} = {}) {
		this._sessionId = sessionId
		this._viewport = {
			width: viewport.width,
			height: viewport.height,
		}
		this._deviceScaleFactor = clampDeviceScaleFactor(deviceScaleFactor)
		this._browser = null
		this._launchPromise = null
	}

	async _ensureBrowser() {
		if (this._browser) {
			return this._browser
		}

		if (!this._launchPromise) {
			this._launchPromise = (async () => {
				const BrowserManager = await loadBrowserManagerClass()
				const browser = new BrowserManager()

				await browser.launch({
					id: `browser-workspace-${this._sessionId}`,
					action: "launch",
					headless: true,
					browser: "chromium",
					viewport: {
						width: this._viewport.width,
						height: this._viewport.height,
					},
				})

				this._browser = browser
				await this._applyViewportToActivePage()
				return browser
			})().finally(() => {
				this._launchPromise = null
			})
		}

		return this._launchPromise
	}

	async _applyViewportToActivePage() {
		if (!this._browser) {
			return
		}

		await this._browser.setViewport(this._viewport.width, this._viewport.height)
		if (this._deviceScaleFactor > 1) {
			await this._browser.setDeviceScaleFactor(
				this._deviceScaleFactor,
				this._viewport.width,
				this._viewport.height,
				false,
			)
			return
		}

		await this._browser.clearDeviceMetricsOverride().catch(() => {})
	}

	async initialize(defaultUrl) {
		await this._ensureBrowser()

		if (defaultUrl && defaultUrl !== "about:blank") {
			await this.navigate(defaultUrl)
		}
	}

	async getState() {
		const browser = await this._ensureBrowser()
		await browser.ensurePage()

		const tabs = await browser.listTabs()
		const activeTabIndex = browser.getActiveIndex()
		const activeTab = tabs.find((tab) => tab.active) ?? tabs[0]

		return {
			activeTabIndex,
			tabs,
			title: activeTab?.title ?? "",
			url: activeTab?.url ?? "about:blank",
		}
	}

	async navigate(url) {
		const browser = await this._ensureBrowser()
		const page = browser.getPage()
		await page.goto(url, { waitUntil: "domcontentloaded" })
	}

	async setViewport(width, height, deviceScaleFactor = this._deviceScaleFactor) {
		await this._ensureBrowser()
		this._viewport = {
			width,
			height,
		}
		this._deviceScaleFactor = clampDeviceScaleFactor(deviceScaleFactor)
		await this._applyViewportToActivePage()
	}

	async back() {
		const browser = await this._ensureBrowser()
		await browser.getPage().goBack().catch(() => null)
	}

	async forward() {
		const browser = await this._ensureBrowser()
		await browser.getPage().goForward().catch(() => null)
	}

	async reload() {
		const browser = await this._ensureBrowser()
		await browser.getPage().reload({ waitUntil: "domcontentloaded" })
	}

	async click(x, y) {
		const browser = await this._ensureBrowser()
		await browser.injectMouseEvent({
			type: "mouseMoved",
			x,
			y,
			button: "none",
		})
		await browser.injectMouseEvent({
			type: "mousePressed",
			x,
			y,
			button: "left",
			clickCount: 1,
		})
		await browser.injectMouseEvent({
			type: "mouseReleased",
			x,
			y,
			button: "left",
			clickCount: 1,
		})
	}

	async clickRef(ref) {
		const browser = await this._ensureBrowser()
		await browser.getLocator(ref).click()
	}

	async hoverRef(ref) {
		const browser = await this._ensureBrowser()
		await browser.getLocator(ref).hover()
	}

	async fillRef(ref, text) {
		const browser = await this._ensureBrowser()
		await browser.getLocator(ref).fill(text)
	}

	async typeRef(ref, text) {
		const browser = await this._ensureBrowser()
		await browser.getLocator(ref).pressSequentially(text)
	}

	async selectRef(ref, values) {
		const browser = await this._ensureBrowser()
		await browser.getLocator(ref).selectOption(values)
	}

	async wheel(x, y, deltaX, deltaY) {
		const browser = await this._ensureBrowser()
		await browser.injectMouseEvent({
			type: "mouseWheel",
			x,
			y,
			button: "none",
			deltaX,
			deltaY,
		})
	}

	async scroll(direction, pixels) {
		const browser = await this._ensureBrowser()
		const page = browser.getPage()
		const x =
			direction === "left"
				? -pixels
				: direction === "right"
					? pixels
					: 0
		const y =
			direction === "up"
				? -pixels
				: direction === "down"
					? pixels
					: 0

		await page.evaluate(
			({ deltaX, deltaY }) => {
				window.scrollBy(deltaX, deltaY)
			},
			{ deltaX: x, deltaY: y },
		)
	}

	async press(key) {
		const browser = await this._ensureBrowser()
		await browser.getPage().keyboard.press(key)
	}

	async keyEvent(eventType, key, code, text) {
		const browser = await this._ensureBrowser()
		await browser.injectKeyboardEvent({
			type: eventType,
			key,
			code,
			text,
		})
	}

	async insertText(text) {
		const browser = await this._ensureBrowser()
		await browser.getPage().keyboard.insertText(text)
	}

	async createTab(url) {
		const browser = await this._ensureBrowser()
		await browser.newTab()
		await this._applyViewportToActivePage()
		if (url && url !== "about:blank") {
			await browser.getPage().goto(url, { waitUntil: "domcontentloaded" })
		}
	}

	async activateTab(tabIndex) {
		const browser = await this._ensureBrowser()
		await browser.switchTo(tabIndex)
		await this._applyViewportToActivePage()
	}

	async closeTab(tabIndex) {
		const browser = await this._ensureBrowser()
		const pages = browser.getPages()
		const resolvedIndex =
			typeof tabIndex === "number" ? tabIndex : browser.getActiveIndex()
		if (resolvedIndex < 0 || resolvedIndex >= pages.length) {
			throw new Error(`Invalid tab index: ${resolvedIndex}`)
		}
		if (pages.length === 1) {
			throw new Error('Cannot close the last tab. Use "close" to close the browser.')
		}

		await pages[resolvedIndex].close()
		await this._applyViewportToActivePage()
	}

	async screenshotBuffer() {
		const browser = await this._ensureBrowser()
		return browser.getPage().screenshot({
			type: "png",
			scale: "device",
		})
	}

	async snapshot(options = {}) {
		const browser = await this._ensureBrowser()
		const { tree, refs } = await browser.getSnapshot({
			interactive: options.interactive,
		})

		const simpleRefs = {}
		for (const [ref, data] of Object.entries(refs)) {
			simpleRefs[ref] = {
				role: data.role,
				name: data.name,
			}
		}

		return {
			snapshot: tree || "Empty page",
			refs: Object.keys(simpleRefs).length > 0 ? simpleRefs : undefined,
		}
	}

	isScreencasting() {
		return this._browser?.isScreencasting?.() === true
	}

	async startScreencast(callback) {
		const browser = await this._ensureBrowser()
		await browser.startScreencast(callback, {
			format: "jpeg",
			quality: DEFAULT_SCREENCAST_QUALITY,
			maxWidth: Math.min(
				Math.round(this._viewport.width * this._deviceScaleFactor),
				DEFAULT_SCREENCAST_MAX_WIDTH,
			),
			maxHeight: Math.min(
				Math.round(this._viewport.height * this._deviceScaleFactor),
				DEFAULT_SCREENCAST_MAX_HEIGHT,
			),
			everyNthFrame: 1,
		})
	}

	async stopScreencast() {
		if (!this._browser) {
			return
		}

		await this._browser.stopScreencast().catch(() => {})
	}

	async close() {
		if (!this._browser) {
			return
		}

		const browser = this._browser
		this._browser = null
		await browser.close().catch(() => {})
	}
}

module.exports = {
	AgentBrowserRuntime,
	DEFAULT_DEVICE_SCALE_FACTOR,
	DEFAULT_VIEWPORT,
	DEFAULT_SCREENCAST_QUALITY,
	DEFAULT_SCREENCAST_MAX_WIDTH,
	DEFAULT_SCREENCAST_MAX_HEIGHT,
	loadBrowserManagerClass,
}
