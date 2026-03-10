"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FutureChatArtifactPanel } from "@/components/projects/future-chat/components/future-chat-artifact-panel";
import { FutureChatComposer } from "@/components/projects/future-chat/components/future-chat-composer";
import { FutureChatHeader } from "@/components/projects/future-chat/components/future-chat-header";
import { FutureChatMessages } from "@/components/projects/future-chat/components/future-chat-messages";
import { FutureChatSidebar } from "@/components/projects/future-chat/components/future-chat-sidebar";
import { type FutureChatSteeringPhase } from "@/components/projects/future-chat/components/future-chat-steering-lane";
import { RealtimeVoiceBar } from "@/components/projects/future-chat/components/realtime-voice-bar";
import { useFutureChat } from "@/components/projects/future-chat/hooks/use-future-chat";
import { getFutureChatShellLayout } from "@/components/projects/future-chat/lib/future-chat-shell-layout";
import { useLiveVoice } from "@/components/projects/future-chat/hooks/use-live-voice";
import {
	type DelegationRequest,
	useRealtimeVoice,
} from "@/components/projects/future-chat/hooks/use-realtime-voice";
import type { VoiceButtonState } from "@/components/ui-audio/voice-button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
	getMessageArtifactResult,
	getMessageInterruption,
	getMessageText,
} from "@/lib/rovo-ui-messages";

interface FutureChatShellProps {
	embedded?: boolean;
	initialThreadId?: string | null;
}

export function FutureChatShell({
	embedded = false,
	initialThreadId = null,
}: Readonly<FutureChatShellProps>) {
	const router = useRouter();
	const chat = useFutureChat({ embedded, initialThreadId });
	const chatRef = useRef(chat);
	chatRef.current = chat;
	const stopSpeakingRef = useRef<() => void>(() => {});
	const skipNextAutoSpeakRef = useRef(false);
	const pendingVoiceTranscriptRef = useRef<{
		id: number;
		text: string;
	} | null>(null);
	const voiceTranscriptIdRef = useRef(0);
	const voiceDrainEpochRef = useRef(0);
	const isDrainingVoiceRef = useRef(false);
	const [steeringState, setSteeringState] = useState<{
		phase: FutureChatSteeringPhase;
		text: string | null;
	}>({
		phase: "idle",
		text: null,
	});

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
					if (shouldArtifactSteer) {
						void chatRef.current.applyVoiceSteer({
							text: pendingTranscript.text,
						}).catch((error) => {
							clearSteeringState();
							console.error("[FutureChatVoice] Voice steer submission failed:", error);
						});
					} else {
						void chatRef.current.submitPrompt({
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
				const contextDescription = request.conversationSummary
					? `[Voice context] ${request.conversationSummary}`
					: undefined;

				if (c.isStreaming && c.isArtifactOpen) {
					// Steer active artifact generation
					await c.applyVoiceSteer({ text: request.prompt });
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
		chatMessages: chat.messages,
		isGenerating: chat.isStreaming,
	});

	const isRealtimeActive = realtime.voiceState !== "idle";
	const wasRealtimeStreamingRef = useRef(false);

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

	const activeThread =
		chat.activeThreadId
			? chat.threads.find((thread) => thread.id === chat.activeThreadId) ?? null
			: null;
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

	const chatPane = (
		<>
			<FutureChatHeader
				activeArtifactId={chat.activeDocument?.id ?? null}
				artifacts={chat.documents}
				messages={chat.messages}
				onNewChat={() => void chat.openNewChat()}
				onOpenArtifact={(documentId) => void chat.openDocument(documentId)}
				onSelectVisibility={chat.setThreadVisibility}
				threadCount={chat.threads.length}
				visibility={chat.threadVisibility}
			/>

			<FutureChatMessages
				visibleDocumentId={chat.visibleArtifactDocumentId}
				activeThreadId={chat.activeThreadId}
				activeThreadTitle={activeThread?.title ?? null}
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
					"sticky bottom-0 z-10 mx-auto flex w-full flex-col gap-3 border-border/80 border-t bg-background/90 px-2 pb-3 pt-3 backdrop-blur md:px-4 md:pb-4",
					isArtifactOpen ? "max-w-none" : "max-w-4xl",
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
				<FutureChatComposer
					key={chat.runtimeThreadId}
					artifactTitle={workspaceDocument?.title ?? null}
					compact={isArtifactOpen}
					errorMessage={chat.inputError}
					onStop={handleStop}
					onSubmit={chat.submitPrompt}
					onSuggestedAction={chat.suggestedPrompt}
					onToggleRealtimeVoice={handleToggleRealtimeVoice}
					onToggleVoice={handleToggleVoice}
					realtimeVoiceActive={isRealtimeActive}
					showSuggestedActions={!isArtifactOpen && visibleMessages.length === 0}
					status={chat.status}
					voiceState={voiceButtonState}
				/>
			</div>
		</>
	);

	return (
		<SidebarProvider
			defaultOpen={!embedded}
			onOpenChange={chat.setSidebarOpen}
			open={chat.sidebarOpen}
		>
			<FutureChatSidebar
				activeThreadId={chat.activeThreadId}
				onDeleteAll={() => chat.deleteAllThreads()}
				onDeleteThread={(threadId) => chat.deleteThread(threadId)}
				onNewChat={() => chat.openNewChat()}
				onSelectThread={async (threadId) => {
					await chat.loadThread(threadId);
					if (embedded) {
						return;
					}
					router.push(`/future-chat/${encodeURIComponent(threadId)}`);
				}}
				threads={chat.threads}
			/>

			<SidebarInset className="h-svh overflow-hidden rounded-none bg-sidebar/20 shadow-none md:rounded-none md:shadow-none">
				<div ref={shellRef} className="relative flex h-full min-w-0 bg-background text-foreground">
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
						{chatPane}
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
										document={workspaceDocument}
										draftContent={chat.streamingArtifact?.content ?? chat.artifactDraftContent}
										isStreamingArtifact={Boolean(chat.streamingArtifact)}
										mode={chat.artifactMode}
										onClose={() => {
											if (chat.streamingArtifact?.documentId === workspaceDocument.id) {
												chat.hideArtifactPane();
												return;
											}

											chat.hideArtifactPane();
											chat.setActiveDocumentId(null);
										}}
										onDelete={() => chat.deleteDocument(workspaceDocument.id)}
										onDraftChange={chat.setArtifactDraftContent}
										onModeChange={chat.setArtifactMode}
										onSave={chat.saveArtifactDraft}
										onVersionChange={(versionId) => {
											chat.setSelectedVersionId(versionId);
											const nextVersion =
												workspaceDocument?.versions.find((version) => version.id === versionId)
												?? selectedDocumentVersion;
											chat.setArtifactDraftContent(nextVersion?.content ?? "");
										}}
										selectedVersionId={selectedDocumentVersion?.id ?? null}
									/>
								</motion.div>
							</>
						) : null}
					</AnimatePresence>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
