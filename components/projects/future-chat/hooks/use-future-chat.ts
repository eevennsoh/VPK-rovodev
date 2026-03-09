"use client";

import type { ChatStatus } from "ai";
import type { FileUIPart } from "ai";
import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { useRouter } from "next/navigation";
import {
	startTransition,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	createFutureChatThread,
	deleteAllFutureChatThreads,
	deleteFutureChatDocument,
	deleteFutureChatThread,
	getFutureChatBackendUnavailableUserMessage,
	getFutureChatDocument,
	getFutureChatThread,
	isFutureChatBackendUnavailableError,
	listFutureChatDocuments,
	listFutureChatThreads,
	listFutureChatVotes,
	saveFutureChatDocument,
	setFutureChatVote,
	updateFutureChatThread,
} from "@/components/projects/future-chat/lib/api";
import {
	type FutureChatDocument,
	type FutureChatDocumentKind,
	type FutureChatThread,
	type FutureChatVisibility,
	type FutureChatVote,
	createFutureChatId,
} from "@/lib/future-chat-types";
import { markLastFutureChatAssistantMessageInterrupted } from "@/lib/future-chat-interruptions";
import {
	getLatestDataPart,
	getMessageText,
	type RovoMessageInterruptionSource,
	type RovoUIMessage,
} from "@/lib/rovo-ui-messages";
import { API_ENDPOINTS } from "@/lib/api-config";

interface FutureChatStreamingArtifact {
	content: string;
	documentId: string | null;
	createdAt: string;
	kind: FutureChatDocumentKind;
	status: "streaming" | "idle";
	title: string;
	updatedAt: string;
}

function deriveThreadTitle(promptText: string): string {
	const firstLine = promptText
		.split(/\r?\n/u)
		.map((line) => line.trim())
		.find((line) => line.length > 0);
	return firstLine?.slice(0, 80) || "New chat";
}

function buildThreadPersistKey(options: {
	messages: ReadonlyArray<RovoUIMessage>;
	visibility: FutureChatVisibility;
	activeDocumentId: string | null;
	title: string;
}): string {
	return JSON.stringify({
		messages: options.messages,
		visibility: options.visibility,
		activeDocumentId: options.activeDocumentId,
		title: options.title,
	});
}

function getLatestDocumentContent(document: FutureChatDocument | null): string {
	if (!document || document.versions.length === 0) {
		return "";
	}

	return document.versions[document.versions.length - 1]?.content ?? "";
}

function upsertThreadRecord(
	threads: ReadonlyArray<FutureChatThread>,
	nextThread: FutureChatThread,
): FutureChatThread[] {
	const existingIndex = threads.findIndex((thread) => thread.id === nextThread.id);
	const nextThreads = existingIndex === -1 ? [nextThread, ...threads] : [...threads];
	if (existingIndex !== -1) {
		nextThreads[existingIndex] = nextThread;
	}

	nextThreads.sort((left, right) => {
		return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
	});
	return nextThreads;
}

function upsertDocumentRecord(
	documents: ReadonlyArray<FutureChatDocument>,
	nextDocument: FutureChatDocument,
): FutureChatDocument[] {
	const withoutPrevious = documents.filter((document) => document.id !== nextDocument.id);
	return [nextDocument, ...withoutPrevious].sort((left, right) => {
		return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
	});
}

function buildVotesMap(votes: ReadonlyArray<FutureChatVote>): Record<string, "up" | "down"> {
	return votes.reduce<Record<string, "up" | "down">>((result, vote) => {
		if (vote.value === "up" || vote.value === "down") {
			result[vote.messageId] = vote.value;
		}
		return result;
	}, {});
}

function inferArtifactKind(message: RovoUIMessage, content: string): FutureChatDocumentKind {
	if (/```[\w-]*[\s\S]+```/u.test(content)) {
		return "code";
	}

	const widget = getLatestDataPart(message, "data-widget-data");
	if (widget?.data.type === "image") {
		return "image";
	}
	if (widget?.data.type === "table") {
		return "sheet";
	}

	return "text";
}

