"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { FileTextIcon, MessageSquarePlusIcon } from "lucide-react";
import { FutureChatArtifactPanel } from "@/components/projects/future-chat/components/future-chat-artifact-panel";
import { FutureChatComposer } from "@/components/projects/future-chat/components/future-chat-composer";
import { FutureChatMessages } from "@/components/projects/future-chat/components/future-chat-messages";
import { FutureChatSidebar } from "@/components/projects/future-chat/components/future-chat-sidebar";
import { type FutureChatSteeringPhase } from "@/components/projects/future-chat/components/future-chat-steering-lane";
import { RealtimeVoiceBar } from "@/components/projects/future-chat/components/realtime-voice-bar";
import { useArtifactAnnotations } from "@/components/projects/future-chat/hooks/use-artifact-annotations";
import { useFutureChat } from "@/components/projects/future-chat/hooks/use-future-chat";
import {
	getFutureChatPrimaryArtifact,
	sortFutureChatArtifacts,
} from "@/components/projects/future-chat/lib/future-chat-artifacts";
import { getFutureChatShellLayout } from "@/components/projects/future-chat/lib/future-chat-shell-layout";
import { useLiveVoice } from "@/components/projects/future-chat/hooks/use-live-voice";
import {
	type DelegationRequest,
	useRealtimeVoice,
} from "@/components/projects/future-chat/hooks/use-realtime-voice";
import type { VoiceButtonState } from "@/components/ui-audio/voice-button";
import { useSidebar as useGlobalSidebar } from "@/app/contexts/context-sidebar";
import PromptGallery from "@/components/blocks/prompt-gallery/page";
import { DEFAULT_PROMPT_GALLERY_SUGGESTIONS } from "@/components/blocks/prompt-gallery/data/suggestions";
import { LeftNavigation } from "@/components/blocks/top-navigation/components/left-navigation";
import { RightNavigation } from "@/components/blocks/top-navigation/components/right-navigation";
import { useTopNavigation } from "@/components/blocks/top-navigation/hooks/use-top-navigation";
import { FUTURE_CHAT_SEPARATOR_LINE_OFFSET_PX } from "@/components/blocks/top-navigation/layout-constants";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Footer } from "@/components/ui/footer";
import { cn } from "@/lib/utils";
import { token } from "@/lib/tokens";
import {
	getMessageArtifactResult,
	getMessageInterruption,
	getMessageText,
} from "@/lib/rovo-ui-messages";

interface FutureChatShellProps {
	embedded?: boolean;
	initialThreadId?: string | null;
}

const FUTURE_CHAT_LEFT_NAV_PADDING_PX = 12;

const HOME_SUGGESTIONS = DEFAULT_PROMPT_GALLERY_SUGGESTIONS.slice(0, 3);
const DEFAULT_COMPOSER_PLACEHOLDER = "Ask, @mention, or / for skills";

function mergeContextDescriptions(
	...parts: Array<string | null | undefined>
): string | undefined {
	const mergedParts = parts
		.map((part) => part?.trim())
		.filter((part): part is string => Boolean(part));

	return mergedParts.length > 0 ? mergedParts.join("\n\n") : undefined;
}

