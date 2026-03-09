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
	appendFutureChatStreamingArtifactDelta,
	getFutureChatStreamingArtifactCheckpoint,
	type FutureChatStreamingArtifact,
} from "@/components/projects/future-chat/lib/future-chat-streaming-artifact";
import type { FutureChatPendingArtifactResult } from "@/components/projects/future-chat/lib/future-chat-message-artifacts";
import {
	buildFutureChatThreadPersistKey,
	shouldReplaceFutureChatRouteAfterPersistence,
} from "@/components/projects/future-chat/lib/future-chat-thread-route-sync";
import {
	filterDeletedFutureChatThreads,
	upsertFutureChatThreadRecord,
} from "@/components/projects/future-chat/lib/future-chat-thread-state";
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
	getMessageArtifactResult,
	getMessageText,
	type RovoMessageInterruptionSource,
	type RovoUIMessage,
} from "@/lib/rovo-ui-messages";
import { API_ENDPOINTS } from "@/lib/api-config";

function deriveThreadTitle(promptText: string): string {
	const firstLine = promptText
		.split(/\r?\n/u)
		.map((line) => line.trim())
		.find((line) => line.length > 0);
	return firstLine?.slice(0, 80) || "New chat";
}

function getLatestDocumentContent(document: FutureChatDocument | null): string {
	if (!document || document.versions.length === 0) {
		return "";
	}

	return document.versions[document.versions.length - 1]?.content ?? "";
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

function getFutureChatArtifactDocumentIdsFromMessages(
	messages: ReadonlyArray<RovoUIMessage>,
): string[] {
	const seenDocumentIds = new Set<string>();
	const documentIds: string[] = [];

	for (const message of messages) {
		const artifactResult = getMessageArtifactResult(message);
		if (!artifactResult?.documentId || seenDocumentIds.has(artifactResult.documentId)) {
			continue;
		}

		seenDocumentIds.add(artifactResult.documentId);
		documentIds.push(artifactResult.documentId);
	}

	return documentIds;
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

function waitForFutureChat(ms: number): Promise<void> {
	return new Promise((resolve) => {
		window.setTimeout(resolve, ms);
	});
}

const EXPLICIT_CANCEL_DEBOUNCE_MS = 750;
const ACTIVE_TURN_STOP_TIMEOUT_MS = 1_200;

interface FutureChatArtifactContextPayload {
	content: string;
	id: string;
	kind: FutureChatDocumentKind;
	title: string;
}

interface FutureChatArtifactSteeringPayload {
	preferCurrentArtifact: true;
	source: "voice";
}

function buildArtifactContextPayload(
	document: Pick<FutureChatDocument, "id" | "title" | "kind">,
	content: string,
): FutureChatArtifactContextPayload {
	return {
		content,
		id: document.id,
		kind: document.kind,
		title: document.title,
	};
}

function buildStreamingArtifactContextPayload(
	artifact: FutureChatStreamingArtifact,
): FutureChatArtifactContextPayload | null {
	if (!artifact.documentId || !artifact.content.trim()) {
		return null;
	}

	return {
		content: artifact.content,
		id: artifact.documentId,
		kind: artifact.kind,
		title: artifact.title,
	};
}

export interface FutureChatHookOptions {
	embedded?: boolean;
	initialThreadId?: string | null;
}

export interface FutureChatHookResult {
	activeDocument: FutureChatDocument | null;
	activeDocumentContent: string;
	activeThreadId: string | null;
	applyVoiceSteer: (payload: { text: string }) => Promise<void>;
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
	pendingArtifactResult: FutureChatPendingArtifactResult | null;
	hideArtifactPane: () => void;
	streamingArtifact: FutureChatStreamingArtifact | null;
	streamingArtifactMessageId: string | null;
	visibleArtifactDocumentId: string | null;
	setVisibleArtifactDocumentId: (documentId: string | null) => void;
	threads: FutureChatThread[];
	threadVisibility: FutureChatVisibility;
	votes: Record<string, "up" | "down">;
	voteOnMessage: (messageId: string, value: "up" | "down" | null) => Promise<void>;
}

function meetsStreamingAutoOpenContentThreshold(
	artifact: FutureChatStreamingArtifact | null,
): boolean {
	if (!artifact?.documentId) {
		return false;
	}

	if (artifact.kind === "sheet") {
		return artifact.content.trim().length > 0;
	}

	if (artifact.kind === "code") {
		return artifact.content.length >= 300;
	}

	if (artifact.kind === "image") {
		return artifact.content.trim().length > 0;
	}

	return artifact.content.length >= 400;
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
	const [visibleArtifactDocumentId, setVisibleArtifactDocumentId] = useState<string | null>(null);
	const [pendingArtifactResult, setPendingArtifactResult] =
		useState<FutureChatPendingArtifactResult | null>(null);
	const [streamingArtifact, setStreamingArtifact] = useState<FutureChatStreamingArtifact | null>(null);
	const [streamingArtifactMessageId, setStreamingArtifactMessageId] = useState<string | null>(null);
	const pendingArtifactAssociationRef = useRef(false);
	const [votes, setVotes] = useState<Record<string, "up" | "down">>({});
	const [inputError, setInputError] = useState<string | null>(null);
	const [isLoadingThread, setIsLoadingThread] = useState(() => initialThreadId !== null);
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
	const activeThreadIdRef = useRef<string | null>(initialThreadId);
	const activeDocumentRef = useRef<FutureChatDocument | null>(null);
	const pendingArtifactResultRef = useRef<FutureChatPendingArtifactResult | null>(null);
	const streamingArtifactRef = useRef<FutureChatStreamingArtifact | null>(null);
	const streamingArtifactMessageIdRef = useRef<string | null>(null);
	const visibleArtifactDocumentIdRef = useRef<string | null>(null);
	const lastCompletedArtifactDocumentIdRef = useRef<string | null>(null);
	const suppressedStreamingAutoOpenDocumentIdRef = useRef<string | null>(null);
	const isVoiceModeRef = useRef(isVoiceMode);
	const statusRef = useRef<ChatStatus>("ready");
	const interruptPromiseRef = useRef<Promise<void> | null>(null);
	const lastExplicitCancelAtRef = useRef(0);
	const pendingRouteThreadIdRef = useRef<string | null>(null);
	const deletedThreadIdsRef = useRef<Set<string>>(new Set());

	useEffect(() => {
		activeThreadIdRef.current = activeThreadId;
	}, [activeThreadId]);

	useEffect(() => {
		activeDocumentRef.current = activeDocument;
	}, [activeDocument]);

	useEffect(() => {
		pendingArtifactResultRef.current = pendingArtifactResult;
	}, [pendingArtifactResult]);

	useEffect(() => {
		streamingArtifactRef.current = streamingArtifact;
	}, [streamingArtifact]);

	useEffect(() => {
		streamingArtifactMessageIdRef.current = streamingArtifactMessageId;
	}, [streamingArtifactMessageId]);

	useEffect(() => {
		visibleArtifactDocumentIdRef.current = visibleArtifactDocumentId;
	}, [visibleArtifactDocumentId]);

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
					const artifactContextFromBody =
						body?.artifactContext &&
						typeof body.artifactContext === "object" &&
						"id" in body.artifactContext &&
						"title" in body.artifactContext &&
						"kind" in body.artifactContext &&
						"content" in body.artifactContext
							? body.artifactContext
							: null;
					const activeArtifactContext =
						activeDocument && artifactDraftContent.trim()
							? buildArtifactContextPayload(activeDocument, artifactDraftContent)
							: activeDocument
								? buildArtifactContextPayload(activeDocument, activeDocumentContent)
								: streamingArtifact
									? buildStreamingArtifactContextPayload(streamingArtifact)
									: null;

					const explicitThreadId =
						typeof body?.id === "string" && body.id.trim()
							? body.id.trim()
							: null;

					return {
						body: {
							...(body ?? {}),
							activeDocumentId:
								artifactContextFromBody?.id ??
								activeArtifactContext?.id ??
								activeDocumentId ??
								null,
							id: explicitThreadId ?? runtimeThreadId,
							messages,
							contextDescription: resolvedContextDescription,
							visibility: threadVisibility,
							artifactContext:
								artifactContextFromBody ??
								activeArtifactContext ??
								undefined,
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
			activeDocumentId,
			artifactDraftContent,
			activeDocumentContent,
			embedded,
			runtimeThreadId,
			streamingArtifact,
			threadVisibility,
		],
	);

	const resetPendingArtifactAssociation = useCallback(() => {
		setPendingArtifactResult(null);
		setStreamingArtifactMessageId(null);
		streamingArtifactMessageIdRef.current = null;
		pendingArtifactAssociationRef.current = false;
		lastCompletedArtifactDocumentIdRef.current = null;
		suppressedStreamingAutoOpenDocumentIdRef.current = null;
	}, []);

	const hideArtifactPane = useCallback(() => {
		const streamingDocumentId = streamingArtifactRef.current?.documentId ?? null;
		if (
			streamingDocumentId &&
			visibleArtifactDocumentId === streamingDocumentId
		) {
			suppressedStreamingAutoOpenDocumentIdRef.current = streamingDocumentId;
		}

		setVisibleArtifactDocumentId(null);
	}, [visibleArtifactDocumentId]);

	const persistActiveDocumentSelection = useCallback((documentId: string | null) => {
		const threadId = activeThreadIdRef.current;
		if (!threadId) {
			return;
		}

		void updateFutureChatThread(threadId, {
			activeDocumentId: documentId,
		})
			.then((thread) => {
				setThreads((previousThreads) =>
					upsertFutureChatThreadRecord(previousThreads, thread, {
						deletedThreadIds: deletedThreadIdsRef.current,
					}),
				);
			})
			.catch((error) => {
				console.warn(
					"[FutureChat] Failed to persist active artifact selection:",
					toFutureChatUserErrorMessage(error),
				);
			});
	}, []);

	const saveStreamingArtifactCheckpoint = useCallback(async () => {
		const checkpoint = getFutureChatStreamingArtifactCheckpoint(streamingArtifactRef.current);
		if (!checkpoint) {
			return null;
		}

		const document = await saveFutureChatDocument({
			changeLabel: "Steered checkpoint",
			documentId: checkpoint.documentId,
			title: checkpoint.title,
			kind: checkpoint.kind,
			content: checkpoint.content,
		});
		setDocuments((previousDocuments) => upsertDocumentRecord(previousDocuments, document));
		setActiveDocumentId(document.id);
		setSelectedVersionId(document.versions.at(-1)?.id ?? null);
		setArtifactDraftContent(getLatestDocumentContent(document));
		setArtifactMode("preview");
		return document;
	}, []);

	const hydratePersistedArtifact = useCallback(async (documentId: string) => {
		try {
			let document = null;
			for (let attempt = 0; attempt < 5; attempt++) {
				document = await getFutureChatDocument(documentId);
				if (document) {
					break;
				}

				await waitForFutureChat(150 * (attempt + 1));
			}

			if (!document) {
				setActiveDocumentId(null);
				setVisibleArtifactDocumentId(null);
				setSelectedVersionId(null);
				return null;
			}

			setDocuments((previousDocuments) => upsertDocumentRecord(previousDocuments, document));
			setActiveDocumentId(document.id);
			setSelectedVersionId(document.versions.at(-1)?.id ?? null);
			setArtifactDraftContent(getLatestDocumentContent(document));
			setArtifactMode("preview");
			return document;
		} catch (error) {
			if (isFutureChatBackendUnavailableError(error)) {
				setInputError(getFutureChatBackendUnavailableUserMessage());
				return null;
			}

			console.error("[FutureChat] Failed to hydrate streamed artifact:", error);
			return null;
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
			const updateArtifact = (
				patch: Partial<FutureChatStreamingArtifact>,
			) => {
				const now = new Date().toISOString();
				setStreamingArtifact((prev) => ({
					content: prev?.content ?? "",
					documentId: prev?.documentId ?? null,
					createdAt: prev?.createdAt ?? now,
					kind: prev?.kind ?? "text",
					status: "streaming" as const,
					title: prev?.title ?? "Artifact draft",
					updatedAt: now,
					...patch,
				}));
			};
			const updatePendingArtifact = (
				patch: Partial<FutureChatPendingArtifactResult>,
			) => {
				setPendingArtifactResult((prev) => ({
					action: prev?.action ?? null,
					documentId: prev?.documentId ?? null,
					kind: prev?.kind ?? "text",
					title: prev?.title ?? "Artifact draft",
					...patch,
				}));
			};

				switch (dataPart.type) {
					case "data-id":
						updateArtifact({ documentId: dataPart.data });
						updatePendingArtifact({ documentId: dataPart.data });
						suppressedStreamingAutoOpenDocumentIdRef.current = null;
						setActiveDocumentId(dataPart.data);
						persistActiveDocumentSelection(dataPart.data);
					setSelectedVersionId("streaming");
					setArtifactMode("preview");
					pendingArtifactAssociationRef.current = true;
					break;

				case "data-title":
					updateArtifact({ title: dataPart.data });
					updatePendingArtifact({ title: dataPart.data });
					break;

				case "data-kind":
					updateArtifact({ kind: dataPart.data });
					updatePendingArtifact({ kind: dataPart.data });
					break;

				case "data-clear":
					setStreamingArtifact((prev) =>
						prev
							? { ...prev, content: "", status: "streaming", updatedAt: new Date().toISOString() }
							: null,
					);
					break;

				case "data-textDelta":
				case "data-codeDelta":
					setStreamingArtifact((prev) =>
						appendFutureChatStreamingArtifactDelta({
							current: prev,
							delta: dataPart.data,
							kind: dataPart.type === "data-codeDelta" ? "code" : undefined,
							timestamp: new Date().toISOString(),
						}),
					);
					break;

				case "data-finish": {
					const documentId = streamingArtifactRef.current?.documentId;
					setStreamingArtifact((prev) =>
						prev
							? { ...prev, status: "idle", updatedAt: new Date().toISOString() }
							: prev,
					);
					if (documentId) {
						void hydratePersistedArtifact(documentId)
							.then((document) => {
								setStreamingArtifact((prev) => {
									if (!prev || prev.documentId !== documentId) {
										return prev;
									}

									if (document) {
										return null;
									}

									return visibleArtifactDocumentIdRef.current === documentId
										? prev
										: null;
								});
							});
					}
					break;
				}

				case "data-artifact-result":
					lastCompletedArtifactDocumentIdRef.current = dataPart.data.documentId;
					updatePendingArtifact({
						action: dataPart.data.action,
						documentId: dataPart.data.documentId,
						kind: dataPart.data.kind,
						title: dataPart.data.title,
					});
					break;

				default:
					break;
			}
		},
		onError: (error) => {
			const streamingDocumentId = streamingArtifactRef.current?.documentId;
			setStreamingArtifact(null);
			resetPendingArtifactAssociation();
			if (!activeDocumentRef.current && streamingDocumentId) {
				setActiveDocumentId(null);
				setVisibleArtifactDocumentId(null);
				setSelectedVersionId(null);
				setArtifactDraftContent("");
				setArtifactMode("preview");
			}
			setInputError(toFutureChatUserErrorMessage(error));
		},
		onFinish: () => {},
	});

	const isStreaming = status === "submitted" || status === "streaming";

	useEffect(() => {
		statusRef.current = status;
	}, [status]);

	useEffect(() => {
		if (!pendingArtifactAssociationRef.current) return;
		if (streamingArtifactMessageId) return;
		const lastMessage = messages[messages.length - 1];
		if (lastMessage?.role === "assistant") {
			pendingArtifactAssociationRef.current = false;
			setStreamingArtifactMessageId(lastMessage.id);
			streamingArtifactMessageIdRef.current = lastMessage.id;
			const documentId = streamingArtifactRef.current?.documentId;
			if (documentId) {
				void saveFutureChatDocument({
					documentId,
					sourceMessageId: lastMessage.id,
				}).then((updatedDocument) => {
					setDocuments((prev) => upsertDocumentRecord(prev, updatedDocument));
				}).catch((error) => {
					console.warn("[FutureChat] Failed to persist sourceMessageId:", error);
				});
			}
		}
	}, [messages, streamingArtifactMessageId]);

	useEffect(() => {
		if (!streamingArtifactMessageId) {
			return;
		}

		const associatedMessage = messages.find(
			(message) => message.id === streamingArtifactMessageId && message.role === "assistant",
		);
		if (!associatedMessage || !getMessageArtifactResult(associatedMessage)) {
			return;
		}

		setPendingArtifactResult(null);
	}, [messages, streamingArtifactMessageId]);

	useEffect(() => {
		const currentStreamingArtifact = streamingArtifact;
		if (!currentStreamingArtifact || !currentStreamingArtifact.documentId) {
			return;
		}
		const streamingDocumentId = currentStreamingArtifact.documentId;

		if (visibleArtifactDocumentId === streamingDocumentId) {
			return;
		}

		if (suppressedStreamingAutoOpenDocumentIdRef.current === streamingDocumentId) {
			return;
		}

		if (!meetsStreamingAutoOpenContentThreshold(currentStreamingArtifact)) {
			return;
		}

		const createdAt = Date.parse(currentStreamingArtifact.createdAt);
		const remainingDelay = Number.isFinite(createdAt)
			? Math.max(0, 600 - (Date.now() - createdAt))
			: 0;

		if (remainingDelay === 0) {
			setVisibleArtifactDocumentId(streamingDocumentId);
			return;
		}

		const timeoutId = window.setTimeout(() => {
			if (
				streamingArtifactRef.current?.documentId === streamingDocumentId &&
				suppressedStreamingAutoOpenDocumentIdRef.current !== streamingDocumentId &&
				meetsStreamingAutoOpenContentThreshold(streamingArtifactRef.current)
			) {
				setVisibleArtifactDocumentId(streamingDocumentId);
			}
		}, remainingDelay);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [streamingArtifact, visibleArtifactDocumentId]);

	useEffect(() => {
		const completedDocumentId = lastCompletedArtifactDocumentIdRef.current;
		if (
			!completedDocumentId ||
			isStreaming ||
			visibleArtifactDocumentId !== null ||
			suppressedStreamingAutoOpenDocumentIdRef.current === completedDocumentId
		) {
			return;
		}

		const completedDocument = documents.find(
			(document) => document.id === completedDocumentId,
		);
		if (!completedDocument) {
			return;
		}

		lastCompletedArtifactDocumentIdRef.current = null;
		setVisibleArtifactDocumentId(completedDocumentId);
	}, [documents, isStreaming, visibleArtifactDocumentId]);

	const refreshThreads = useCallback(async () => {
		try {
			const nextThreads = await listFutureChatThreads();
			setThreads(
				filterDeletedFutureChatThreads(
					nextThreads,
					deletedThreadIdsRef.current,
				),
			);
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
			activeThreadIdRef.current = thread.id;
			setActiveThreadId(thread.id);
			setMessages(thread.messages);
			setStreamingArtifact(null);
			resetPendingArtifactAssociation();
			setThreadVisibility(thread.visibility);
			setDocuments(nextDocuments);
			setActiveDocumentId(thread.activeDocumentId);
			setVisibleArtifactDocumentId(thread.activeDocumentId);
			setSelectedVersionId(
				thread.activeDocumentId
					? nextDocuments.find((document) => document.id === thread.activeDocumentId)?.versions.at(-1)?.id ?? null
					: null,
			);
			setVotes(buildVotesMap(nextVotes));
			const persistedKey = buildFutureChatThreadPersistKey({
				messages: thread.messages,
				visibility: thread.visibility,
				activeDocumentId: thread.activeDocumentId,
				title: thread.title,
			});
			lastPersistedKeyRef.current = persistedKey;
			pendingRouteThreadIdRef.current = null;
			window.setTimeout(() => {
				isHydratingThreadRef.current = false;
			}, 0);
		},
		[resetPendingArtifactAssociation, setMessages],
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
				if (deletedThreadIdsRef.current.has(thread.id)) {
					return;
				}

				const referencedDocumentIds = getFutureChatArtifactDocumentIdsFromMessages(thread.messages);
				const missingDocumentIds = referencedDocumentIds.filter(
					(documentId) => !nextDocuments.some((document) => document.id === documentId),
				);
				const recoveredDocuments = (
					await Promise.all(missingDocumentIds.map((documentId) => getFutureChatDocument(documentId)))
				).filter((document): document is FutureChatDocument => Boolean(document));
				const hydratedDocuments = recoveredDocuments.reduce(
					(previousDocuments, document) => upsertDocumentRecord(previousDocuments, document),
					nextDocuments,
				);

				hydrateThreadState(thread, hydratedDocuments, nextVotes);
				setThreads((previousThreads) =>
					upsertFutureChatThreadRecord(previousThreads, thread, {
						deletedThreadIds: deletedThreadIdsRef.current,
					}),
				);
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
		activeThreadIdRef.current = null;
		setActiveThreadId(null);
		setMessages([]);
		setStreamingArtifact(null);
		resetPendingArtifactAssociation();
		setDocuments([]);
		setActiveDocumentId(null);
		setVisibleArtifactDocumentId(null);
		setSelectedVersionId(null);
		setVotes({});
		setThreadVisibility("private");
		setEditingMessageId(null);
		setArtifactMode("preview");
		setArtifactDraftContent("");
		lastPersistedKeyRef.current = buildFutureChatThreadPersistKey({
			messages: [],
			visibility: "private",
			activeDocumentId: null,
			title: "New chat",
		});
		pendingRouteThreadIdRef.current = null;
		window.setTimeout(() => {
			isHydratingThreadRef.current = false;
		}, 0);
		if (!embedded) {
			startTransition(() => {
				router.push("/future-chat");
			});
		}
	}, [embedded, isStreaming, resetPendingArtifactAssociation, router, setMessages, stop]);

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
			activeThreadIdRef.current = nextThread.id;
			setActiveThreadId(nextThread.id);
			setThreads((previousThreads) =>
				upsertFutureChatThreadRecord(previousThreads, nextThread, {
					deletedThreadIds: deletedThreadIdsRef.current,
				}),
			);
			lastPersistedKeyRef.current = buildFutureChatThreadPersistKey({
				messages: nextThread.messages,
				visibility: nextThread.visibility,
				activeDocumentId: nextThread.activeDocumentId,
				title: nextThread.title,
			});
			if (!embedded) {
				pendingRouteThreadIdRef.current = nextThread.id;
			}
			return nextThread.id;
		},
		[
			activeDocumentId,
			activeThreadId,
			draftThreadId,
			embedded,
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
				const resolvedArtifactContext =
					activeDocument && artifactDraftContent.trim()
						? buildArtifactContextPayload(activeDocument, artifactDraftContent)
						: activeDocument
							? buildArtifactContextPayload(activeDocument, activeDocumentContent)
							: streamingArtifact
								? buildStreamingArtifactContextPayload(streamingArtifact)
								: null;
				const threadId = await ensureThread(trimmedText || files[0]?.filename || "New chat");
				resetPendingArtifactAssociation();
				await sendMessage({
					text: trimmedText,
					files,
				}, {
					body: {
						id: threadId,
						artifactContext: resolvedArtifactContext ?? undefined,
					},
				});
			} catch (error) {
				setInputError(toFutureChatUserErrorMessage(error));
				throw error;
			}
		},
		[
			activeDocument,
			activeDocumentContent,
			artifactDraftContent,
			ensureThread,
			resetPendingArtifactAssociation,
			sendMessage,
			streamingArtifact,
		],
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

	const applyVoiceSteer = useCallback(
		async ({ text }: { text: string }) => {
			const trimmedText = text.trim();
			if (!trimmedText) {
				return;
			}

			setInputError(null);

			try {
				const hadActiveTurn =
					statusRef.current === "submitted" || statusRef.current === "streaming";
				const checkpointDocument = hadActiveTurn
					? await saveStreamingArtifactCheckpoint()
					: null;
				if (hadActiveTurn) {
					await interruptActiveTurn({ source: "voice-barge-in" });
				}

				const threadId = await ensureThread(trimmedText);
				resetPendingArtifactAssociation();
				void sendMessage(
					{
						text: trimmedText,
						files: [],
					},
					{
						body: {
							id: threadId,
							artifactSteering: {
								preferCurrentArtifact: true,
								source: "voice",
							} satisfies FutureChatArtifactSteeringPayload,
							artifactContext: checkpointDocument
								? buildArtifactContextPayload(
									checkpointDocument,
									getLatestDocumentContent(checkpointDocument),
								)
								: undefined,
						},
					},
				).catch((error) => {
					setInputError(toFutureChatUserErrorMessage(error));
				});
			} catch (error) {
				setInputError(toFutureChatUserErrorMessage(error));
				throw error;
			}
		},
		[
			ensureThread,
			interruptActiveTurn,
			resetPendingArtifactAssociation,
			saveStreamingArtifactCheckpoint,
			sendMessage,
		],
	);

	const deleteThread = useCallback(
		async (threadId: string) => {
			deletedThreadIdsRef.current.add(threadId);
			setThreads((previousThreads) =>
				previousThreads.filter((thread) => thread.id !== threadId),
			);

			try {
				await deleteFutureChatThread(threadId);
				if (activeThreadIdRef.current === threadId) {
					await openNewChat();
				}
			} catch (error) {
				deletedThreadIdsRef.current.delete(threadId);
				void refreshThreads();
				setInputError(toFutureChatUserErrorMessage(error));
			}
		},
		[openNewChat, refreshThreads],
	);

	const deleteAllThreads = useCallback(async () => {
		const previousThreadIds = threads.map((thread) => thread.id);
		for (const threadId of previousThreadIds) {
			deletedThreadIdsRef.current.add(threadId);
		}
		setThreads([]);

		try {
			await deleteAllFutureChatThreads();
			await openNewChat();
		} catch (error) {
			for (const threadId of previousThreadIds) {
				deletedThreadIdsRef.current.delete(threadId);
			}
			void refreshThreads();
			setInputError(toFutureChatUserErrorMessage(error));
		}
	}, [openNewChat, refreshThreads, threads]);

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
					setVisibleArtifactDocumentId(existingDocument.id);
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
				setVisibleArtifactDocumentId(document.id);
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
				setVisibleArtifactDocumentId(existingDocument.id);
				setSelectedVersionId(existingDocument.versions.at(-1)?.id ?? null);
				setArtifactDraftContent(getLatestDocumentContent(existingDocument));
				setArtifactMode("preview");
				return;
			}

			await hydratePersistedArtifact(documentId);
			setVisibleArtifactDocumentId(documentId);
		},
		[documents, hydratePersistedArtifact],
	);

	const saveArtifactDraft = useCallback(async () => {
		if (!activeDocumentId || !artifactDraftContent.trim()) {
			return;
		}

		try {
			const document = await saveFutureChatDocument({
				changeLabel: "Manual edit",
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
					setVisibleArtifactDocumentId(null);
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
				resetPendingArtifactAssociation();
				regenerate();
			}, 0);
			setEditingMessageId(null);
		},
		[messages, regenerate, resetPendingArtifactAssociation, setMessages],
	);

	const regenerateLatest = useCallback(() => {
		resetPendingArtifactAssociation();
		regenerate();
	}, [regenerate, resetPendingArtifactAssociation]);

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
		const nextPersistKey = buildFutureChatThreadPersistKey({
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

				const persistedKey = buildFutureChatThreadPersistKey({
					messages: thread.messages,
					visibility: thread.visibility,
					activeDocumentId: thread.activeDocumentId,
					title: thread.title,
				});
				lastPersistedKeyRef.current = persistedKey;
				setThreads((previousThreads) =>
					upsertFutureChatThreadRecord(previousThreads, thread, {
						deletedThreadIds: deletedThreadIdsRef.current,
					}),
				);
				if (
					!embedded &&
					shouldReplaceFutureChatRouteAfterPersistence({
						pendingThreadId: pendingRouteThreadIdRef.current,
						thread,
						messages,
						visibility: threadVisibility,
						activeDocumentId,
						title: nextTitle,
					})
				) {
					pendingRouteThreadIdRef.current = null;
					startTransition(() => {
						router.replace(`/future-chat/${encodeURIComponent(thread.id)}`);
					});
				}
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
		embedded,
		isLoadingThread,
		isStreaming,
		messages,
		router,
		setMessages,
		threadVisibility,
		threads,
	]);

	return {
		activeDocument,
		activeDocumentContent,
		activeThreadId,
		applyVoiceSteer,
		artifactMode,
		artifactDraftContent,
		deleteAllThreads,
		deleteDocument,
		deleteThread,
		documents,
		editMessage,
		editingMessageId,
		hideArtifactPane,
		inputError,
		interruptActiveTurn,
		isArtifactOpen: visibleArtifactDocumentId !== null,
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
		pendingArtifactResult,
		streamingArtifact,
		streamingArtifactMessageId,
		visibleArtifactDocumentId,
		setVisibleArtifactDocumentId,
		threads,
		threadVisibility,
		votes,
		voteOnMessage,
	};
}