function buildArtifactContentFromMessage(message: RovoUIMessage): string {
	const text = getMessageText(message);
	if (text) {
		return text;
	}

	const widget = getLatestDataPart(message, "data-widget-data");
	if (!widget) {
		return "";
	}

	try {
		return JSON.stringify(widget.data.payload, null, 2);
	} catch {
		return String(widget.data.payload ?? "");
	}
}

const VOICE_MODE_CONTEXT = [
	"The user is in voice mode — they are speaking to you and hearing your response read aloud.",
	"Keep responses concise and conversational, suitable for text-to-speech.",
	"Avoid heavy markdown formatting, bullet lists, and code blocks unless the user explicitly asks for them.",
	"You have access to browser automation tools. When the user asks you to browse a website, use the available browser tools to navigate, take snapshots, interact with elements, and describe what you see.",
].join(" ");

function toFutureChatUserErrorMessage(error: unknown): string {
	if (isFutureChatBackendUnavailableError(error)) {
		return getFutureChatBackendUnavailableUserMessage();
	}

	return error instanceof Error ? error.message : String(error);
}

const EXPLICIT_CANCEL_DEBOUNCE_MS = 750;
const ACTIVE_TURN_STOP_TIMEOUT_MS = 1_200;

export interface FutureChatHookOptions {
	embedded?: boolean;
	initialThreadId?: string | null;
}

export interface FutureChatHookResult {
	activeDocument: FutureChatDocument | null;
	activeDocumentContent: string;
	activeThreadId: string | null;
	artifactMode: "preview" | "edit";
	artifactDraftContent: string;
	deleteAllThreads: () => Promise<void>;
	deleteDocument: (documentId: string) => Promise<void>;
	deleteThread: (threadId: string) => Promise<void>;
	documents: FutureChatDocument[];
	editMessage: (messageId: string, nextText: string) => Promise<void>;
	editingMessageId: string | null;
	inputError: string | null;
	interruptActiveTurn: (options?: {
		source: RovoMessageInterruptionSource;
	}) => Promise<void>;
	isArtifactOpen: boolean;
	isStreaming: boolean;
	isVoiceMode: boolean;
	loadThread: (threadId: string) => Promise<void>;
	messages: RovoUIMessage[];
	openDocument: (documentId: string) => Promise<void>;
	openArtifactFromMessage: (message: RovoUIMessage) => Promise<void>;
	openNewChat: () => Promise<void>;
	regenerateLatest: () => void;
	runtimeThreadId: string;
	saveArtifactDraft: () => Promise<void>;
	selectedVersionId: string | null;
	setActiveDocumentId: (documentId: string | null) => void;
	setArtifactDraftContent: (value: string) => void;
	setArtifactMode: (mode: "preview" | "edit") => void;
	setEditingMessageId: (messageId: string | null) => void;
	setSelectedVersionId: (versionId: string | null) => void;
	setSidebarOpen: (isOpen: boolean) => void;
	setThreadVisibility: (visibility: FutureChatVisibility) => void;
	sidebarOpen: boolean;
	status: ChatStatus;
	stop: () => Promise<void>;
	submitPrompt: (payload: { text: string; files: FileUIPart[] }) => Promise<void>;
	suggestedPrompt: (text: string) => Promise<void>;
	toggleVoiceMode: () => void;
	streamingArtifact: FutureChatStreamingArtifact | null;
	threads: FutureChatThread[];
	threadVisibility: FutureChatVisibility;
	votes: Record<string, "up" | "down">;
	voteOnMessage: (messageId: string, value: "up" | "down" | null) => Promise<void>;
}