export function FutureChatShell({
	embedded = false,
	initialThreadId = null,
}: Readonly<FutureChatShellProps>) {
	const router = useRouter();
	const nav = useTopNavigation();
	const chat = useFutureChat({ embedded, initialThreadId });
	const chatRef = useRef(chat);
	chatRef.current = chat;

	// Bridge the global sidebar context (TopNavigation toggle) with the local
	// shadcn SidebarProvider so the nav bar button controls the thread sidebar.
	const globalSidebar = useGlobalSidebar();
	const globalSidebarVisibleRef = useRef(globalSidebar.isVisible);

	useEffect(() => {
		if (globalSidebar.isVisible !== globalSidebarVisibleRef.current) {
			globalSidebarVisibleRef.current = globalSidebar.isVisible;
			chat.setSidebarOpen(globalSidebar.isVisible);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- only react to global sidebar changes
	}, [globalSidebar.isVisible]);

	useEffect(() => {
		if (chat.sidebarOpen !== globalSidebarVisibleRef.current) {
			globalSidebarVisibleRef.current = chat.sidebarOpen;
			globalSidebar.toggleSidebar();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- only react to local sidebar changes
	}, [chat.sidebarOpen]);

	const artifactContentRef = useRef<HTMLDivElement | null>(null);
	const stopSpeakingRef = useRef<() => void>(() => {});
	const skipNextAutoSpeakRef = useRef(false);
	const annotationContextRef = useRef<string | null>(null);
	const realtimeInjectContextRef = useRef<((payload: {
		type: "thread_context" | "artifact_complete" | "thread_message" | "artifact_annotations";
		summary?: string;
		role?: string;
		content?: string;
	}) => void) | null>(null);
	const pendingVoiceTranscriptRef = useRef<{
		id: number;
		text: string;
	} | null>(null);
	const voiceTranscriptIdRef = useRef(0);
	const voiceDrainEpochRef = useRef(0);
	const isDrainingVoiceRef = useRef(false);
	const futureChatSidebarStyle = {
		"--sidebar-width": `${FUTURE_CHAT_SEPARATOR_LINE_OFFSET_PX}px`,
	} as CSSProperties;
	const [steeringState, setSteeringState] = useState<{
		phase: FutureChatSteeringPhase;
		text: string | null;
	}>({
		phase: "idle",
		text: null,
	});
	const [cursorMode, setCursorMode] = useState(false);
	const [galleryExpanded, setGalleryExpanded] = useState(false);
	const [previewPrompt, setPreviewPrompt] = useState<string | null>(null);
	const [prefillText, setPrefillText] = useState<string | null>(null);

	const handleGalleryPreviewStart = useCallback((prompt: string) => {
		setPreviewPrompt(prompt);
	}, []);

	const handleGalleryPreviewEnd = useCallback(() => {
		setPreviewPrompt(null);
	}, []);

	const handleGallerySelect = useCallback((prompt: string) => {
		setPrefillText(prompt);
		setPreviewPrompt(null);
	}, []);

	const composerPlaceholder = previewPrompt ?? DEFAULT_COMPOSER_PLACEHOLDER;

	const clearSteeringState = useCallback(() => {
		setSteeringState({
			phase: "idle",
			text: null,
		});
	}, []);

	const clearPendingVoiceWork = useCallback((reason: string) => {
		voiceDrainEpochRef.current += 1;
		pendingVoiceTranscriptRef.current = null;
		clearSteeringState();
		console.info("[FutureChatVoice] Cleared pending voice work", { reason });
	}, [clearSteeringState]);

	const drainLatestVoiceTranscript = useCallback(() => {
		if (isDrainingVoiceRef.current) {
			return;
		}

		isDrainingVoiceRef.current = true;
		const drainEpoch = voiceDrainEpochRef.current;

		void (async () => {
			try {
				while (true) {
					const pendingTranscript = pendingVoiceTranscriptRef.current;
					if (!pendingTranscript) {
						return;
					}

					const shouldArtifactSteer = chatRef.current.isArtifactOpen;
					if (!shouldArtifactSteer) {
						await chatRef.current.interruptActiveTurn({
							source: "voice-barge-in",
						});
					}

					if (voiceDrainEpochRef.current !== drainEpoch) {
						return;
					}

					if (pendingVoiceTranscriptRef.current?.id !== pendingTranscript.id) {
						console.info("[FutureChatVoice] Dropped stale finalized transcript", {
							droppedTranscriptId: pendingTranscript.id,
							latestTranscriptId: pendingVoiceTranscriptRef.current?.id ?? null,
						});
						continue;
					}

					pendingVoiceTranscriptRef.current = null;
					console.info("[FutureChatVoice] Submitting finalized transcript", {
						transcriptId: pendingTranscript.id,
						length: pendingTranscript.text.length,
					});
					setSteeringState({
						phase: shouldArtifactSteer ? "applying" : "idle",
						text: shouldArtifactSteer ? pendingTranscript.text : null,
					});
					const annotationContext = annotationContextRef.current ?? undefined;
					if (shouldArtifactSteer) {
						void chatRef.current.applyVoiceSteer({
							contextDescription: annotationContext,
							text: pendingTranscript.text,
						}).catch((error) => {
							clearSteeringState();
							console.error("[FutureChatVoice] Voice steer submission failed:", error);
						});
					} else {
						void chatRef.current.submitPrompt({
							contextDescription: annotationContext,
							text: pendingTranscript.text,
							files: [],
						}).catch((error) => {
							console.error("[FutureChatVoice] Voice transcript submission failed:", error);
						});
					}

					// Let the newly-submitted turn start before checking for a newer transcript.
					await Promise.resolve();
				}
			} finally {
				isDrainingVoiceRef.current = false;
				if (pendingVoiceTranscriptRef.current) {
					drainLatestVoiceTranscript();
				}
			}
		})().catch((error) => {
			console.error("[FutureChatVoice] Voice drain failed:", error);
		});
	}, [clearSteeringState]);

	const voice = useLiveVoice({
		onBargeInStart: useCallback(() => {
			stopSpeakingRef.current();
			if (chatRef.current.isArtifactOpen) {
				if (chatRef.current.isStreaming) {
					skipNextAutoSpeakRef.current = true;
				}
				setSteeringState((currentState) =>
					currentState.phase === "pending" || currentState.phase === "applying"
						? currentState
						: {
							phase: "listening",
							text: null,
						},
				);
				console.info("[FutureChatVoice] Barge-in detected for artifact steering");
				return;
			}

			if (chatRef.current.isStreaming) {
				skipNextAutoSpeakRef.current = true;
				console.info("[FutureChatVoice] Barge-in detected while assistant turn is active");
				void chatRef.current.interruptActiveTurn({
					source: "voice-barge-in",
				}).catch((error) => {
					console.error("[FutureChatVoice] Failed to interrupt active turn:", error);
				});
			}
		}, []),
		onTranscription: useCallback(
			(text: string) => {
				const trimmedText = text.trim();
				if (!trimmedText) {
					return;
				}

				const transcriptId = voiceTranscriptIdRef.current + 1;
				voiceTranscriptIdRef.current = transcriptId;
				pendingVoiceTranscriptRef.current = {
					id: transcriptId,
					text: trimmedText,
				};
				if (chatRef.current.isArtifactOpen) {
					setSteeringState({
						phase: "pending",
						text: trimmedText,
					});
				}
				console.info("[FutureChatVoice] Final transcript ready", {
					transcriptId,
					length: trimmedText.length,
				});
				drainLatestVoiceTranscript();
			},
			[drainLatestVoiceTranscript],
		),
		preferBrowserRecognition: false,
	});
	stopSpeakingRef.current = voice.stopSpeaking;
	const wasStreamingRef = useRef(false);

	// Sync voice mode state with the chat hook so contextDescription is injected
	const isVoiceActive = voice.state !== "idle";
	useEffect(() => {
		if (isVoiceActive !== chat.isVoiceMode) {
			chat.toggleVoiceMode();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- only sync when isVoiceActive changes
	}, [isVoiceActive]);

	useEffect(() => {
		setSteeringState((currentState) => {
			if (currentState.phase === "idle" || currentState.phase === "pending" || currentState.phase === "applying") {
				return currentState;
			}

			if (voice.state === "processing") {
				return {
					...currentState,
					phase: "transcribing",
				};
			}

			if (voice.state === "recording" && currentState.phase === "transcribing") {
				return {
					...currentState,
					phase: "listening",
				};
			}

			if (voice.state === "idle") {
				return {
					phase: "idle",
					text: null,
				};
			}

			return currentState;
		});
	}, [voice.state]);

	useEffect(() => {
		if (steeringState.phase !== "applying") {
			return;
		}

		if (chat.status !== "submitted" && chat.status !== "streaming") {
			return;
		}

		const timeoutId = window.setTimeout(() => {
			setSteeringState((currentState) =>
				currentState.phase === "applying"
					? {
						phase: "idle",
						text: null,
					}
					: currentState,
			);
		}, 220);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [chat.status, steeringState.phase]);

	useEffect(() => {
		if (wasStreamingRef.current && !chat.isStreaming && voice.state !== "idle") {
			if (skipNextAutoSpeakRef.current) {
				skipNextAutoSpeakRef.current = false;
				wasStreamingRef.current = chat.isStreaming;
				return;
			}

			const lastAssistantMessage = [...chat.messages]
				.reverse()
				.find((message) => message.role === "assistant");
			if (lastAssistantMessage && getMessageInterruption(lastAssistantMessage)) {
				wasStreamingRef.current = chat.isStreaming;
				return;
			}

			const text = lastAssistantMessage ? getMessageText(lastAssistantMessage) : null;
			if (text) {
				// If the response created an artifact, the text part already says
				// 'Created artifact "Title".' — use the document title directly
				// to avoid double-wrapping that confuses TTS.
				const createdArtifact = lastAssistantMessage
					? getMessageArtifactResult(lastAssistantMessage)
					: null;
				const spokenText = createdArtifact
					? `${createdArtifact.action === "update" ? "Updated" : "Created"} artifact ${createdArtifact.title}.`
					: text;
				voice.speak(spokenText);
			}
		}
		wasStreamingRef.current = chat.isStreaming;
		// eslint-disable-next-line react-hooks/exhaustive-deps -- voice.speak is stable; including voice object would cause spurious re-runs
	}, [chat.isStreaming, chat.messages, chat.documents, voice.state, voice.speak]);

	const handleToggleVoice = useCallback(() => {
		if (voice.state === "idle") {
			clearSteeringState();
			voice.start();
		} else {
			// Clear any pending transcript without incrementing the drain epoch.
			// This avoids aborting an in-flight drain mid-interrupt, which would
			// leave the active generation stopped with no replacement prompt.
			// voice.stop() disables the mic/VAD/TTS so no new transcripts arrive.
			pendingVoiceTranscriptRef.current = null;
			clearSteeringState();
			voice.stop();
		}
	}, [clearSteeringState, voice]);

	const handleStop = useCallback(async () => {
		const hadActiveTurn = chatRef.current.isStreaming;
		clearPendingVoiceWork("manual-stop");
		voice.cancelPendingTranscription();
		stopSpeakingRef.current();
		if (hadActiveTurn) {
			skipNextAutoSpeakRef.current = true;
		}
		await chat.interruptActiveTurn({ source: "user-stop" });
	}, [chat, clearPendingVoiceWork, voice]);

	const voiceButtonState: VoiceButtonState =
		voice.state === "speaking" ? "processing" : voice.state;

	// --- Realtime voice (live conversation mode) ---
	const realtime = useRealtimeVoice({
		onDelegateToRovo: useCallback(
			async (request: DelegationRequest) => {
				const c = chatRef.current;
				const contextDescription = mergeContextDescriptions(
					request.conversationSummary
						? `[Voice context] ${request.conversationSummary}`
						: undefined,
					annotationContextRef.current,
				);

				if (c.isStreaming && c.isArtifactOpen) {
					// Steer active artifact generation
					await c.applyVoiceSteer({
						contextDescription,
						text: request.prompt,
					});
				} else {
					if (c.isStreaming) {
						await c.interruptActiveTurn({ source: "voice-barge-in" });
					}
					await c.submitPrompt({
						text: request.prompt,
						files: [],
						contextDescription,
					});
				}
			},
			[],
		),
		onSpeechStarted: useCallback(() => {
			const annotationContext = annotationContextRef.current;
			if (!annotationContext) {
				return;
			}

			realtimeInjectContextRef.current?.({
				type: "artifact_annotations",
				content: annotationContext,
			});
		}, []),
		chatMessages: chat.messages,
		isGenerating: chat.isStreaming,
	});

	const isRealtimeActive = realtime.voiceState !== "idle";
	const wasRealtimeStreamingRef = useRef(false);

	useEffect(() => {
		realtimeInjectContextRef.current = realtime.injectContext;
	}, [realtime.injectContext]);

	// Inject RovoDev results back into GPT session for context continuity
	useEffect(() => {
		if (wasRealtimeStreamingRef.current && !chat.isStreaming && isRealtimeActive) {
			const lastAssistantMessage = [...chat.messages]
				.reverse()
				.find((m) => m.role === "assistant");
			if (lastAssistantMessage) {
				const text = getMessageText(lastAssistantMessage);
				const artifact = getMessageArtifactResult(lastAssistantMessage);
				const summary = artifact
					? `RovoDev ${artifact.action === "update" ? "updated" : "created"} artifact "${artifact.title}". ${text || ""}`
					: text || "RovoDev completed the task.";
				realtime.injectContext({
					type: "thread_message",
					content: summary.slice(0, 500),
				});
			}
		}
		wasRealtimeStreamingRef.current = chat.isStreaming;
	}, [chat.isStreaming, chat.messages, isRealtimeActive, realtime]);

	// Sync realtime voice mode with the chat hook's voice mode flag
	useEffect(() => {
		if (isRealtimeActive !== chat.isVoiceMode && !isVoiceActive) {
			chat.toggleVoiceMode();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- only sync when isRealtimeActive changes
	}, [isRealtimeActive]);

	const handleToggleRealtimeVoice = useCallback(() => {
		if (realtime.voiceState === "idle") {
			// Stop legacy voice if active
			if (voice.state !== "idle") {
				pendingVoiceTranscriptRef.current = null;
				clearSteeringState();
				voice.stop();
			}
			clearSteeringState();
			realtime.connect();
		} else {
			pendingVoiceTranscriptRef.current = null;
			clearSteeringState();
			realtime.disconnect();
		}
	}, [clearSteeringState, realtime, voice]);

	const visibleMessages = chat.messages.filter((message) => {
		return message.role === "user" || message.role === "assistant";
	});
	const visibleWorkspaceDocumentId = chat.visibleArtifactDocumentId;
	const workspaceDocument =
		visibleWorkspaceDocumentId &&
		chat.streamingArtifact?.documentId === visibleWorkspaceDocumentId
			? {
					id: chat.streamingArtifact.documentId ?? "streaming-artifact",
					threadId: chat.activeThreadId ?? chat.runtimeThreadId,
					title: chat.streamingArtifact.title || "Artifact draft",
					kind: chat.streamingArtifact.kind,
					sourceMessageId: null,
					createdAt: chat.streamingArtifact.createdAt,
					updatedAt: chat.streamingArtifact.updatedAt,
					versions: [
						{
							changeLabel: "Generating",
							id: "streaming",
							content: chat.streamingArtifact.content,
							createdAt: chat.streamingArtifact.updatedAt,
							title: chat.streamingArtifact.title || "Artifact draft",
						},
					],
				}
			: visibleWorkspaceDocumentId
				? chat.documents.find((document) => document.id === visibleWorkspaceDocumentId) ?? null
				: null;
	const selectedDocumentVersion =
		workspaceDocument?.versions.find((version) => version.id === chat.selectedVersionId)
		?? workspaceDocument?.versions.at(-1)
		?? null;
	const isArtifactOpen = Boolean(workspaceDocument);
	const canAnnotateWorkspaceDocument =
		workspaceDocument?.kind === "text"
		|| workspaceDocument?.kind === "code"
		|| workspaceDocument?.kind === "image";
	const annotationState = useArtifactAnnotations({
		active:
			cursorMode &&
			isArtifactOpen &&
			!chat.streamingArtifact &&
			chat.artifactMode === "preview" &&
			process.env.NODE_ENV === "development",
		documentId: workspaceDocument?.id ?? null,
		documentKind:
			workspaceDocument?.kind === "text" ||
			workspaceDocument?.kind === "code" ||
			workspaceDocument?.kind === "image"
				? workspaceDocument.kind
				: null,
		documentVersionId: selectedDocumentVersion?.id ?? null,
		containerRef: artifactContentRef,
	});
	const {
		annotations: artifactAnnotations,
		addComment: addArtifactAnnotationComment,
		clearAnnotations,
		dismissSelection: dismissArtifactSelection,
		formatContextForVoice,
		pendingSelection: pendingArtifactSelection,
		removeAnnotation: removeArtifactAnnotation,
	} = annotationState;
	const shellRef = useRef<HTMLDivElement | null>(null);
	const composerDockRef = useRef<HTMLDivElement | null>(null);
	const artifactCardOriginRef = useRef<DOMRect | null>(null);
	const artifactPreviewOriginRef = useRef<Map<string, DOMRect>>(new Map());
	const [shellSize, setShellSize] = useState({ width: 0, height: 0 });
	const [artifactOrigin, setArtifactOrigin] = useState({
		left: 0,
		top: 0,
		width: 320,
		height: 96,
	});
	const artifactLayout = getFutureChatShellLayout(shellSize.width);
	const shouldSplitArtifactPane =
		isArtifactOpen && artifactLayout.mode === "split";

	useEffect(() => {
		if (isArtifactOpen || visibleMessages.length > 0) {
			setGalleryExpanded(false);
		}
	}, [isArtifactOpen, visibleMessages.length]);

	useEffect(() => {
		const nextContext = formatContextForVoice().trim();
		annotationContextRef.current = nextContext.length > 0 ? nextContext : null;
	}, [artifactAnnotations, formatContextForVoice]);

	useEffect(() => {
		if (!isArtifactOpen) {
			setCursorMode(false);
		}
	}, [isArtifactOpen]);

	useEffect(() => {
		if (chat.streamingArtifact) {
			setCursorMode(false);
		}
	}, [chat.streamingArtifact]);

	useEffect(() => {
		if (!canAnnotateWorkspaceDocument) {
			setCursorMode(false);
		}
	}, [canAnnotateWorkspaceDocument]);

	useEffect(() => {
		clearAnnotations();
	}, [clearAnnotations, workspaceDocument?.id]);

	useEffect(() => {
		clearAnnotations();
	}, [clearAnnotations, selectedDocumentVersion?.id]);

	useEffect(() => {
		if (chat.artifactMode !== "preview") {
			setCursorMode(false);
			clearAnnotations();
		}
	}, [chat.artifactMode, clearAnnotations]);

	useEffect(() => {
		const shellElement = shellRef.current;
		if (!shellElement || typeof ResizeObserver === "undefined") {
			return;
		}

		const updateBounds = () => {
			setShellSize({
				width: shellElement.clientWidth,
				height: shellElement.clientHeight,
			});
		};

		updateBounds();
		const observer = new ResizeObserver(() => {
			updateBounds();
		});
		observer.observe(shellElement);
		return () => observer.disconnect();
	}, []);

	const handleOpenArtifactFromCard = useCallback((documentId: string, element: HTMLElement) => {
		const shellElement = shellRef.current;
		if (shellElement) {
			const shellRect = shellElement.getBoundingClientRect();
			const cardRect = element.getBoundingClientRect();
			artifactCardOriginRef.current = new DOMRect(
				cardRect.left - shellRect.left,
				cardRect.top - shellRect.top,
				cardRect.width,
				cardRect.height,
			);
		}
		void chat.openDocument(documentId);
	}, [chat]);

	const handleRegisterArtifactCard = useCallback((documentId: string, element: HTMLElement) => {
		const shellElement = shellRef.current;
		if (!shellElement) {
			return;
		}

		const shellRect = shellElement.getBoundingClientRect();
		const cardRect = element.getBoundingClientRect();
		artifactPreviewOriginRef.current.set(
			documentId,
			new DOMRect(
				cardRect.left - shellRect.left,
				cardRect.top - shellRect.top,
				cardRect.width,
				cardRect.height,
			),
		);
	}, []);

	useEffect(() => {
		if (!isArtifactOpen) {
			return;
		}

		const cardOrigin = artifactCardOriginRef.current;
		if (cardOrigin) {
			artifactCardOriginRef.current = null;
			setArtifactOrigin({
				left: Math.max(cardOrigin.x, 16),
				top: Math.max(cardOrigin.y, 16),
				width: Math.min(Math.max(cardOrigin.width, 260), 420),
				height: Math.min(Math.max(cardOrigin.height, 40), 140),
			});
			return;
		}

		const previewOrigin =
			workspaceDocument?.id
				? artifactPreviewOriginRef.current.get(workspaceDocument.id) ?? null
				: null;
		if (previewOrigin) {
			setArtifactOrigin({
				left: Math.max(previewOrigin.x, 16),
				top: Math.max(previewOrigin.y, 16),
				width: Math.min(Math.max(previewOrigin.width, 260), 420),
				height: Math.min(Math.max(previewOrigin.height, 40), 220),
			});
			return;
		}

		const shellElement = shellRef.current;
		const composerElement = composerDockRef.current;
		if (!shellElement || !composerElement) {
			return;
		}

		const shellRect = shellElement.getBoundingClientRect();
		const composerRect = composerElement.getBoundingClientRect();
		const nextWidth = Math.min(Math.max(composerRect.width - 56, 260), 420);
		const nextHeight = Math.min(Math.max(composerRect.height, 72), 140);
		const nextLeft = Math.max(composerRect.left - shellRect.left + 28, 16);
		const nextTop = Math.max(composerRect.top - shellRect.top + 8, 16);

		setArtifactOrigin({
			left: nextLeft,
			top: nextTop,
			width: nextWidth,
			height: nextHeight,
		});
	}, [isArtifactOpen, workspaceDocument?.id]);

	const primaryArtifact = getFutureChatPrimaryArtifact(chat.documents, chat.activeDocument?.id ?? null);
	const sortedArtifacts = sortFutureChatArtifacts(chat.documents);
	const artifactMenuItems = (() => {
		const items = sortedArtifacts.map((artifact) => ({
			id: artifact.id,
			kind: artifact.kind,
			title: artifact.title,
		}));
		const seenIds = new Set(items.map((item) => item.id));

		for (let index = chat.messages.length - 1; index >= 0; index--) {
			const artifactResult = getMessageArtifactResult(chat.messages[index]);
			if (!artifactResult || seenIds.has(artifactResult.documentId)) {
				continue;
			}

			seenIds.add(artifactResult.documentId);
			items.push({
				id: artifactResult.documentId,
				kind: artifactResult.kind,
				title: artifactResult.title,
			});
		}

		return items;
	})();

	const chatPane = (
		<>
			<FutureChatMessages
				visibleDocumentId={chat.visibleArtifactDocumentId}
				compact={isArtifactOpen}
				documents={chat.documents}
				editingMessageId={chat.editingMessageId}
				isStreaming={chat.isStreaming}
				messages={chat.messages}
				onEditMessage={chat.editMessage}
				onOpenArtifactFromCard={handleOpenArtifactFromCard}
				onRegisterArtifactCard={handleRegisterArtifactCard}
				onRegenerate={chat.regenerateLatest}
				onSelectSuggestion={chat.suggestedPrompt}
				onSetEditingMessageId={chat.setEditingMessageId}
				onVote={chat.voteOnMessage}
				pendingArtifactResult={chat.pendingArtifactResult}
				streamingArtifact={chat.streamingArtifact}
				streamingArtifactMessageId={chat.streamingArtifactMessageId}
				votes={chat.votes}
			/>

			<div
				ref={composerDockRef}
				className={cn(
					"z-10 mx-auto flex w-full flex-col gap-3 pt-3",
					visibleMessages.length > 0 && "sticky bottom-0 bg-background/90 backdrop-blur",
					isArtifactOpen ? "max-w-none" : "max-w-[800px]",
				)}
			>
				<AnimatePresence>
					{isRealtimeActive ? (
						<motion.div
							animate={{ opacity: 1, height: "auto" }}
							exit={{ opacity: 0, height: 0 }}
							initial={{ opacity: 0, height: 0 }}
							transition={{ type: "spring", stiffness: 400, damping: 30 }}
						>
							<RealtimeVoiceBar
								annotationCount={artifactAnnotations.length}
								annotationPreview={artifactAnnotations.slice(-2).map((annotation) => annotation.comment)}
								currentTranscript={realtime.currentTranscript}
								generationState={realtime.generationState}
								micStream={realtime.micStream}
								modelTranscript={realtime.modelTranscript}
								onDisconnect={handleToggleRealtimeVoice}
								voiceState={realtime.voiceState}
							/>
						</motion.div>
					) : null}
				</AnimatePresence>
				<div>
					<FutureChatComposer
						key={chat.runtimeThreadId}
						artifactTitle={workspaceDocument?.title ?? null}
						compact={isArtifactOpen}
						errorMessage={chat.inputError}
						galleryExpanded={galleryExpanded}
						micStream={realtime.micStream}
						onStop={handleStop}
						onSubmit={chat.submitPrompt}
						onToggleRealtimeVoice={handleToggleRealtimeVoice}
						onToggleVoice={handleToggleVoice}
						placeholder={composerPlaceholder}
						prefillText={prefillText}
						previewPrompt={previewPrompt}
						realtimeVoiceActive={isRealtimeActive}
						realtimeVoiceState={realtime.voiceState}
						status={chat.status}
						voiceState={voiceButtonState}
					/>
					{visibleMessages.length > 0 ? <Footer /> : null}
				</div>

				{!isArtifactOpen && visibleMessages.length === 0 ? (
					<PromptGallery
						className="mt-5"
						items={HOME_SUGGESTIONS}
						onSelect={handleGallerySelect}
						onExpandChange={setGalleryExpanded}
						onPreviewStart={handleGalleryPreviewStart}
						onPreviewEnd={handleGalleryPreviewEnd}
					/>
				) : null}
			</div>
		</>
	);

	return (
		<SidebarProvider
			className="h-svh overflow-hidden"
			defaultOpen={!embedded}
			onOpenChange={chat.setSidebarOpen}
			open={chat.sidebarOpen}
			style={futureChatSidebarStyle}
		>
			<FutureChatSidebar
				activeThreadId={chat.activeThreadId}
				onDeleteThread={(threadId) => chat.deleteThread(threadId)}
				onSelectThread={async (threadId) => {
					await chat.loadThread(threadId);
					if (embedded) {
						return;
					}
					router.push(`/future-chat/${encodeURIComponent(threadId)}`);
				}}
				threads={chat.threads}
				topOffset={!embedded}
			/>

			{!embedded ? (
				<div
					className={cn(
						"fixed top-0 left-0 z-20 flex h-12 items-center overflow-x-clip px-3 transition-[width,border-color] duration-medium ease-in-out",
						chat.sidebarOpen
							? "w-(--sidebar-width) border-r border-border"
							: "w-auto border-b border-border",
					)}
					style={{ backgroundColor: token("elevation.surface") }}
				>
					<LeftNavigation
						product="rovo"
						windowWidth={nav.windowWidth}
						isVisible={nav.isVisible}
						isAppSwitcherOpen={nav.isAppSwitcherOpen}
						hideAppSwitcher
						separatorLineOffsetPx={
							FUTURE_CHAT_SEPARATOR_LINE_OFFSET_PX - FUTURE_CHAT_LEFT_NAV_PADDING_PX
						}
						onToggleSidebar={nav.toggleSidebar}
						onToggleAppSwitcher={nav.handleToggleAppSwitcher}
						onCloseAppSwitcher={nav.handleCloseAppSwitcher}
						onNavigate={(path) => nav.handleNavigate(path === "/" ? "/future-chat" : path)}
						onHoverEnter={nav.handleHoverEnter}
						onHoverLeave={nav.handleHoverLeave}
					/>
				</div>
				) : null}

				<div className="flex min-w-0 flex-1 flex-col">
					{!embedded ? (
						<div
							className="flex h-12 shrink-0 items-center gap-2 border-b px-3"
							style={{
								borderColor: token("color.border"),
								backgroundColor: token("elevation.surface"),
							}}
						>
							<div className="mr-auto flex items-center gap-2">
								<Button
									className="h-8 gap-2 px-3"
									onClick={() => void chat.openNewChat()}
									type="button"
									variant="outline"
								>
									<MessageSquarePlusIcon className="size-4" />
									<span>New chat</span>
								</Button>
								{primaryArtifact || artifactMenuItems.length > 0 ? (
									<DropdownMenu>
										<DropdownMenuTrigger
											render={(
												<Button
													className="h-8 max-w-[13rem] gap-2 px-2 sm:max-w-[16rem]"
													type="button"
													variant="outline"
												/>
											)}
										>
											<FileTextIcon className="size-4" />
											<span className="truncate">Artifacts</span>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="start">
											<DropdownMenuGroup>
												<DropdownMenuLabel>
													{artifactMenuItems.length === 1 ? "Saved artifact" : `${artifactMenuItems.length} saved artifacts`}
												</DropdownMenuLabel>
												{artifactMenuItems.map((artifact) => (
													<DropdownMenuItem
														onClick={() => void chat.openDocument(artifact.id)}
														description={artifact.kind}
														key={artifact.id}
													>
														{artifact.title}
													</DropdownMenuItem>
												))}
											</DropdownMenuGroup>
										</DropdownMenuContent>
									</DropdownMenu>
								) : null}
							</div>
							<RightNavigation
								product="rovo"
								windowWidth={nav.windowWidth}
								onToggleChat={nav.toggleChat}
								onToggleTheme={nav.toggleTheme}
							/>
						</div>
					) : null}
					<main
						ref={shellRef}
						className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden bg-background text-foreground"
					>
						<motion.div
							layout
							transition={{
								type: "spring",
								stiffness: 300,
								damping: 30,
							}}
							style={
								shouldSplitArtifactPane
									? { width: `${artifactLayout.chatPaneWidth ?? shellSize.width}px` }
									: undefined
							}
							className={cn(
								"overscroll-behavior-contain relative z-10 flex min-w-0 touch-pan-y flex-1 flex-col bg-background",
								shouldSplitArtifactPane ? "w-full shrink-0 flex-none" : "flex-1",
							)}
						>
							{visibleMessages.length === 0 && !shouldSplitArtifactPane ? (
								<div className="min-h-[40px] flex-1 shrink" />
							) : null}
							{chatPane}
							{visibleMessages.length === 0 && !shouldSplitArtifactPane ? (
								<>
									<div className="flex-1 shrink" />
									<Footer className="shrink-0" />
								</>
							) : null}
						</motion.div>

				<AnimatePresence>
					{workspaceDocument ? (
						<>
							{shouldSplitArtifactPane ? (
								<motion.div
									animate={{ width: shellSize.width, right: 0 }}
									className="pointer-events-none absolute top-0 z-0 h-full bg-background"
									exit={{
										opacity: 0,
										transition: { delay: 0.2 },
									}}
									initial={{ opacity: 1, width: shellSize.width, right: 0 }}
									style={{ left: 0 }}
								/>
							) : null}

							<motion.div
								animate={
									!shouldSplitArtifactPane
										? {
												opacity: 1,
												x: 0,
												y: 0,
												width: shellSize.width || "100%",
												height: shellSize.height || "100%",
												borderRadius: 0,
												transition: {
													delay: 0,
													type: "spring",
													stiffness: 300,
													damping: 30,
												},
										  }
										: {
												opacity: 1,
												x: artifactLayout.artifactPaneX,
												y: 0,
												width: artifactLayout.artifactPaneWidth,
												height: shellSize.height || "100%",
												borderRadius: 0,
												transition: {
													delay: 0,
													type: "spring",
													stiffness: 300,
													damping: 30,
												},
										  }
								}
								className="absolute top-0 left-0 z-40 flex h-full flex-col overflow-hidden border-border bg-background md:border-l"
								exit={{
									opacity: 0,
									scale: 0.5,
									transition: {
										delay: 0.1,
										type: "spring",
										stiffness: 600,
										damping: 30,
									},
								}}
								initial={{
									opacity: 1,
									x: artifactOrigin.left,
									y: artifactOrigin.top,
									width: artifactOrigin.width,
									height: artifactOrigin.height,
									borderRadius: 32,
								}}
							>
								<FutureChatArtifactPanel
									annotations={artifactAnnotations}
									contentRef={artifactContentRef}
									cursorMode={cursorMode}
									document={workspaceDocument}
									draftContent={chat.streamingArtifact?.content ?? chat.artifactDraftContent}
									isStreamingArtifact={Boolean(chat.streamingArtifact)}
									mode={chat.artifactMode}
									onAddComment={addArtifactAnnotationComment}
									onClose={() => {
										if (chat.streamingArtifact?.documentId === workspaceDocument.id) {
											chat.hideArtifactPane();
											return;
										}

										chat.hideArtifactPane();
										chat.setActiveDocumentId(null);
									}}
									onCursorModeChange={
										canAnnotateWorkspaceDocument ? setCursorMode : undefined
									}
									onDelete={() => chat.deleteDocument(workspaceDocument.id)}
									onDraftChange={chat.setArtifactDraftContent}
									onDismissSelection={dismissArtifactSelection}
									onModeChange={chat.setArtifactMode}
									onRemoveAnnotation={removeArtifactAnnotation}
									onSave={chat.saveArtifactDraft}
									onVersionChange={(versionId) => {
										chat.setSelectedVersionId(versionId);
										const nextVersion =
											workspaceDocument?.versions.find((version) => version.id === versionId)
											?? selectedDocumentVersion;
										chat.setArtifactDraftContent(nextVersion?.content ?? "");
									}}
									pendingSelection={pendingArtifactSelection}
									selectedVersionId={selectedDocumentVersion?.id ?? null}
								/>
							</motion.div>
						</>
					) : null}
				</AnimatePresence>
			</main>
			</div>
		</SidebarProvider>
	);
}
