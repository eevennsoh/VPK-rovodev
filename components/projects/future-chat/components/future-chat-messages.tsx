"use client";

import {
	Attachment,
	AttachmentPreview,
	Attachments,
} from "@/components/ui-ai/attachments";
import {
	Conversation,
	ConversationScrollButton,
} from "@/components/ui-ai/conversation";
import { MessageResponse } from "@/components/ui-ai/message";
import {
	Reasoning,
	ReasoningContent,
	ReasoningTrigger,
} from "@/components/ui-ai/reasoning";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getFutureChatInterruptionLabel } from "@/lib/future-chat-interruptions";
import {
	resolveFutureChatMessageArtifactDisplay,
	type FutureChatPendingArtifactResult,
} from "@/components/projects/future-chat/lib/future-chat-message-artifacts";
import { GenerativeWidgetCard } from "@/components/projects/shared/components/generative-widget-card";
import LoadingWidget from "@/components/projects/shared/components/loading-widget";
import {
	getMessageInterruption,
	getLatestDataPart,
	getMessageReasoning,
	getMessageSources,
	getMessageText,
	type RovoUIMessage,
} from "@/lib/rovo-ui-messages";
import { cn } from "@/lib/utils";
import { FutureChatArtifactCard } from "@/components/projects/future-chat/components/future-chat-artifact-card";
import type { FutureChatDocument } from "@/lib/future-chat-types";
import type { FutureChatStreamingArtifact } from "@/components/projects/future-chat/lib/future-chat-streaming-artifact";
import {
	CopyIcon,
	PencilLineIcon,
	RefreshCcwIcon,
	SparklesIcon,
	ThumbsDownIcon,
	ThumbsUpIcon,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import Heading from "@/components/blocks/shared-ui/heading";

interface FutureChatMessagesProps {
	visibleDocumentId: string | null;
	compact?: boolean;
	documents: ReadonlyArray<FutureChatDocument>;
	editingMessageId: string | null;
	isStreaming: boolean;
	messages: ReadonlyArray<RovoUIMessage>;
	onEditMessage: (messageId: string, nextText: string) => Promise<void>;
	onOpenArtifactFromCard: (documentId: string, element: HTMLElement) => void;
	onRegisterArtifactCard: (documentId: string, element: HTMLElement) => void;
	onRegenerate: () => void;
	onSelectSuggestion: (suggestion: string) => Promise<void>;
	onSetEditingMessageId: (messageId: string | null) => void;
	onVote: (messageId: string, value: "up" | "down" | null) => Promise<void>;
	pendingArtifactResult: FutureChatPendingArtifactResult | null;
	streamingArtifact: FutureChatStreamingArtifact | null;
	streamingArtifactMessageId: string | null;
	votes: Record<string, "up" | "down">;
}

const FUTURE_CHAT_ARTIFACT_INTENT_LEAK_FALLBACK =
	"I had an internal routing issue while generating that response. Please try again.";

function sanitizeFutureChatAssistantText(rawText: string): string {
	const trimmedText = rawText.trim();
	if (!trimmedText.startsWith("{") || !trimmedText.endsWith("}")) {
		return rawText;
	}

	try {
		const parsed = JSON.parse(trimmedText) as {
			action?: unknown;
			title?: unknown;
			kind?: unknown;
		};
		const allowedActions = new Set(["chat", "createDocument", "updateDocument"]);
		const isArtifactIntentPayload =
			typeof parsed === "object" &&
			parsed !== null &&
			allowedActions.has(String(parsed.action)) &&
			(parsed.title === null || typeof parsed.title === "string") &&
			(parsed.kind === null ||
				parsed.kind === "text" ||
				parsed.kind === "code" ||
				parsed.kind === "image" ||
				parsed.kind === "sheet");

		return isArtifactIntentPayload
			? FUTURE_CHAT_ARTIFACT_INTENT_LEAK_FALLBACK
			: rawText;
	} catch {
		return rawText;
	}
}

function UserMessage({
	isEditing,
	message,
	onEditMessage,
	onSetEditingMessageId,
}: Readonly<{
	isEditing: boolean;
	message: RovoUIMessage;
	onEditMessage: (messageId: string, nextText: string) => Promise<void>;
	onSetEditingMessageId: (messageId: string | null) => void;
}>) {
	const [draft, setDraft] = useState(() => getMessageText(message));
	const attachments = message.parts.filter(
		(part): part is Extract<(typeof message.parts)[number], { type: "file" }> =>
			part.type === "file",
	);

	return (
		<div
			className="group/message fade-in w-full animate-in duration-200"
			data-role="user"
			data-testid="message-user"
		>
			<div className="flex w-full items-start justify-end gap-2 md:gap-3">
				<div
					className={cn("flex flex-col gap-2", {
						"w-full": isEditing,
						"max-w-[calc(100%-2.5rem)] sm:max-w-[min(fit-content,80%)]": !isEditing,
					})}
				>
					{attachments.length > 0 ? (
						<Attachments className="justify-end" variant="grid">
							{attachments.map((attachment) => (
								<Attachment
									key={`${message.id}-${attachment.url}-${attachment.filename ?? "attachment"}`}
									data={{
										...attachment,
										id: `${message.id}-${attachment.url}-${attachment.filename ?? "attachment"}`,
									}}
								>
									<AttachmentPreview />
								</Attachment>
							))}
						</Attachments>
					) : null}

					{isEditing ? (
						<div className="rounded-2xl border border-border bg-background p-3 shadow-xs">
							<Textarea
								className="min-h-[140px] resize-none border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
								onChange={(event) => setDraft(event.currentTarget.value)}
								value={draft}
							/>
							<div className="mt-3 flex justify-end gap-2">
								<Button
									onClick={() => onSetEditingMessageId(null)}
									size="sm"
									type="button"
									variant="ghost"
								>
									Cancel
								</Button>
								<Button
									onClick={() => void onEditMessage(message.id, draft)}
									size="sm"
									type="button"
								>
									Send
								</Button>
							</div>
						</div>
					) : (
						<>
							<div
								className="ml-auto min-w-20 w-fit rounded-[22px] border border-primary bg-primary px-4 py-3 text-primary-foreground shadow-sm"
							>
								<MessageResponse className="font-medium text-inherit [&_*]:text-inherit">
									{getMessageText(message)}
								</MessageResponse>
							</div>

							<div className="flex justify-end gap-1 text-text-subtle opacity-100 transition-opacity md:opacity-0 md:group-hover/message:opacity-100">
								<Button
									aria-label="Copy message"
									onClick={() => void navigator.clipboard.writeText(getMessageText(message))}
									size="icon-sm"
									type="button"
									variant="ghost"
								>
									<CopyIcon className="size-4" />
								</Button>
								<Button
									aria-label="Edit message"
									onClick={() => onSetEditingMessageId(message.id)}
									size="icon-sm"
									type="button"
									variant="ghost"
								>
									<PencilLineIcon className="size-4" />
								</Button>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}

function AssistantMessage({
	artifactCard,
	isLastAssistant,
	isStreaming,
	message,
	onRegenerate,
	onSelectSuggestion,
	onVote,
	voteValue,
}: Readonly<{
	artifactCard: React.ReactNode;
	isLastAssistant: boolean;
	isStreaming: boolean;
	message: RovoUIMessage;
	onRegenerate: () => void;
	onSelectSuggestion: (suggestion: string) => Promise<void>;
	onVote: (messageId: string, value: "up" | "down" | null) => Promise<void>;
	voteValue?: "up" | "down";
}>) {
	const interruption = getMessageInterruption(message);
	const interruptionLabel = getFutureChatInterruptionLabel(interruption);
	const text = sanitizeFutureChatAssistantText(getMessageText(message));
	const reasoning = getMessageReasoning(message);
	const widget = getLatestDataPart(message, "data-widget-data");
	const widgetLoading = getLatestDataPart(message, "data-widget-loading");
	const widgetError = getLatestDataPart(message, "data-widget-error");
	const suggestions = getLatestDataPart(message, "data-suggested-questions")?.data.questions ?? [];
	const sources = getMessageSources(message);

	return (
		<div
			className="group/message fade-in w-full animate-in duration-200"
			data-role="assistant"
			data-testid="message-assistant"
		>
			<div className="flex w-full items-start gap-2 md:gap-3">
				<div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-text-subtle">
					<SparklesIcon className="size-4" />
				</div>

				<div className="flex min-w-0 flex-1 flex-col gap-3">
					{reasoning?.text ? (
						<Reasoning
							defaultOpen={reasoning.isStreaming}
							isStreaming={isStreaming && reasoning.isStreaming}
						>
							<ReasoningTrigger />
							<ReasoningContent>{reasoning.text}</ReasoningContent>
						</Reasoning>
					) : null}

					{widgetLoading?.data.loading ? (
						<div className="max-w-[min(100%,450px)]">
							<LoadingWidget widgetType={widgetLoading.data.type} />
						</div>
					) : null}

					{widget ? (
						<div className="max-w-[min(100%,560px)]">
							<GenerativeWidgetCard
								widgetData={widget.data.payload}
								widgetType={widget.data.type ?? "message"}
							/>
						</div>
					) : null}

					{widgetError ? (
						<div className="rounded-xl border border-danger bg-danger/5 px-3 py-2 text-danger text-sm">
							{widgetError.data.message}
						</div>
					) : null}

					{text ? (
						<div className="min-w-0 max-w-3xl">
							<MessageResponse isAnimating={isStreaming && isLastAssistant}>
								{text}
							</MessageResponse>
						</div>
					) : null}

					{artifactCard}

					{interruptionLabel ? (
						<div className="inline-flex w-fit items-center rounded-full border border-border-warning/40 bg-bg-warning-subtler px-2.5 py-1 text-text-warning-bolder text-xs">
							{interruptionLabel}
						</div>
					) : null}

					{sources.length > 0 ? (
						<div className="flex flex-wrap gap-2">
							{sources.map((source) => (
								source.type === "source-url" && source.url ? (
									<Button
										key={`${message.id}-${source.url}`}
										nativeButton={false}
										render={(
											<a
												href={source.url}
												rel="noreferrer"
												target="_blank"
											/>
										)}
										size="sm"
										type="button"
										variant="outline"
									>
										{source.title || source.url}
									</Button>
								) : (
									<Button
										key={`${message.id}-${source.title ?? "source"}`}
										size="sm"
										type="button"
										variant="outline"
									>
										{source.title || "Source"}
									</Button>
								)
							))}
						</div>
					) : null}

					{suggestions.length > 0 ? (
						<div className="grid w-full gap-2 sm:grid-cols-2">
							{suggestions.map((suggestion) => (
								<Button
									className="h-auto justify-start whitespace-normal rounded-2xl border-border bg-surface px-3 py-2 text-left text-text shadow-none hover:bg-surface-hovered"
									key={`${message.id}-${suggestion}`}
									onClick={() => void onSelectSuggestion(suggestion)}
									type="button"
									variant="outline"
								>
									{suggestion}
								</Button>
							))}
						</div>
					) : null}

					<div className="flex flex-wrap items-center gap-1 text-text-subtle opacity-100 transition-opacity md:opacity-0 md:group-hover/message:opacity-100">
						<Button
							aria-label="Copy response"
							onClick={() => void navigator.clipboard.writeText(text)}
							size="icon-sm"
							type="button"
							variant="ghost"
						>
							<CopyIcon className="size-4" />
						</Button>

						<Button
							aria-label="Like response"
							className={cn(voteValue === "up" && "text-success")}
							onClick={() => void onVote(message.id, voteValue === "up" ? null : "up")}
							size="icon-sm"
							type="button"
							variant="ghost"
						>
							<ThumbsUpIcon className="size-4" />
						</Button>
						<Button
							aria-label="Dislike response"
							className={cn(voteValue === "down" && "text-danger")}
							onClick={() => void onVote(message.id, voteValue === "down" ? null : "down")}
							size="icon-sm"
							type="button"
							variant="ghost"
						>
							<ThumbsDownIcon className="size-4" />
						</Button>

						{isLastAssistant ? (
							<Button
								aria-label="Regenerate response"
								onClick={onRegenerate}
								size="icon-sm"
								type="button"
								variant="ghost"
							>
								<RefreshCcwIcon className="size-4" />
							</Button>
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
}

function ThinkingMessage() {
	return (
		<div className="w-full">
			<div className="flex items-start gap-2 md:gap-3">
				<div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-text-subtle">
					<SparklesIcon className="size-4" />
				</div>
				<div className="flex h-8 items-center gap-1 text-text-subtle">
					<span className="size-2 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:-200ms]" />
					<span className="size-2 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:-100ms]" />
					<span className="size-2 animate-pulse rounded-full bg-muted-foreground/60" />
				</div>
			</div>
		</div>
	);
}

function StreamingArtifactMessage({
	documentId,
	kind,
	onOpenArtifactFromCard,
	onRegisterArtifactCard,
	streamingArtifact,
	title,
}: Readonly<{
	documentId: string;
	kind: "text" | "code" | "image" | "sheet";
	onOpenArtifactFromCard: (documentId: string, element: HTMLElement) => void;
	onRegisterArtifactCard: (documentId: string, element: HTMLElement) => void;
	streamingArtifact: FutureChatStreamingArtifact;
	title: string;
}>) {
	return (
		<div
			className="group/message fade-in w-full animate-in duration-200"
			data-role="assistant"
			data-testid="message-assistant-streaming-artifact"
		>
			<div className="flex w-full items-start gap-2 md:gap-3">
				<div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-text-subtle">
					<SparklesIcon className="size-4" />
				</div>

				<div className="flex min-w-0 flex-1 flex-col gap-3">
					<FutureChatArtifactCard
						action={null}
						displayMode="preview"
						documentId={documentId}
						isStreaming={true}
						kind={kind}
						onOpen={onOpenArtifactFromCard}
						onRegister={onRegisterArtifactCard}
						previewContent={streamingArtifact.content}
						title={title}
					/>
				</div>
			</div>
		</div>
	);
}

export function FutureChatMessages({
	visibleDocumentId,
	compact = false,
	documents,
	editingMessageId,
	isStreaming,
	messages,
	onEditMessage,
	onOpenArtifactFromCard,
	onRegisterArtifactCard,
	onRegenerate,
	onSelectSuggestion,
	onSetEditingMessageId,
	onVote,
	pendingArtifactResult,
	streamingArtifact,
	streamingArtifactMessageId,
	votes,
}: Readonly<FutureChatMessagesProps>) {
	const visibleMessages = useMemo(
		() => messages.filter((message) => message.role === "user" || message.role === "assistant"),
		[messages],
	);
	const lastAssistantMessageId = useMemo(() => {
		return [...visibleMessages]
			.reverse()
			.find((message) => message.role === "assistant")?.id ?? null;
	}, [visibleMessages]);
	const shouldShowThinkingMessage =
		isStreaming && visibleMessages.at(-1)?.role === "user";
	const shouldShowStreamingArtifactPreview =
		shouldShowThinkingMessage &&
		Boolean(streamingArtifact?.documentId) &&
		streamingArtifactMessageId === null;

	return (
		<Conversation className={cn("relative bg-background", visibleMessages.length === 0 && "!flex-none overflow-visible")}>
			{visibleMessages.length === 0 ? (
				<div className="flex flex-col items-center gap-2 py-6">
					<Image
						alt="Chat"
						className="h-auto w-auto object-contain dark:hidden"
						height={67}
						loading="eager"
						src="/illustration-ai/chat/light.svg"
						width={74}
					/>
					<Image
						alt="Chat"
						className="hidden h-auto w-auto object-contain dark:block"
						height={67}
						loading="eager"
						src="/illustration-ai/chat/dark.svg"
						width={74}
					/>
					<Heading size="xlarge">How can I help?</Heading>
				</div>
			) : null}

			<div
				className={cn(
					"mx-auto flex min-w-0 flex-col gap-4 px-2 py-4 md:gap-6 md:px-4",
					compact ? "max-w-none" : "max-w-4xl",
					visibleMessages.length === 0 && "hidden",
				)}
			>
				{visibleMessages.map((message) => {
						if (message.role === "user") {
							return (
								<UserMessage
									isEditing={editingMessageId === message.id}
									key={message.id}
									message={message}
									onEditMessage={onEditMessage}
									onSetEditingMessageId={onSetEditingMessageId}
								/>
							);
						}

						const artifactDisplay = resolveFutureChatMessageArtifactDisplay({
							visibleDocumentId,
							documents,
							message,
							pendingArtifactResult,
							streamingArtifact,
							streamingArtifactMessageId,
						});

						return (
							<AssistantMessage
								artifactCard={
									artifactDisplay ? (
										<FutureChatArtifactCard
											action={artifactDisplay.action}
											displayMode={artifactDisplay.displayMode}
											documentId={artifactDisplay.documentId}
											isStreaming={artifactDisplay.isStreaming}
											kind={artifactDisplay.kind}
											onOpen={onOpenArtifactFromCard}
											onRegister={onRegisterArtifactCard}
											previewContent={artifactDisplay.previewContent}
											title={artifactDisplay.title}
										/>
									) : null
								}
								isLastAssistant={message.id === lastAssistantMessageId}
								isStreaming={isStreaming}
								key={message.id}
								message={message}
								onRegenerate={onRegenerate}
								onSelectSuggestion={onSelectSuggestion}
								onVote={onVote}
								voteValue={votes[message.id]}
							/>
						);
					})}

				{shouldShowStreamingArtifactPreview && streamingArtifact?.documentId ? (
					<StreamingArtifactMessage
						documentId={streamingArtifact.documentId}
						kind={streamingArtifact.kind}
						onOpenArtifactFromCard={onOpenArtifactFromCard}
						onRegisterArtifactCard={onRegisterArtifactCard}
						streamingArtifact={streamingArtifact}
						title={streamingArtifact.title}
					/>
				) : shouldShowThinkingMessage ? (
					<ThinkingMessage />
				) : null}
			</div>

			<ConversationScrollButton className="bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border bg-background p-2 shadow-lg transition-all hover:bg-muted" />
		</Conversation>
	);
}
