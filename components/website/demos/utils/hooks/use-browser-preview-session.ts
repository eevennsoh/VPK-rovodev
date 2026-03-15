"use client";

import {
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { getBrowserWorkspaceStream } from "@/lib/browser-workspace-client";
import {
	completeBrowserPreviewFrameLoad,
	createBrowserPreviewFrameQueueState,
	enqueueBrowserPreviewFrame,
} from "@/components/website/demos/utils/lib/browser-preview-frame-queue";

type PreviewStatus = "connecting" | "live" | "steady" | "fallback";

interface PreviewStateMessage {
	type: "preview-state";
	status: "live" | "steady";
	settledScreenshotRevision: number | null;
	sourceWidth: number;
	sourceHeight: number;
	pageScaleFactor?: number;
}

interface PreviewErrorMessage {
	type: "preview-error";
	message: string;
}

interface PreviewFrameMessage {
	type: "frame";
	data: string;
	metadata?: {
		deviceWidth?: number;
		deviceHeight?: number;
		pageScaleFactor?: number;
	};
}

type PreviewServerMessage =
	| PreviewStateMessage
	| PreviewErrorMessage
	| PreviewFrameMessage;

export interface BrowserPreviewSourceMetadata {
	width: number;
	height: number;
	pageScaleFactor: number;
}

export interface BrowserPreviewControlMessage {
	type:
		| "preview-click"
		| "preview-wheel"
		| "preview-key"
		| "preview-paste"
		| "preview-sync";
	[key: string]: unknown;
}

function resolveWebSocketUrl(rawUrl: string) {
	if (/^wss?:\/\//i.test(rawUrl)) {
		return rawUrl;
	}

	const baseUrl = new URL(window.location.href);
	baseUrl.protocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";
	baseUrl.pathname = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
	baseUrl.search = "";
	baseUrl.hash = "";
	return baseUrl.toString();
}

export function useBrowserPreviewSession(workspaceId: string | null) {
	const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const socketRef = useRef<WebSocket | null>(null);
	const frameLoaderRef = useRef<HTMLImageElement | null>(null);
	const frameQueueStateRef = useRef(createBrowserPreviewFrameQueueState());
	const hasReachedLiveRef = useRef(false);

	const [status, setStatus] = useState<PreviewStatus>("connecting");
	const [error, setError] = useState<string | null>(null);
	const [sourceMetadata, setSourceMetadata] =
		useState<BrowserPreviewSourceMetadata | null>(null);
	const [settledScreenshotRevision, setSettledScreenshotRevision] =
		useState<number | null>(null);
	const [canSendControl, setCanSendControl] = useState(false);

	const updateSourceMetadata = useCallback(
		(nextMetadata: BrowserPreviewSourceMetadata) => {
			setSourceMetadata((currentMetadata) => {
				if (
					currentMetadata?.width === nextMetadata.width &&
					currentMetadata?.height === nextMetadata.height &&
					currentMetadata?.pageScaleFactor === nextMetadata.pageScaleFactor
				) {
					return currentMetadata;
				}

				return nextMetadata;
			});
		},
		[],
	);

	const sendControlMessage = useCallback((message: BrowserPreviewControlMessage) => {
		const socket = socketRef.current;
		if (!socket || socket.readyState !== WebSocket.OPEN) {
			return false;
		}

		socket.send(JSON.stringify(message));
		return true;
	}, []);

	const resetFrameQueue = useCallback(() => {
		frameLoaderRef.current = null;
		frameQueueStateRef.current = createBrowserPreviewFrameQueueState();
	}, []);

	const promoteLoadedFrame = useCallback((frameImage: HTMLImageElement) => {
		const canvas = liveCanvasRef.current;
		if (!canvas) {
			return;
		}

		const width = Math.max(1, frameImage.naturalWidth || frameImage.width || 1);
		const height = Math.max(1, frameImage.naturalHeight || frameImage.height || 1);
		if (canvas.width !== width) {
			canvas.width = width;
		}
		if (canvas.height !== height) {
			canvas.height = height;
		}

		const context = canvas.getContext("2d");
		if (!context) {
			return;
		}

		context.clearRect(0, 0, width, height);
		context.drawImage(frameImage, 0, 0, width, height);
	}, []);

	const loadQueuedFrame = useCallback(
		(frameSrc: string) => {
			const loader = new window.Image();
			loader.decoding = "async";
			frameLoaderRef.current = loader;

			const settleFrameLoad = () => {
				if (frameLoaderRef.current !== loader) {
					return;
				}

				const { frameSrcToLoad, nextState } = completeBrowserPreviewFrameLoad(
					frameQueueStateRef.current,
				);
				frameLoaderRef.current = null;
				frameQueueStateRef.current = nextState;

				if (frameSrcToLoad) {
					loadQueuedFrame(frameSrcToLoad);
				}
			};

			loader.onload = () => {
				if (frameLoaderRef.current !== loader) {
					return;
				}

				promoteLoadedFrame(loader);
				settleFrameLoad();
			};

			loader.onerror = () => {
				settleFrameLoad();
			};

			loader.src = frameSrc;
		},
		[promoteLoadedFrame],
	);

	const queueLiveFrame = useCallback(
		(frameSrc: string) => {
			const { frameSrcToLoad, nextState } = enqueueBrowserPreviewFrame(
				frameQueueStateRef.current,
				frameSrc,
			);
			frameQueueStateRef.current = nextState;

			if (frameSrcToLoad) {
				loadQueuedFrame(frameSrcToLoad);
			}
		},
		[loadQueuedFrame],
	);

	useEffect(() => {
		if (!workspaceId) {
			resetFrameQueue();
			setStatus("fallback");
			setError(null);
			setCanSendControl(false);
			return;
		}

		let cancelled = false;
		let socket: WebSocket | null = null;

		function teardown() {
			setCanSendControl(false);
			socketRef.current = null;
			if (socket) {
				socket.close();
			}
		}

		setStatus("connecting");
		setError(null);
		setSourceMetadata(null);
		setSettledScreenshotRevision(null);
		hasReachedLiveRef.current = false;
		resetFrameQueue();

		void (async () => {
			try {
				const streamConfig = await getBrowserWorkspaceStream(workspaceId);
				if (cancelled) {
					return;
				}

				if (!streamConfig.enabled || !streamConfig.wsUrl) {
					throw new Error("Browser preview stream is unavailable.");
				}

				socket = new window.WebSocket(resolveWebSocketUrl(streamConfig.wsUrl));
				socketRef.current = socket;
				const activeSocket = socket;

				socket.addEventListener("open", () => {
					if (cancelled) {
						return;
					}

					setCanSendControl(true);
					activeSocket.send(JSON.stringify({ type: "preview-sync" }));
				});

				socket.addEventListener("message", (event) => {
					if (cancelled) {
						return;
					}

					try {
						const payload = JSON.parse(String(event.data)) as PreviewServerMessage;
						if (payload.type === "preview-error") {
							setError(payload.message);
							setStatus("fallback");
							setCanSendControl(false);
							return;
						}

						if (payload.type === "preview-state") {
							updateSourceMetadata({
								width: payload.sourceWidth,
								height: payload.sourceHeight,
								pageScaleFactor: payload.pageScaleFactor ?? 1,
							});
							setSettledScreenshotRevision(payload.settledScreenshotRevision);
							setStatus(payload.status);
							return;
						}

						if (payload.type === "frame" && typeof payload.data === "string") {
							const nextFrameSrc = `data:image/jpeg;base64,${payload.data}`;
							if (payload.metadata?.deviceWidth && payload.metadata?.deviceHeight) {
								updateSourceMetadata({
									width: payload.metadata.deviceWidth,
									height: payload.metadata.deviceHeight,
									pageScaleFactor: payload.metadata.pageScaleFactor ?? 1,
								});
							}
							queueLiveFrame(nextFrameSrc);
							if (!hasReachedLiveRef.current) {
								hasReachedLiveRef.current = true;
								setStatus("live");
							}
						}
					} catch {
						setError("Received malformed browser preview stream payload.");
						setStatus("fallback");
						setCanSendControl(false);
					}
				});

				socket.addEventListener("close", () => {
					if (cancelled) {
						return;
					}

					setCanSendControl(false);
					setStatus("fallback");
				});

				socket.addEventListener("error", () => {
					if (cancelled) {
						return;
					}

					setError("Browser preview connection dropped.");
					setCanSendControl(false);
					setStatus("fallback");
				});
			} catch (caughtError) {
				if (cancelled) {
					return;
				}

				setStatus("fallback");
				setCanSendControl(false);
				setError(
					caughtError instanceof Error
						? caughtError.message
						: "Failed to establish the browser preview session.",
				);
			}
		})();

		return () => {
			cancelled = true;
			resetFrameQueue();
			teardown();
		};
	}, [queueLiveFrame, resetFrameQueue, updateSourceMetadata, workspaceId]);

	return {
		liveCanvasRef,
		status,
		error,
		sourceMetadata,
		settledScreenshotRevision,
		canSendControl,
		sendControlMessage,
	};
}
