const test = require("node:test")
const assert = require("node:assert/strict")

const {
	AgentBrowserRuntime,
	DEFAULT_SCREENCAST_MAX_HEIGHT,
	DEFAULT_SCREENCAST_MAX_WIDTH,
	DEFAULT_SCREENCAST_QUALITY,
} = require("./browser-workspace-runtime")

test("browser workspace runtime caps screencast dimensions and uses the tuned jpeg quality", async () => {
	let capturedOptions = null
	const runtime = new AgentBrowserRuntime({
		viewport: {
			width: 1400,
			height: 1000,
		},
		deviceScaleFactor: 2,
	})

	runtime._browser = {
		startScreencast: async (_callback, options) => {
			capturedOptions = options
		},
	}

	await runtime.startScreencast(() => {})

	assert.deepEqual(capturedOptions, {
		format: "jpeg",
		quality: DEFAULT_SCREENCAST_QUALITY,
		maxWidth: DEFAULT_SCREENCAST_MAX_WIDTH,
		maxHeight: DEFAULT_SCREENCAST_MAX_HEIGHT,
		everyNthFrame: 1,
	})
})
