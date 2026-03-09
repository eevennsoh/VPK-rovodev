"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { Input } from "@/components/ui/input";
import { API_ENDPOINTS } from "@/lib/api-config";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, ExternalLink, Loader2Icon, RotateCw, TreePine, TriangleAlertIcon, XIcon } from "lucide-react";
import { getBrowserPreviewRenderMode } from "./browser-preview-panel-state";

type PreviewTab = "browser" | "snapshot";

interface BrowserPreviewPanelProps {
	currentUrl: string | null;
	latestScreenshot: string | null;
	latestSnapshot: string | null;
	isToolRunning: boolean;
	onClose: () => void;
}

interface PreviewState {
	ready: boolean;
	title: string;
	url: string;
	viewportWidth: number;
	viewportHeight: number;
	canGoBack: boolean;
	canGoForward: boolean;
}

interface PreviewStreamConfig {
	enabled: boolean;
	port: number;
	session: string;
	wsUrl: string;
}

interface LiveFrameMetadata {
	deviceWidth: number;
	deviceHeight: number;
	pageScaleFactor?: number;
	offsetTop?: number;
	scrollOffsetX?: number;
	scrollOffsetY?: number;
}

const DEFAULT_PREVIEW_STATE: PreviewState = {
	ready: false,
	title: "",
	url: "",
	viewportWidth: 1280,
	viewportHeight: 900,
	canGoBack: false,
	canGoForward: false,
};
const LIVE_STREAM_FALLBACK_DELAY_MS = 3000;

