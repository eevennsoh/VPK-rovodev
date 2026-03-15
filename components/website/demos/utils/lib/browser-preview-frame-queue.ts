export interface BrowserPreviewFrameQueueState {
	inflightFrameSrc: string | null
	pendingFrameSrc: string | null
}

export function createBrowserPreviewFrameQueueState(): BrowserPreviewFrameQueueState {
	return {
		inflightFrameSrc: null,
		pendingFrameSrc: null,
	}
}

export function enqueueBrowserPreviewFrame(
	state: BrowserPreviewFrameQueueState,
	frameSrc: string,
) {
	if (!state.inflightFrameSrc) {
		return {
			nextState: {
				inflightFrameSrc: frameSrc,
				pendingFrameSrc: null,
			},
			frameSrcToLoad: frameSrc,
		}
	}

	if (state.inflightFrameSrc === frameSrc || state.pendingFrameSrc === frameSrc) {
		return {
			nextState: state,
			frameSrcToLoad: null,
		}
	}

	return {
		nextState: {
			inflightFrameSrc: state.inflightFrameSrc,
			pendingFrameSrc: frameSrc,
		},
		frameSrcToLoad: null,
	}
}

export function completeBrowserPreviewFrameLoad(
	state: BrowserPreviewFrameQueueState,
) {
	if (!state.pendingFrameSrc) {
		return {
			nextState: createBrowserPreviewFrameQueueState(),
			frameSrcToLoad: null,
		}
	}

	return {
		nextState: {
			inflightFrameSrc: state.pendingFrameSrc,
			pendingFrameSrc: null,
		},
		frameSrcToLoad: state.pendingFrameSrc,
	}
}
