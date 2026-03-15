const test = require("node:test")
const assert = require("node:assert/strict")

const {
	completeBrowserPreviewFrameLoad,
	createBrowserPreviewFrameQueueState,
	enqueueBrowserPreviewFrame,
} = require("./browser-preview-frame-queue.ts")

test("starts loading immediately when the queue is idle", () => {
	const result = enqueueBrowserPreviewFrame(
		createBrowserPreviewFrameQueueState(),
		"frame-a",
	)

	assert.equal(result.frameSrcToLoad, "frame-a")
	assert.deepEqual(result.nextState, {
		inflightFrameSrc: "frame-a",
		pendingFrameSrc: null,
	})
})

test("keeps only the latest pending frame while a load is in flight", () => {
	const first = enqueueBrowserPreviewFrame(
		createBrowserPreviewFrameQueueState(),
		"frame-a",
	)
	const second = enqueueBrowserPreviewFrame(first.nextState, "frame-b")
	const third = enqueueBrowserPreviewFrame(second.nextState, "frame-c")

	assert.equal(second.frameSrcToLoad, null)
	assert.equal(third.frameSrcToLoad, null)
	assert.deepEqual(third.nextState, {
		inflightFrameSrc: "frame-a",
		pendingFrameSrc: "frame-c",
	})
})

test("promotes the newest queued frame after the current load settles", () => {
	const first = enqueueBrowserPreviewFrame(
		createBrowserPreviewFrameQueueState(),
		"frame-a",
	)
	const second = enqueueBrowserPreviewFrame(first.nextState, "frame-b")
	const completed = completeBrowserPreviewFrameLoad(second.nextState)

	assert.equal(completed.frameSrcToLoad, "frame-b")
	assert.deepEqual(completed.nextState, {
		inflightFrameSrc: "frame-b",
		pendingFrameSrc: null,
	})
})

test("returns to idle when there is no queued replacement frame", () => {
	const first = enqueueBrowserPreviewFrame(
		createBrowserPreviewFrameQueueState(),
		"frame-a",
	)
	const completed = completeBrowserPreviewFrameLoad(first.nextState)

	assert.equal(completed.frameSrcToLoad, null)
	assert.deepEqual(completed.nextState, {
		inflightFrameSrc: null,
		pendingFrameSrc: null,
	})
})