function isNavigableUrl(value: string | null): value is string {
	return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

function normalizeComparableUrl(url: string | null): string {
	if (!url || !url.trim()) {
		return "";
	}

	try {
		return new URL(url.trim()).toString();
	} catch {
		return url.trim();
	}
}

async function readPreviewJson(response: Response): Promise<PreviewState> {
	if (!response.ok) {
		const rawText = await response.text();
		let message = "Chromium preview request failed.";

		if (rawText.trim()) {
			try {
				const parsed = JSON.parse(rawText) as {
					error?: unknown;
					details?: unknown;
				};
				if (typeof parsed.error === "string" && parsed.error.trim()) {
					message = parsed.error.trim();
				} else if (typeof parsed.details === "string" && parsed.details.trim()) {
					message = parsed.details.trim();
				} else {
					message = rawText.trim();
				}
			} catch {
				message = rawText.trim();
			}
		}

		throw new Error(message);
	}

	return (await response.json()) as PreviewState;
}

interface EmbeddedChromiumPreviewProps {
	currentUrl: string;
	isToolRunning: boolean;
}

function EmbeddedChromiumPreview({
	currentUrl,
	isToolRunning,
}: Readonly<EmbeddedChromiumPreviewProps>) {
	const [previewState, setPreviewState] = useState<PreviewState>(DEFAULT_PREVIEW_STATE);
	const [draftUrl, setDraftUrl] = useState(currentUrl);
	const [isPreviewBusy, setIsPreviewBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [streamConfig, setStreamConfig] = useState<PreviewStreamConfig | null>(null);
	const [hasLiveFrame, setHasLiveFrame] = useState(false);
	const [initialLiveFrameSrc, setInitialLiveFrameSrc] = useState<string | null>(null);
	const [liveFrameMetadata, setLiveFrameMetadata] = useState<LiveFrameMetadata | null>(null);
	const [containerViewportSize, setContainerViewportSize] = useState({
		width: 1280,
		height: 900,
	});
	const [allowScreenshotFallback, setAllowScreenshotFallback] = useState(false);
	const [screenshotVersion, setScreenshotVersion] = useState(0);
	const [displayedScreenshotSrc, setDisplayedScreenshotSrc] = useState<string | null>(null);
	// Incremented after each viewport POST completes so the WebSocket effect
	// reconnects only once the Chromium viewport is actually at the new size.
	const [viewportSequence, setViewportSequence] = useState(0);
	const isMountedRef = useRef(true);
	const lastRequestedUrlRef = useRef("");
	const liveFrameRef = useRef<HTMLImageElement | null>(null);
	const liveViewportRef = useRef<HTMLDivElement | null>(null);
	const streamSocketRef = useRef<WebSocket | null>(null);
	const hasLiveFrameRef = useRef(false);
	const lastViewportRequestRef = useRef("");

	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
			if (streamSocketRef.current) {
				streamSocketRef.current.close();
				streamSocketRef.current = null;
			}
		};
	}, []);

	useEffect(() => {
		hasLiveFrameRef.current = hasLiveFrame;
	}, [hasLiveFrame]);

	useEffect(() => {
		const nextUrl = previewState.url || currentUrl;
		setDraftUrl(nextUrl);
	}, [currentUrl, previewState.url]);

	const refreshState = useCallback(async () => {
		try {
			const response = await fetch(API_ENDPOINTS.CHROMIUM_PREVIEW, {
				cache: "no-store",
			});
			const nextState = await readPreviewJson(response);
			if (!isMountedRef.current) {
				return nextState;
			}
			setPreviewState(nextState);
			setError(null);
			if (allowScreenshotFallback) {
				setScreenshotVersion((version) => version + 1);
			}
			return nextState;
		} catch (caughtError) {
			if (isMountedRef.current) {
				setError(
					caughtError instanceof Error
						? caughtError.message
						: "Failed to refresh Chromium preview.",
				);
			}
			return null;
		}
	}, [allowScreenshotFallback]);

	const postAction = useCallback(
		async (
			action:
				| "back"
				| "forward"
				| "reload"
				| "scroll",
			body?: Record<string, unknown>,
		) => {
			setIsPreviewBusy(true);
			try {
				const response = await fetch(API_ENDPOINTS.chromiumPreviewAction(action), {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(body ?? {}),
				});
				const nextState = await readPreviewJson(response);
				if (!isMountedRef.current) {
					return;
				}
				setPreviewState(nextState);
				setError(null);
				if (allowScreenshotFallback) {
					setScreenshotVersion((version) => version + 1);
				}
			} catch (caughtError) {
				if (isMountedRef.current) {
					setError(
						caughtError instanceof Error
							? caughtError.message
							: "Chromium preview action failed.",
					);
				}
			} finally {
				if (isMountedRef.current) {
					setIsPreviewBusy(false);
				}
			}
		},
		[allowScreenshotFallback],
	);

	const navigate = useCallback(async (targetUrl: string) => {
		const trimmedUrl = targetUrl.trim();
		if (!trimmedUrl) {
			return;
		}

		setIsPreviewBusy(true);
		try {
			const response = await fetch(API_ENDPOINTS.CHROMIUM_PREVIEW, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ url: trimmedUrl }),
			});
			const nextState = await readPreviewJson(response);
			if (!isMountedRef.current) {
				return;
			}
			setPreviewState(nextState);
			setError(null);
			if (allowScreenshotFallback) {
				setScreenshotVersion((version) => version + 1);
			}
		} catch (caughtError) {
			if (isMountedRef.current) {
				setError(
					caughtError instanceof Error
						? caughtError.message
						: "Failed to navigate Chromium preview.",
				);
			}
		} finally {
			if (isMountedRef.current) {
				setIsPreviewBusy(false);
			}
		}
	}, [allowScreenshotFallback]);

	const setViewport = useCallback(
		async (width: number, height: number) => {
			const nextWidth = Math.max(320, Math.round(width));
			const nextHeight = Math.max(240, Math.round(height));
			const viewportKey = `${nextWidth}x${nextHeight}`;
			if (lastViewportRequestRef.current === viewportKey) {
				return;
			}

			lastViewportRequestRef.current = viewportKey;
			try {
				const response = await fetch(API_ENDPOINTS.chromiumPreviewAction("viewport"), {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						width: nextWidth,
						height: nextHeight,
					}),
				});
				const nextState = await readPreviewJson(response);
				if (!isMountedRef.current) {
					return;
				}
				setPreviewState(nextState);
				setError(null);
				if (allowScreenshotFallback) {
					setScreenshotVersion((version) => version + 1);
				}
			} catch (caughtError) {
				if (isMountedRef.current) {
					setError(
						caughtError instanceof Error
							? caughtError.message
							: "Failed to resize Chromium preview.",
					);
				}
			}
		},
		[allowScreenshotFallback],
	);

	useEffect(() => {
		let cancelled = false;

		const loadStreamConfig = async () => {
			try {
				const response = await fetch(API_ENDPOINTS.CHROMIUM_PREVIEW_STREAM, {
					cache: "no-store",
				});
				if (!response.ok) {
					throw new Error("Chromium preview stream unavailable.");
				}
				const config = (await response.json()) as PreviewStreamConfig;
				if (!cancelled && isMountedRef.current) {
					setStreamConfig(config);
				}
			} catch (caughtError) {
				if (!cancelled && isMountedRef.current) {
					setStreamConfig(null);
					setAllowScreenshotFallback(true);
					setError(
						caughtError instanceof Error
							? caughtError.message
							: "Chromium preview stream unavailable.",
					);
				}
			}
		};

		void loadStreamConfig();

		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		void refreshState();
	}, [refreshState]);

	useEffect(() => {
		const container = liveViewportRef.current;
		if (!container || typeof ResizeObserver === "undefined") {
			return;
		}

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry) {
				return;
			}

			const nextWidth = Math.max(320, Math.round(entry.contentRect.width));
			const nextHeight = Math.max(240, Math.round(entry.contentRect.height));
			setContainerViewportSize((current) => {
				if (
					current.width === nextWidth &&
					current.height === nextHeight
				) {
					return current;
				}

				return {
					width: nextWidth,
					height: nextHeight,
				};
			});
		});

		observer.observe(container);
		return () => observer.disconnect();
	}, []);

	// Measure the container synchronously before any useEffect fires so the
	// first setViewport call already carries the real dimensions instead of
	// the 1280×900 default.  useLayoutEffect runs before useEffect and a
	// setState inside it triggers a synchronous re-render, so all subsequent
	// effects see the correct containerViewportSize from the start.
	useLayoutEffect(() => {
		const container = liveViewportRef.current;
		if (!container) {
			return;
		}

		const rect = container.getBoundingClientRect();
		const w = Math.max(320, Math.round(rect.width));
		const h = Math.max(240, Math.round(rect.height));
		setContainerViewportSize((current) => {
			if (current.width === w && current.height === h) {
				return current;
			}

			return { width: w, height: h };
		});
	}, []);

	useEffect(() => {
		// Scale viewport by devicePixelRatio so Chromium renders at physical
		// pixel resolution.  On Retina (2×) the captured frames match the
		// display's native density, eliminating blur.
		const dpr = window.devicePixelRatio || 1;
		let cancelled = false;

		void (async () => {
			await setViewport(
				Math.round(containerViewportSize.width * dpr),
				Math.round(containerViewportSize.height * dpr),
			);
			// Signal that the viewport POST completed so the WebSocket effect
			// can (re)connect — the stream server's startScreencast will now
			// read the correct page.viewportSize().
			if (!cancelled && isMountedRef.current) {
				setViewportSequence((seq) => seq + 1);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [containerViewportSize.height, containerViewportSize.width, setViewport]);

	useEffect(() => {
		// Wait until the first viewport POST completes (viewportSequence > 0)
		// before connecting, so the stream server's startScreencast reads the
		// DPR-scaled viewport dimensions for maxWidth/maxHeight.
		if (viewportSequence === 0 || !streamConfig?.enabled || !streamConfig.wsUrl) {
			return;
		}

		// Small delay lets the stream server finish stopScreencast from a
		// previous WebSocket disconnect before the new client triggers
		// startScreencast with the updated viewport.
		let cancelled = false;
		let socket: WebSocket | null = null;
		const wsUrl = streamConfig.wsUrl;

		const delayId = window.setTimeout(() => {
			if (cancelled) {
				return;
			}

			socket = new window.WebSocket(wsUrl);
			streamSocketRef.current = socket;

			socket.addEventListener("message", (event) => {
				try {
					const payload = JSON.parse(String(event.data)) as
						| { type?: string; data?: string; metadata?: LiveFrameMetadata }
						| undefined;
					if (!payload || payload.type !== "frame" || typeof payload.data !== "string") {
						return;
					}

					const nextFrameSrc = `data:image/jpeg;base64,${payload.data}`;
					if (payload.metadata && isMountedRef.current) {
						setLiveFrameMetadata(payload.metadata);
					}
					if (liveFrameRef.current) {
						liveFrameRef.current.src = nextFrameSrc;
					} else if (isMountedRef.current) {
						setInitialLiveFrameSrc(nextFrameSrc);
					}
					if (!hasLiveFrameRef.current && isMountedRef.current) {
						setHasLiveFrame(true);
					}
				} catch {
					// Ignore malformed frame payloads.
				}
			});

			socket.addEventListener("error", () => {
				if (!hasLiveFrameRef.current && isMountedRef.current) {
					setAllowScreenshotFallback(true);
				}
			});

			socket.addEventListener("close", () => {
				if (!hasLiveFrameRef.current && isMountedRef.current) {
					setAllowScreenshotFallback(true);
				}
			});
		}, 200);

		return () => {
			cancelled = true;
			window.clearTimeout(delayId);
			if (socket) {
				socket.close();
				if (streamSocketRef.current === socket) {
					streamSocketRef.current = null;
				}
			}
		};
	}, [viewportSequence, streamConfig]);

	useEffect(() => {
		const normalizedTargetUrl = normalizeComparableUrl(currentUrl);
		if (!normalizedTargetUrl) {
			return;
		}

		setHasLiveFrame(false);
		hasLiveFrameRef.current = false;
		setInitialLiveFrameSrc(null);
		setLiveFrameMetadata(null);
		setAllowScreenshotFallback(false);

		if (lastRequestedUrlRef.current === normalizedTargetUrl) {
			return;
		}

		lastRequestedUrlRef.current = normalizedTargetUrl;
		void navigate(currentUrl);
	}, [currentUrl, navigate]);

	const screenshotSrc = useMemo(
		() =>
			API_ENDPOINTS.chromiumPreviewScreenshot(
				previewState.viewportWidth,
				previewState.viewportHeight,
				screenshotVersion,
			),
		[
			previewState.viewportHeight,
			previewState.viewportWidth,
			screenshotVersion,
		],
	);

	useEffect(() => {
		if (hasLiveFrame || allowScreenshotFallback) {
			return;
		}

		const timeoutId = window.setTimeout(() => {
			if (!hasLiveFrameRef.current && isMountedRef.current) {
				setAllowScreenshotFallback(true);
				setScreenshotVersion((version) => version + 1);
			}
		}, LIVE_STREAM_FALLBACK_DELAY_MS);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [allowScreenshotFallback, hasLiveFrame, screenshotSrc]);

	useEffect(() => {
		const intervalId = window.setInterval(() => {
			void refreshState();
		}, 2000);

		return () => {
			window.clearInterval(intervalId);
		};
	}, [refreshState]);

	useEffect(() => {
		if (!allowScreenshotFallback) {
			return;
		}

		if (!screenshotSrc) {
			return;
		}

		let cancelled = false;
		const image = new window.Image();
		image.decoding = "sync";
		image.onload = () => {
			if (!cancelled && isMountedRef.current) {
				setDisplayedScreenshotSrc(screenshotSrc);
			}
		};
		image.src = screenshotSrc;

		return () => {
			cancelled = true;
		};
	}, [allowScreenshotFallback, screenshotSrc]);

	const handleOpenInNewTab = useCallback(() => {
		const urlToOpen = previewState.url || currentUrl;
		if (isNavigableUrl(urlToOpen)) {
			window.open(urlToOpen, "_blank", "noopener,noreferrer");
		}
	}, [currentUrl, previewState.url]);

	const handleUrlKeyDown = useCallback(
		(event: ReactKeyboardEvent<HTMLInputElement>) => {
			if (event.key !== "Enter") {
				return;
			}

			event.preventDefault();
			void navigate(event.currentTarget.value);
		},
		[navigate],
	);

	const effectiveUrl = previewState.url || currentUrl;
	const isBusy = isPreviewBusy || isToolRunning;
	const shouldRenderImage =
		hasLiveFrame ||
		Boolean(displayedScreenshotSrc) ||
		previewState.ready ||
		screenshotVersion > 0;

	const sendStreamMessage = useCallback((payload: Record<string, unknown>) => {
		const socket = streamSocketRef.current;
		if (!socket || socket.readyState !== WebSocket.OPEN) {
			return;
		}

		socket.send(JSON.stringify(payload));
	}, []);

	const resolveLiveFramePoint = useCallback(
		(clientX: number, clientY: number) => {
			const container = liveViewportRef.current;
			const metadata = liveFrameMetadata;
			if (!container || !metadata?.deviceWidth || !metadata.deviceHeight) {
				return null;
			}

			const bounds = container.getBoundingClientRect();
			const availableWidth = bounds.width;
			const availableHeight = bounds.height;
			if (availableWidth <= 0 || availableHeight <= 0) {
				return null;
			}

			const scale = Math.min(
				availableWidth / metadata.deviceWidth,
				availableHeight / metadata.deviceHeight,
			);
			const renderedWidth = metadata.deviceWidth * scale;
			const renderedHeight = metadata.deviceHeight * scale;
			const offsetX = (availableWidth - renderedWidth) / 2;
			const offsetY = 0;

			const xWithinImage = clientX - bounds.left - offsetX;
			const yWithinImage = clientY - bounds.top - offsetY;

			if (
				xWithinImage < 0 ||
				yWithinImage < 0 ||
				xWithinImage > renderedWidth ||
				yWithinImage > renderedHeight
			) {
				return null;
			}

			return {
				x: Math.round(xWithinImage / scale),
				y: Math.round(yWithinImage / scale),
			};
		},
		[liveFrameMetadata],
	);

	const handleLivePointerDown = useCallback(
		(event: ReactPointerEvent<HTMLDivElement>) => {
			if (!hasLiveFrame || event.button !== 0) {
				return;
			}

			const point = resolveLiveFramePoint(event.clientX, event.clientY);
			if (!point) {
				return;
			}

			event.preventDefault();
			liveViewportRef.current?.focus();
			sendStreamMessage({
				type: "input_mouse",
				eventType: "mouseMoved",
				x: point.x,
				y: point.y,
				button: "none",
			});
			sendStreamMessage({
				type: "input_mouse",
				eventType: "mousePressed",
				x: point.x,
				y: point.y,
				button: "left",
				clickCount: 1,
			});
			sendStreamMessage({
				type: "input_mouse",
				eventType: "mouseReleased",
				x: point.x,
				y: point.y,
				button: "left",
				clickCount: 1,
			});
		},
		[hasLiveFrame, resolveLiveFramePoint, sendStreamMessage],
	);

	const handleLiveWheel = useCallback(
		(event: ReactWheelEvent<HTMLDivElement>) => {
			if (!hasLiveFrame) {
				return;
			}

			const point = resolveLiveFramePoint(event.clientX, event.clientY);
			if (!point) {
				return;
			}

			event.preventDefault();
			sendStreamMessage({
				type: "input_mouse",
				eventType: "mouseWheel",
				x: point.x,
				y: point.y,
				button: "none",
				deltaX: Math.round(event.deltaX),
				deltaY: Math.round(event.deltaY),
			});
		},
		[hasLiveFrame, resolveLiveFramePoint, sendStreamMessage],
	);

	const handleLiveKeyDown = useCallback(
		(event: ReactKeyboardEvent<HTMLDivElement>) => {
			if (!hasLiveFrame) {
				return;
			}

			const isPrintableKey =
				event.key.length === 1 &&
				!event.metaKey &&
				!event.ctrlKey &&
				!event.altKey;

			event.preventDefault();
			sendStreamMessage({
				type: "input_keyboard",
				eventType: "keyDown",
				key: event.key,
				code: event.code,
				text: isPrintableKey ? event.key : undefined,
			});
			sendStreamMessage({
				type: "input_keyboard",
				eventType: "keyUp",
				key: event.key,
				code: event.code,
			});
		},
		[hasLiveFrame, sendStreamMessage],
	);

	return (
		<div className="flex h-full min-h-0 w-full min-w-0 flex-col">
			<div className="flex items-center gap-1 border-b border-border p-2">
				<button
					type="button"
					onClick={() => void postAction("back")}
					disabled={!previewState.canGoBack}
					className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
					aria-label="Back"
				>
					<ArrowLeft className="size-4" />
				</button>
				<button
					type="button"
					onClick={() => void postAction("forward")}
					disabled={!previewState.canGoForward}
					className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
					aria-label="Forward"
				>
					<ArrowRight className="size-4" />
				</button>
				<button
					type="button"
					onClick={() => void postAction("reload")}
					className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
					aria-label="Reload"
				>
					<RotateCw className="size-4" />
				</button>
				<Input
					className="h-8 flex-1 text-sm"
					value={draftUrl}
					onChange={(event) => setDraftUrl(event.target.value)}
					onKeyDown={handleUrlKeyDown}
					placeholder="Enter URL..."
					aria-label="Enter URL"
				/>
				<button
					type="button"
					onClick={handleOpenInNewTab}
					className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
					aria-label="Open in new tab"
				>
					<ExternalLink className="size-4" />
				</button>
			</div>
			<div
				ref={liveViewportRef}
				className="relative min-h-0 flex-1 overflow-hidden bg-muted/20 outline-none"
				tabIndex={hasLiveFrame ? 0 : -1}
				onPointerDown={handleLivePointerDown}
				onWheel={handleLiveWheel}
				onKeyDown={handleLiveKeyDown}
			>
				{hasLiveFrame ? (
					/* eslint-disable-next-line @next/next/no-img-element */
					<img
						ref={liveFrameRef}
						src={initialLiveFrameSrc ?? undefined}
						alt={previewState.title || "Live Chromium preview"}
						decoding="sync"
						loading="eager"
						className="size-full object-contain object-top"
					/>
				) : shouldRenderImage ? (
					/* eslint-disable-next-line @next/next/no-img-element */
					<img
						key={displayedScreenshotSrc ?? screenshotSrc}
						src={displayedScreenshotSrc ?? screenshotSrc}
						alt={previewState.title || "Embedded Chromium preview"}
						decoding="sync"
						loading="eager"
						className="size-full object-contain object-top"
					/>
				) : (
					<div className="text-text-subtle flex size-full items-center justify-center text-sm">
						Launching Chromium preview…
					</div>
				)}
				{isBusy ? (
					<div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[1px]">
						<Loader2Icon className="size-8 animate-spin text-muted-foreground" />
					</div>
				) : null}
				{error ? (
					<div className="absolute inset-x-4 bottom-4 flex items-start gap-3 rounded-lg border border-border bg-background/90 p-3 shadow-sm">
						<TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-500" />
						<div className="min-w-0">
							<p className="text-sm font-medium text-foreground">
								Chromium preview unavailable
							</p>
							<p className="mt-1 text-xs text-muted-foreground">{error}</p>
						</div>
					</div>
				) : null}
				{!error && !isBusy && isNavigableUrl(effectiveUrl) ? (
					<div className="pointer-events-none absolute right-3 bottom-3 rounded-md bg-background/85 px-2 py-1 text-[11px] text-muted-foreground shadow-sm">
						{previewState.title || effectiveUrl}
					</div>
				) : null}
			</div>
		</div>
	);
}

export function BrowserPreviewPanel({
	currentUrl,
	latestScreenshot,
	latestSnapshot,
	isToolRunning,
	onClose,
}: Readonly<BrowserPreviewPanelProps>) {
	const [activeTab, setActiveTab] = useState<PreviewTab>("browser");
	const renderMode = getBrowserPreviewRenderMode(currentUrl, latestScreenshot);

	return (
		<div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-background">
			<div className="flex items-center justify-between border-b border-border px-2 py-1.5">
				<div className="flex gap-1">
					{(["browser", "snapshot"] as const).map((tab) => (
						<button
							key={tab}
							type="button"
							onClick={() => setActiveTab(tab)}
							className={cn(
								"rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
								activeTab === tab
									? "bg-muted text-foreground shadow-sm"
									: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
							)}
						>
							{tab === "snapshot" ? (
								<span className="flex items-center gap-1">
									<TreePine className="size-3" />
									Snapshot
								</span>
							) : (
								tab
							)}
						</button>
					))}
				</div>
				<button
					type="button"
					onClick={onClose}
					className="inline-flex h-8 w-8 items-center justify-center rounded-md p-0 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
					aria-label="Close"
				>
					<XIcon className="size-4" />
				</button>
			</div>

			<div className="min-h-0 flex-1 overflow-hidden">
				{activeTab === "browser" ? (
					renderMode === "embedded" && currentUrl ? (
						<EmbeddedChromiumPreview
							currentUrl={currentUrl}
							isToolRunning={isToolRunning}
						/>
					) : renderMode === "artifact" ? (
						<div className="relative min-h-0 flex-1 overflow-auto bg-muted/20">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								src={latestScreenshot ?? ""}
								alt="Browser screenshot"
								className="w-full h-auto"
							/>
							{isToolRunning ? (
								<div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
									<Loader2Icon className="size-8 animate-spin text-muted-foreground" />
								</div>
							) : null}
						</div>
					) : (
						<div className="relative min-h-0 flex-1 overflow-auto bg-muted/20">
							<div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
								{isToolRunning ? (
									<Loader2Icon className="size-8 animate-spin text-muted-foreground" />
								) : null}
								<p className="text-sm text-muted-foreground">
									{isToolRunning
										? "Waiting for browser activity…"
										: "No browser activity yet. The agent's browser view will appear here."}
								</p>
							</div>
						</div>
					)
				) : (
					<div className="flex h-full flex-col overflow-auto p-4">
						{latestSnapshot ? (
							<pre className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-muted/30 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
								{latestSnapshot}
							</pre>
						) : (
							<div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
								{isToolRunning ? (
									<Loader2Icon className="size-8 animate-spin text-muted-foreground" />
								) : null}
								<p className="text-sm text-muted-foreground">
									{isToolRunning
										? "Capturing accessibility tree…"
										: "No snapshots yet."}
								</p>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
