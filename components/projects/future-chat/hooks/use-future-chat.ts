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
import { DEFAULT_FUTURE_CHAT_MODEL, FUTURE_CHAT_MODELS } from "@/components/projects/future-chat/data/model-options";
import {
	createFutureChatThread,
	deleteAllFutureChatThreads,
	deleteFutureChatDocument,
	deleteFutureChatThread,
	getFutureChatDocument,
	getFutureChatThread,
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
	type FutureChatModelOption,
	type FutureChatThread,
	type FutureChatVisibility,
	type FutureChatVote,
	createFutureChatId,
} from "@/lib/future-chat-types";
import {
	getLatestDataPart,
	getMessageText,
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
	modelId: string;
	provider: string;
	activeDocumentId: string | null;
	title: string;
}): string {
	return JSON.stringify({
		messages: options.messages,
		visibility: options.visibility,
		modelId: options.modelId,
		provider: options.provider,
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

function resolveModelOption(
	modelId: string | null,
	provider: string | null,
): FutureChatModelOption {
	const exactMatch = FUTURE_CHAT_MODELS.find((model) => {
		return model.id === modelId || (provider && model.provider === provider && model.id === modelId);
	});
	return exactMatch ?? DEFAULT_FUTURE_CHAT_MODEL;
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
	isArtifactOpen: boolean;
	isStreaming: boolean;
	loadThread: (threadId: string) => Promise<void>;
	messages: RovoUIMessage[];
	openArtifactFromMessage: (message: RovoUIMessage) => Promise<void>;
	openNewChat: () => Promise<void>;
	regenerateLatest: () => void;
	runtimeThreadId: string;
	saveArtifactDraft: () => Promise<void>;
	selectedModel: FutureChatModelOption;
	selectedVersionId: string | null;
	setActiveDocumentId: (documentId: string | null) => void;
	setArtifactDraftContent: (value: string) => void;
	setArtifactMode: (mode: "preview" | "edit") => void;
	setEditingMessageId: (messageId: string | null) => void;
	setSelectedModelId: (modelId: string) => void;
	setSelectedVersionId: (versionId: string | null) => void;
	setSidebarOpen: (isOpen: boolean) => void;
	setThreadVisibility: (visibility: FutureChatVisibility) => void;
	sidebarOpen: boolean;
	status: ChatStatus;
	stop: () => Promise<void>;
	submitPrompt: (payload: { text: string; files: FileUIPart[] }) => Promise<void>;
	suggestedPrompt: (text: string) => Promise<void>;
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
	const [selectedModelId, setSelectedModelId] = useState(DEFAULT_FUTURE_CHAT_MODEL.id);
	const [threadVisibility, setThreadVisibility] = useState<FutureChatVisibility>("private");
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
	const [artifactMode, setArtifactMode] = useState<"preview" | "edit">("preview");
	const [artifactDraftContent, setArtifactDraftContent] = useState("");
	const [streamingArtifact, setStreamingArtifact] = useState<FutureChatStreamingArtifact | null>(null);
	const [votes, setVotes] = useState<Record<string, "up" | "down">>({});
	const [inputError, setInputError] = useState<string | null>(null);
	const [isLoadingThread, setIsLoadingThread] = useState(false);
	const selectedModel = useMemo(() => {
		return FUTURE_CHAT_MODELS.find((model) => model.id === selectedModelId) ?? DEFAULT_FUTURE_CHAT_MODEL;
	}, [selectedModelId]);
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

	useEffect(() => {
		activeDocumentRef.current = activeDocument;
	}, [activeDocument]);

	useEffect(() => {
		streamingArtifactRef.current = streamingArtifact;
	}, [streamingArtifact]);

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

					return {
						body: {
							...(body ?? {}),
							id: runtimeThreadId,
							messages,
							contextDescription: existingContextDescription ?? undefined,
							provider: selectedModel.provider,
							model: selectedModel.id,
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
			selectedModel.id,
			selectedModel.provider,
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
			setInputError(error.message);
		},
		onFinish: ({ isAbort, isError }) => {
			if (isAbort || isError) {
				return;
			}
		},
	});

	const isStreaming = status === "submitted" || status === "streaming";

	const refreshThreads = useCallback(async () => {
		try {
			const nextThreads = await listFutureChatThreads();
			setThreads(nextThreads);
		} catch (error) {
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
			setSelectedModelId(resolveModelOption(thread.modelId, thread.provider).id);
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
				modelId: thread.modelId ?? resolveModelOption(thread.modelId, thread.provider).id,
				provider: thread.provider ?? resolveModelOption(thread.modelId, thread.provider).provider,
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
				setInputError(error instanceof Error ? error.message : String(error));
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
		setSelectedModelId(DEFAULT_FUTURE_CHAT_MODEL.id);
		setEditingMessageId(null);
		setArtifactMode("preview");
		setArtifactDraftContent("");
		lastPersistedKeyRef.current = buildThreadPersistKey({
			messages: [],
			visibility: "private",
			modelId: DEFAULT_FUTURE_CHAT_MODEL.id,
			provider: DEFAULT_FUTURE_CHAT_MODEL.provider,
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
				modelId: selectedModel.id,
				provider: selectedModel.provider,
				activeDocumentId,
			});
			setActiveThreadId(nextThread.id);
			setThreads((previousThreads) => upsertThreadRecord(previousThreads, nextThread));
			lastPersistedKeyRef.current = buildThreadPersistKey({
				messages: nextThread.messages,
				visibility: nextThread.visibility,
				modelId: nextThread.modelId ?? selectedModel.id,
				provider: nextThread.provider ?? selectedModel.provider,
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
			selectedModel.id,
			selectedModel.provider,
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

			await ensureThread(trimmedText || files[0]?.filename || "New chat");
			await sendMessage({
				text: trimmedText,
				files,
			});
		},
		[ensureThread, sendMessage],
	);

	const suggestedPrompt = useCallback(
		async (text: string) => {
			await submitPrompt({ text, files: [] });
		},
		[submitPrompt],
	);

	const deleteThread = useCallback(
		async (threadId: string) => {
			await deleteFutureChatThread(threadId);
			setThreads((previousThreads) =>
				previousThreads.filter((thread) => thread.id !== threadId),
			);
			if (activeThreadId === threadId) {
				await openNewChat();
			}
		},
		[activeThreadId, openNewChat],
	);

	const deleteAllThreads = useCallback(async () => {
		await deleteAllFutureChatThreads();
		setThreads([]);
		await openNewChat();
	}, [openNewChat]);

	const voteOnMessage = useCallback(
		async (messageId: string, value: "up" | "down" | null) => {
			if (!activeThreadId) {
				return;
			}

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
		},
		[activeThreadId],
	);

	const openArtifactFromMessage = useCallback(
		async (message: RovoUIMessage) => {
			const content = buildArtifactContentFromMessage(message);
			if (!content.trim()) {
				return;
			}

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
		},
		[documents, ensureThread],
	);

	const saveArtifactDraft = useCallback(async () => {
		if (!activeDocumentId || !artifactDraftContent.trim()) {
			return;
		}

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
	}, [activeDocument, activeDocumentId, artifactDraftContent]);

	const deleteDocument = useCallback(
		async (documentId: string) => {
			await deleteFutureChatDocument(documentId);
			setDocuments((previousDocuments) =>
				previousDocuments.filter((document) => document.id !== documentId),
			);
			if (activeDocumentId === documentId) {
				setActiveDocumentId(null);
				setSelectedVersionId(null);
				setArtifactDraftContent("");
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
			modelId: selectedModel.id,
			provider: selectedModel.provider,
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
			modelId: selectedModel.id,
			provider: selectedModel.provider,
			activeDocumentId,
		})
			.then((thread) => {
				if (cancelled) {
					return;
				}

				const persistedKey = buildThreadPersistKey({
					messages: thread.messages,
					visibility: thread.visibility,
					modelId: thread.modelId ?? selectedModel.id,
					provider: thread.provider ?? selectedModel.provider,
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
					setInputError(error instanceof Error ? error.message : String(error));
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
		selectedModel.id,
		selectedModel.provider,
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
		isArtifactOpen: activeDocumentId !== null || streamingArtifact !== null,
		isStreaming,
		loadThread,
		messages,
		openArtifactFromMessage,
		openNewChat,
		regenerateLatest,
		runtimeThreadId,
		saveArtifactDraft,
		selectedModel,
		selectedVersionId,
		setActiveDocumentId,
		setArtifactDraftContent,
		setArtifactMode,
		setEditingMessageId,
		setSelectedModelId,
		setSelectedVersionId,
		setSidebarOpen,
		setThreadVisibility,
		sidebarOpen,
		status,
		stop,
		submitPrompt,
		suggestedPrompt,
		streamingArtifact,
		threads,
		threadVisibility,
		votes,
		voteOnMessage,
	};
}
