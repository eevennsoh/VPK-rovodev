function removeListener(target, eventName, listener) {
	if (typeof target.off === "function") {
		target.off(eventName, listener);
		return;
	}

	if (typeof target.removeListener === "function") {
		target.removeListener(eventName, listener);
	}
}

function createAbortControllerFromRequest(req, resOrOptions, maybeOptions) {
	const hasResponse =
		resOrOptions &&
		typeof resOrOptions === "object" &&
		typeof resOrOptions.once === "function";
	const res = hasResponse ? resOrOptions : null;
	const options = hasResponse ? maybeOptions || {} : resOrOptions || {};
	const abortController = new AbortController();
	const onAbort = typeof options.onAbort === "function" ? options.onAbort : null;

	const abortFromRequest = () => {
		if (abortController.signal.aborted) {
			return;
		}

		abortController.abort();
		onAbort?.();
	};

	const abortFromResponseClose = () => {
		if (res && res.writableFinished) {
			return;
		}
		abortFromRequest();
	};

	req.on("aborted", abortFromRequest);
	if (res) {
		res.on("close", abortFromResponseClose);
	}

	return {
		abortController,
		cleanup() {
			removeListener(req, "aborted", abortFromRequest);
			if (res) {
				removeListener(res, "close", abortFromResponseClose);
			}
		},
	};
}

module.exports = {
	createAbortControllerFromRequest,
};