export function useFutureChat({
	embedded = false,
	initialThreadId = null,
}: Readonly<FutureChatHookOptions>): FutureChatHookResult {
	const router = useRouter();
	const [draftThreadId, setDraftThreadId] = useState(() => initialThreadId ?? createFutureChatId());
	const [activeThreadId, setActiveThreadId] = useState<string | null>(initialThreadId);
	const [threads, setThreads] = useState<FutureChatThread[]>([]);
	const [documents, setDocuments] = useState<FutureChatDocument[]>([]);
	const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
	const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
	const [threadVisibility, setThreadVisibility] = useState<FutureChatVisibility>("private");
	const [sidebarOpen, setSidebarOpen] = useState(() => !embedded);
	const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
	const [artifactMode, setArtifactMode] = useState<"preview" | "edit">("preview");
	const [artifactDraftContent, setArtifactDraftContent] = useState("");
	const [streamingArtifact, setStreamingArtifact] = useState<FutureChatStreamingArtifact | null>(null);
	const [votes, setVotes] = useState<Record<string, "up" | "down">>({});
	const [inputError, setInputError] = useState<string | null>(null);
	const [isLoadingThread, setIsLoadingThread] = useState(false);
	const [isVoiceMode, setIsVoiceMode] = useState(false);
	const toggleVoiceMode = useCallback(() => setIsVoiceMode((prev) => !prev), []);
	const activeDocument = useMemo(() => {
		return documents.find((document) => document.id === activeDocumentId) ?? null;
	}, [activeDocumentId, documents]);
	const activeDocumentContent = useMemo(() => {
		return getLatestDocumentContent(activeDocument);
	}, [activeDocument]);
	const runtimeThreadId = activeThreadId ?? draftThreadId;
	const lastPersistedKeyRef = useRef<string>("");
	const isHydratingThreadRef = useRef(false);
	const activeDocumentRef = useRef<FutureChatDocument | null>(null);
	const streamingArtifactRef = useRef<FutureChatStreamingArtifact | null>(null);
	const isVoiceModeRef = useRef(isVoiceMode);
	const statusRef = useRef<ChatStatus>("ready");
	const interruptPromiseRef = useRef<Promise<void> | null>(null);
	const lastExplicitCancelAtRef = useRef(0);

	useEffect(() => {
		activeDocumentRef.current = activeDocument;
	}, [activeDocument]);

	useEffect(() => {
		streamingArtifactRef.current = streamingArtifact;
	}, [streamingArtifact]);

	useEffect(() => {
		isVoiceModeRef.current = isVoiceMode;
	}, [isVoiceMode]);

	const transport = useMemo(
		() =>
			new DefaultChatTransport<RovoUIMessage>({
				api: API_ENDPOINTS.FUTURE_CHAT_CHAT,
				prepareSendMessagesRequest: ({ messages, body }) => {
					const existingContextDescription =
						typeof body?.contextDescription === "string" &&
						body.contextDescription.trim()
							? body.contextDescription.trim()
							: null;

					const resolvedContextDescription =
						existingContextDescription ?? (isVoiceModeRef.current ? VOICE_MODE_CONTEXT : undefined);

					return {
						body: {
							...(body ?? {}),
							id: runtimeThreadId,
							messages,
							contextDescription: resolvedContextDescription,
							visibility: threadVisibility,
							artifactContext: activeDocument
								? {
									id: activeDocument.id,
									title: activeDocument.title,
									kind: activeDocument.kind,
									content: activeDocumentContent,
								}
								: undefined,
							smartGeneration: {
								enabled: true,
								surface: embedded ? "future-chat-preview" : "future-chat",
							},
						},
					};
				},
			}),
		[
			activeDocument,
			activeDocumentContent,
			embedded,
			runtimeThreadId,
			threadVisibility,
			],
	);

	const hydratePersistedArtifact = useCallback(async (documentId: string) => {
		try {
			const document = await getFutureChatDocument(documentId);
			if (!document) {
				setActiveDocumentId(null);
				setSelectedVersionId(null);
				return;
			}

			setDocuments((previousDocuments) => upsertDocumentRecord(previousDocuments, document));
			setActiveDocumentId(document.id);
			setSelectedVersionId(document.versions.at(-1)?.id ?? null);
			setArtifactDraftContent(getLatestDocumentContent(document));
			setArtifactMode("preview");
		} catch (error) {
			if (isFutureChatBackendUnavailableError(error)) {
				setInputError(getFutureChatBackendUnavailableUserMessage());
				return;
			}

			console.error("[FutureChat] Failed to hydrate streamed artifact:", error);
		}
	}, []);

	const {
		messages,
		setMessages,
		sendMessage,
		stop,
		regenerate,
		status,
	} = useChat<RovoUIMessage>({
		transport,
		onData: (dataPart) => {
			switch (dataPart.type) {
				case "data-id": {
					const now = new Date().toISOString();
					setStreamingArtifact((previousArtifact) => ({
						content: previousArtifact?.content ?? "",
						documentId: dataPart.data,
						createdAt: previousArtifact?.createdAt ?? now,
						kind: previousArtifact?.kind ?? "text",
						status: "streaming",
						title: previousArtifact?.title ?? "Artifact draft",
						updatedAt: now,
					}));
					setActiveDocumentId(dataPart.data);
					setSelectedVersionId("streaming");
					setArtifactMode("preview");
					break;
				}

				case "data-title": {
					const now = new Date().toISOString();
					setStreamingArtifact((previousArtifact) => ({
						content: previousArtifact?.content ?? "",
						documentId: previousArtifact?.documentId ?? null,
						createdAt: previousArtifact?.createdAt ?? now,
						kind: previousArtifact?.kind ?? "text",
						status: "streaming",
						title: dataPart.data,
						updatedAt: now,
					}));
					break;
				}

				case "data-kind": {
					const now = new Date().toISOString();
					setStreamingArtifact((previousArtifact) => ({
						content: previousArtifact?.content ?? "",
						documentId: previousArtifact?.documentId ?? null,
						createdAt: previousArtifact?.createdAt ?? now,
						kind: dataPart.data,
						status: "streaming",
						title: previousArtifact?.title ?? "Artifact draft",
						updatedAt: now,
					}));
					break;
				}

				case "data-clear": {
					setStreamingArtifact((previousArtifact) => {
						if (!previousArtifact) {
							return null;
						}

						return {
							...previousArtifact,
							content: "",
							status: "streaming",
							updatedAt: new Date().toISOString(),
						};
					});
					break;
				}

				case "data-textDelta":
				case "data-codeDelta": {
					const now = new Date().toISOString();
					setStreamingArtifact((previousArtifact) => ({
						content: `${previousArtifact?.content ?? ""}${dataPart.data}`,
						documentId: previousArtifact?.documentId ?? null,
						createdAt: previousArtifact?.createdAt ?? now,
						kind:
							previousArtifact?.kind ??
							(dataPart.type === "data-codeDelta" ? "code" : "text"),
						status: "streaming",
						title: previousArtifact?.title ?? "Artifact draft",
						updatedAt: now,
					}));
					break;
				}

				case "data-finish": {
					const documentId = streamingArtifactRef.current?.documentId;
					setStreamingArtifact((previousArtifact) =>
						previousArtifact
							? {
									...previousArtifact,
									status: "idle",
									updatedAt: new Date().toISOString(),
								}
							: previousArtifact,
					);
					if (documentId) {
						void hydratePersistedArtifact(documentId).finally(() => {
							setStreamingArtifact((previousArtifact) => {
								if (!previousArtifact || previousArtifact.documentId !== documentId) {
									return previousArtifact;
								}
								return null;
							});
						});
					}
					break;
				}

				default:
					break;
			}
		},
		onError: (error) => {
			const streamingDocumentId = streamingArtifactRef.current?.documentId;
			setStreamingArtifact(null);
			if (!activeDocumentRef.current && streamingDocumentId) {
				setActiveDocumentId(null);
				setSelectedVersionId(null);
				setArtifactDraftContent("");
				setArtifactMode("preview");
			}
			setInputError(toFutureChatUserErrorMessage(error));
		},
		onFinish: ({ isAbort, isError }) => {
			if (isAbort || isError) {
				return;
			}
		},
	});

	const isStreaming = status === "submitted" || status === "streaming";

	useEffect(() => {
		statusRef.current = status;
	}, [status]);

	const refreshThreads = useCallback(async () => {
		try {
			const nextThreads = await listFutureChatThreads();
			setThreads(nextThreads);
			setInputError((previousError) =>
				previousError === getFutureChatBackendUnavailableUserMessage()
					? null
					: previousError,
			);
		} catch (error) {
			if (isFutureChatBackendUnavailableError(error)) {
				setThreads([]);
				setInputError(getFutureChatBackendUnavailableUserMessage());
				return;
			}

			console.error("[FutureChat] Failed to refresh threads:", error);
		}
	}, []);

	const hydrateThreadState = useCallback(
		(thread: FutureChatThread, nextDocuments: FutureChatDocument[], nextVotes: FutureChatVote[]) => {
			isHydratingThreadRef.current = true;
			setActiveThreadId(thread.id);
			setMessages(thread.messages);
			setStreamingArtifact(null);
			setThreadVisibility(thread.visibility);
			setDocuments(nextDocuments);
			setActiveDocumentId(thread.activeDocumentId);
			setSelectedVersionId(
				thread.activeDocumentId
					? nextDocuments.find((document) => document.id === thread.activeDocumentId)?.versions.at(-1)?.id ?? null
					: null,
			);
			setVotes(buildVotesMap(nextVotes));
			const persistedKey = buildThreadPersistKey({
				messages: thread.messages,
				visibility: thread.visibility,
				activeDocumentId: thread.activeDocumentId,
				title: thread.title,
			});
			lastPersistedKeyRef.current = persistedKey;
			window.setTimeout(() => {
				isHydratingThreadRef.current = false;
			}, 0);
		},
		[setMessages],
	);

	const loadThread = useCallback(
		async (threadId: string) => {
			setInputError(null);
			setIsLoadingThread(true);
			try {
				const [thread, nextDocuments, nextVotes] = await Promise.all([
					getFutureChatThread(threadId),
					listFutureChatDocuments(threadId),
					listFutureChatVotes(threadId),
				]);
				if (!thread) {
					throw new Error("Future Chat thread not found.");
				}

				hydrateThreadState(thread, nextDocuments, nextVotes);
				setThreads((previousThreads) => upsertThreadRecord(previousThreads, thread));
			} catch (error) {
				setInputError(toFutureChatUserErrorMessage(error));
			} finally {
				setIsLoadingThread(false);
			}
		},
		[hydrateThreadState],
	);

	useEffect(() => {
		void refreshThreads();
	}, [refreshThreads]);

	useEffect(() => {
		if (initialThreadId) {
			void loadThread(initialThreadId);
		}
	}, [initialThreadId, loadThread]);

	useEffect(() => {
		setArtifactDraftContent(activeDocumentContent);
		setSelectedVersionId(activeDocument?.versions.at(-1)?.id ?? null);
	}, [activeDocument, activeDocumentContent]);

	const openNewChat = useCallback(async () => {
		if (isStreaming) {
			await stop();
		}

		const nextDraftId = createFutureChatId();
		isHydratingThreadRef.current = true;
		setDraftThreadId(nextDraftId);
		setActiveThreadId(null);
		setMessages([]);
		setStreamingArtifact(null);
		setDocuments([]);
		setActiveDocumentId(null);
		setSelectedVersionId(null);
		setVotes({});
		setThreadVisibility("private");
		setEditingMessageId(null);
		setArtifactMode("preview");
		setArtifactDraftContent("");
		lastPersistedKeyRef.current = buildThreadPersistKey({
			messages: [],
			visibility: "private",
			activeDocumentId: null,
			title: "New chat",
		});
		window.setTimeout(() => {
			isHydratingThreadRef.current = false;
		}, 0);
		if (!embedded) {
			startTransition(() => {
				router.push("/future-chat");
			});
		}
	}, [embedded, isStreaming, router, setMessages, stop]);

	const ensureThread = useCallback(
		async (seedText: string) => {
			if (activeThreadId) {
				return activeThreadId;
			}

			const nextThread = await createFutureChatThread({
				id: draftThreadId,
				title: deriveThreadTitle(seedText),
				messages: [],
				visibility: threadVisibility,
				activeDocumentId,
			});
			setActiveThreadId(nextThread.id);
			setThreads((previousThreads) => upsertThreadRecord(previousThreads, nextThread));
			lastPersistedKeyRef.current = buildThreadPersistKey({
				messages: nextThread.messages,
				visibility: nextThread.visibility,
				activeDocumentId: nextThread.activeDocumentId,
				title: nextThread.title,
			});
			if (!embedded) {
				startTransition(() => {
					router.replace(`/future-chat/${encodeURIComponent(nextThread.id)}`);
				});
			}
			return nextThread.id;
		},
		[
			activeDocumentId,
			activeThreadId,
			draftThreadId,
			embedded,
			router,
			threadVisibility,
		],
	);

	const submitPrompt = useCallback(
		async ({
			text,
			files,
		}: {
			text: string;
			files: FileUIPart[];
		}) => {
			setInputError(null);
			const trimmedText = text.trim();
			if (!trimmedText && files.length === 0) {
				return;
			}

			try {
				await ensureThread(trimmedText || files[0]?.filename || "New chat");
				await sendMessage({
					text: trimmedText,
					files,
				});
			} catch (error) {
				setInputError(toFutureChatUserErrorMessage(error));
				throw error;
			}
		},
		[ensureThread, sendMessage],
	);

	const suggestedPrompt = useCallback(
		async (text: string) => {
			try {
				await submitPrompt({ text, files: [] });
			} catch {
				// submitPrompt already sets a user-visible error state.
			}
		},
		[submitPrompt],
	);

	const requestExplicitCancel = useCallback(async () => {
		const now = Date.now();
		if (now - lastExplicitCancelAtRef.current < EXPLICIT_CANCEL_DEBOUNCE_MS) {
			return;
		}

		lastExplicitCancelAtRef.current = now;

		try {
			await fetch(API_ENDPOINTS.CHAT_CANCEL, {
				method: "POST",
			});
		} catch (error) {
			console.warn("[FutureChat] Explicit cancel request failed:", error);
		}
	}, []);

	const waitForActiveTurnToStop = useCallback(async () => {
		const startedAt = Date.now();
		while (
			statusRef.current === "submitted" ||
			statusRef.current === "streaming"
		) {
			if (Date.now() - startedAt > ACTIVE_TURN_STOP_TIMEOUT_MS) {
				return false;
			}
			await new Promise<void>((resolve) => {
				window.setTimeout(resolve, 25);
			});
		}
		return true;
	}, []);

	const interruptActiveTurn = useCallback(
		async ({
			source = "user-stop",
		}: {
			source?: RovoMessageInterruptionSource;
		} = {}) => {
			if (interruptPromiseRef.current) {
				return interruptPromiseRef.current;
			}

			const interruptPromise = (async () => {
				const hadActiveTurn =
					statusRef.current === "submitted" ||
					statusRef.current === "streaming";

				try {
					if (hadActiveTurn) {
						await Promise.allSettled([
							stop(),
							requestExplicitCancel(),
						]);

						const stoppedInTime = await waitForActiveTurnToStop();
						if (!stoppedInTime) {
							console.warn(
								"[FutureChat] Proceeding after cancel timeout while interrupting active turn.",
							);
						}
					}

					const interruptedAt = new Date().toISOString();
					let didMarkInterruptedReply = false;
					setMessages((previousMessages) => {
						const result = markLastFutureChatAssistantMessageInterrupted(
							previousMessages,
							{
								interruptedAt,
								source,
							},
						);
						didMarkInterruptedReply = result.messageId !== null;
						return didMarkInterruptedReply ? result.messages : previousMessages;
					});

					if (didMarkInterruptedReply) {
						await new Promise<void>((resolve) => {
							window.setTimeout(resolve, 0);
						});
					}
				} catch (error) {
					setInputError(toFutureChatUserErrorMessage(error));
					throw error;
				}
			})().finally(() => {
				interruptPromiseRef.current = null;
			});

			interruptPromiseRef.current = interruptPromise;
			return interruptPromise;
		},
		[requestExplicitCancel, setMessages, stop, waitForActiveTurnToStop],
	);

	const deleteThread = useCallback(
		async (threadId: string) => {
			try {
				await deleteFutureChatThread(threadId);
				setThreads((previousThreads) =>
					previousThreads.filter((thread) => thread.id !== threadId),
				);
				if (activeThreadId === threadId) {
					await openNewChat();
				}
			} catch (error) {
				setInputError(toFutureChatUserErrorMessage(error));
			}
		},
		[activeThreadId, openNewChat],
	);

	const deleteAllThreads = useCallback(async () => {
		try {
			await deleteAllFutureChatThreads();
			setThreads([]);
			await openNewChat();
		} catch (error) {
			setInputError(toFutureChatUserErrorMessage(error));
		}
	}, [openNewChat]);

	const voteOnMessage = useCallback(
		async (messageId: string, value: "up" | "down" | null) => {
			if (!activeThreadId) {
				return;
			}

			try {
				const vote = await setFutureChatVote({
					threadId: activeThreadId,
					messageId,
					value,
				});
				setVotes((previousVotes) => {
					const nextVotes = { ...previousVotes };
					if (vote.value === "up" || vote.value === "down") {
						nextVotes[messageId] = vote.value;
					} else {
						delete nextVotes[messageId];
					}
					return nextVotes;
				});
			} catch (error) {
				setInputError(toFutureChatUserErrorMessage(error));
			}
		},
		[activeThreadId],
	);

	const openArtifactFromMessage = useCallback(
		async (message: RovoUIMessage) => {
			const content = buildArtifactContentFromMessage(message);
			if (!content.trim()) {
				return;
			}

			try {
				const threadId = await ensureThread("Artifact context");
				const existingDocument = documents.find((document) => document.sourceMessageId === message.id);
				if (existingDocument) {
					setActiveDocumentId(existingDocument.id);
					setArtifactMode("preview");
					return;
				}

				const document = await saveFutureChatDocument({
					threadId,
					title: deriveThreadTitle(getMessageText(message) || "Artifact"),
					kind: inferArtifactKind(message, content),
					content,
					sourceMessageId: message.id,
				});
				setDocuments((previousDocuments) => [document, ...previousDocuments]);
				setActiveDocumentId(document.id);
				setArtifactMode("preview");
				setSelectedVersionId(document.versions.at(-1)?.id ?? null);
				setArtifactDraftContent(getLatestDocumentContent(document));
			} catch (error) {
				setInputError(toFutureChatUserErrorMessage(error));
			}
		},
		[documents, ensureThread],
	);

	const openDocument = useCallback(
		async (documentId: string) => {
			const existingDocument = documents.find((document) => document.id === documentId) ?? null;
			if (existingDocument) {
				setActiveDocumentId(existingDocument.id);
				setSelectedVersionId(existingDocument.versions.at(-1)?.id ?? null);
				setArtifactDraftContent(getLatestDocumentContent(existingDocument));
				setArtifactMode("preview");
				return;
			}

			await hydratePersistedArtifact(documentId);
		},
		[documents, hydratePersistedArtifact],
	);

	const saveArtifactDraft = useCallback(async () => {
		if (!activeDocumentId || !artifactDraftContent.trim()) {
			return;
		}

		try {
			const document = await saveFutureChatDocument({
				documentId: activeDocumentId,
				title: activeDocument?.title ?? "Artifact",
				kind: activeDocument?.kind ?? "text",
				content: artifactDraftContent,
			});
			setDocuments((previousDocuments) => {
				const withoutPrevious = previousDocuments.filter((item) => item.id !== document.id);
				return [document, ...withoutPrevious];
			});
			setSelectedVersionId(document.versions.at(-1)?.id ?? null);
			setArtifactMode("preview");
		} catch (error) {
			setInputError(toFutureChatUserErrorMessage(error));
		}
	}, [activeDocument, activeDocumentId, artifactDraftContent]);

	const deleteDocument = useCallback(
		async (documentId: string) => {
			try {
				await deleteFutureChatDocument(documentId);
				setDocuments((previousDocuments) =>
					previousDocuments.filter((document) => document.id !== documentId),
				);
				if (activeDocumentId === documentId) {
					setActiveDocumentId(null);
					setSelectedVersionId(null);
					setArtifactDraftContent("");
				}
			} catch (error) {
				setInputError(toFutureChatUserErrorMessage(error));
			}
		},
		[activeDocumentId],
	);

	const editMessage = useCallback(
		async (messageId: string, nextText: string) => {
			const trimmedText = nextText.trim();
			if (!trimmedText) {
				return;
			}

			const messageIndex = messages.findIndex((message) => message.id === messageId);
			if (messageIndex === -1) {
				return;
			}

			const updatedMessages = messages
				.slice(0, messageIndex + 1)
				.map((message, index) => {
					if (index !== messageIndex) {
						return message;
					}

					return {
						...message,
						parts: [{ type: "text" as const, text: trimmedText }],
					};
				});
			isHydratingThreadRef.current = true;
			setMessages(updatedMessages);
			window.setTimeout(() => {
				isHydratingThreadRef.current = false;
				regenerate();
			}, 0);
			setEditingMessageId(null);
		},
		[messages, regenerate, setMessages],
	);

	const regenerateLatest = useCallback(() => {
		regenerate();
	}, [regenerate]);

	useEffect(() => {
		if (!activeThreadId || isLoadingThread || isStreaming || isHydratingThreadRef.current) {
			return;
		}

		const currentThread =
			threads.find((thread) => thread.id === activeThreadId) ?? null;
		const nextTitle =
			currentThread?.title && currentThread.title.trim() !== "New chat"
				? currentThread.title
				: deriveThreadTitle(getMessageText(messages.find((message) => message.role === "user") ?? { parts: [] }));
		const nextPersistKey = buildThreadPersistKey({
			messages,
			visibility: threadVisibility,
			activeDocumentId,
			title: nextTitle,
		});
		if (nextPersistKey === lastPersistedKeyRef.current) {
			return;
		}

		let cancelled = false;
		void updateFutureChatThread(activeThreadId, {
			title: nextTitle,
			messages,
			visibility: threadVisibility,
			activeDocumentId,
		})
			.then((thread) => {
				if (cancelled) {
					return;
				}

				const persistedKey = buildThreadPersistKey({
					messages: thread.messages,
					visibility: thread.visibility,
					activeDocumentId: thread.activeDocumentId,
					title: thread.title,
				});
				lastPersistedKeyRef.current = persistedKey;
				setThreads((previousThreads) => upsertThreadRecord(previousThreads, thread));
				if (JSON.stringify(thread.messages) !== JSON.stringify(messages)) {
					isHydratingThreadRef.current = true;
					setMessages(thread.messages);
					window.setTimeout(() => {
						isHydratingThreadRef.current = false;
					}, 0);
				}
			})
			.catch((error) => {
				if (!cancelled) {
					setInputError(toFutureChatUserErrorMessage(error));
				}
			});

		return () => {
			cancelled = true;
		};
	}, [
		activeDocumentId,
		activeThreadId,
		isLoadingThread,
		isStreaming,
		messages,
		setMessages,
		threadVisibility,
		threads,
	]);

	return {
		activeDocument,
		activeDocumentContent,
		activeThreadId,
		artifactMode,
		artifactDraftContent,
		deleteAllThreads,
		deleteDocument,
		deleteThread,
		documents,
		editMessage,
		editingMessageId,
		inputError,
		interruptActiveTurn,
		isArtifactOpen: activeDocumentId !== null || streamingArtifact !== null,
		isStreaming,
		isVoiceMode,
		loadThread,
		messages,
		openDocument,
		openArtifactFromMessage,
		openNewChat,
		regenerateLatest,
		runtimeThreadId,
		saveArtifactDraft,
		selectedVersionId,
		setActiveDocumentId,
		setArtifactDraftContent,
		setArtifactMode,
		setEditingMessageId,
		setSelectedVersionId,
		setSidebarOpen,
		setThreadVisibility,
		sidebarOpen,
		status,
		stop,
		submitPrompt,
		suggestedPrompt,
		toggleVoiceMode,
		streamingArtifact,
		threads,
		threadVisibility,
		votes,
		voteOnMessage,
	};
}
