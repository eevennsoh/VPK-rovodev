"use client";

import {
	Attachment,
	AttachmentPreview,
	Attachments,
} from "@/components/ui-ai/attachments";
import {
	Conversation,
	ConversationContent,
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
import { GenerativeWidgetCard } from "@/components/projects/shared/components/generative-widget-card";
import LoadingWidget from "@/components/projects/shared/components/loading-widget";
import {
	getLatestDataPart,
	getMessageReasoning,
	getMessageSources,
	getMessageText,
	type RovoUIMessage,
} from "@/lib/rovo-ui-messages";
import { cn } from "@/lib/utils";
import {
	CopyIcon,
	PencilLineIcon,
	RefreshCcwIcon,
	SparklesIcon,
	ThumbsDownIcon,
	ThumbsUpIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

interface FutureChatMessagesProps {
	activeThreadId: string | null;
	activeThreadTitle?: string | null;
	compact?: boolean;
	editingMessageId: string | null;
	isStreaming: boolean;
	messages: ReadonlyArray<RovoUIMessage>;
	onEditMessage: (messageId: string, nextText: string) => Promise<void>;
	onOpenArtifact: (message: RovoUIMessage) => Promise<void>;
	onRegenerate: () => void;
	onSelectSuggestion: (suggestion: string) => Promise<void>;
	onSetEditingMessageId: (messageId: string | null) => void;
	onVote: (messageId: string, value: "up" | "down" | null) => Promise<void>;
	votes: Record<string, "up" | "down">;
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
							{attachments.map((attachment, index) => (
								<Attachment
									key={`${message.id}-attachment-${index}`}
									data={{
										...attachment,
										id: `${message.id}-attachment-${index}`,
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
								className="w-fit rounded-2xl px-3 py-2 text-white shadow-sm"
								style={{ backgroundColor: "#006cff" }}
							>
								<MessageResponse className="text-inherit [&_*]:text-inherit">
									{getMessageText(message)}
								</MessageResponse>
							</div>

							<div className="flex justify-end gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover/message:opacity-100">
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
	isLastAssistant,
	isStreaming,
	message,
	onOpenArtifact,
	onRegenerate,
	onSelectSuggestion,
	onVote,
	voteValue,
}: Readonly<{
	isLastAssistant: boolean;
	isStreaming: boolean;
	message: RovoUIMessage;
	onOpenArtifact: (message: RovoUIMessage) => Promise<void>;
	onRegenerate: () => void;
	onSelectSuggestion: (suggestion: string) => Promise<void>;
	onVote: (messageId: string, value: "up" | "down" | null) => Promise<void>;
	voteValue?: "up" | "down";
}>) {
	const text = getMessageText(message);
	const reasoning = getMessageReasoning(message);
	const widget = getLatestDataPart(message, "data-widget-data");
	const widgetLoading = getLatestDataPart(message, "data-widget-loading");
	const widgetError = getLatestDataPart(message, "data-widget-error");
	const suggestions = getLatestDataPart(message, "data-suggested-questions")?.data.questions ?? [];
	const sources = getMessageSources(message);
	const hasArtifactContent = text.trim().length > 0 || Boolean(widget);

	return (
		<div
			className="group/message fade-in w-full animate-in duration-200"
			data-role="assistant"
			data-testid="message-assistant"
		>
			<div className="flex w-full items-start gap-2 md:gap-3">
				<div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
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
						<div className="max-w-[min(100%,520px)]">
							<GenerativeWidgetCard
								widgetData={widget.data.payload}
								widgetType={widget.data.type ?? "message"}
							/>
						</div>
					) : null}

					{widgetError ? (
						<div className="rounded-lg border border-danger bg-danger/5 px-3 py-2 text-danger text-sm">
							{widgetError.data.message}
						</div>
					) : null}

					{text ? (
						<div className="min-w-0">
							<MessageResponse isAnimating={isStreaming && isLastAssistant}>
								{text}
							</MessageResponse>
						</div>
					) : null}

					{sources.length > 0 ? (
						<div className="flex flex-wrap gap-2">
							{sources.map((source, index) => (
								source.type === "source-url" && source.url ? (
									<Button
										key={`${message.id}-source-${index}`}
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
										key={`${message.id}-source-${index}`}
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
									className="h-auto justify-start whitespace-normal px-3 py-2 text-left"
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

					<div className="flex flex-wrap items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover/message:opacity-100">
						<Button
							aria-label="Copy response"
							onClick={() => void navigator.clipboard.writeText(text)}
							size="icon-sm"
							type="button"
							variant="ghost"
						>
							<CopyIcon className="size-4" />
						</Button>

						{hasArtifactContent ? (
							<Button
								aria-label="Open artifact"
								onClick={() => void onOpenArtifact(message)}
								size="icon-sm"
								type="button"
								variant="ghost"
							>
								<PencilLineIcon className="size-4" />
							</Button>
						) : null}

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
				<div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
					<SparklesIcon className="size-4" />
				</div>
				<div className="flex h-8 items-center gap-1">
					<span className="size-2 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:-200ms]" />
					<span className="size-2 animate-pulse rounded-full bg-muted-foreground/60 [animation-delay:-100ms]" />
					<span className="size-2 animate-pulse rounded-full bg-muted-foreground/60" />
				</div>
			</div>
		</div>
	);
}

export function FutureChatMessages({
	activeThreadId,
	activeThreadTitle,
	compact = false,
	editingMessageId,
	isStreaming,
	messages,
	onEditMessage,
	onOpenArtifact,
	onRegenerate,
	onSelectSuggestion,
	onSetEditingMessageId,
	onVote,
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

	return (
		<Conversation className="relative flex-1 bg-background">
			<ConversationContent
				className={cn(
					"mx-auto flex min-w-0 flex-col gap-4 px-2 py-4 md:gap-6 md:px-4",
					compact ? "max-w-none" : "max-w-4xl",
				)}
			>
				{visibleMessages.length === 0 ? (
					<div
						className={cn(
							"mx-auto flex size-full flex-col justify-center px-4",
							compact ? "mt-8 max-w-full" : "mt-4 max-w-3xl md:mt-16 md:px-8",
						)}
						key="overview"
					>
						<div className="animate-in slide-in-from-bottom-1 fade-in-0 font-semibold text-xl duration-300 md:text-2xl">
							Hello there!
						</div>
						<div className="animate-in slide-in-from-bottom-1 fade-in-0 text-muted-foreground text-xl duration-300 md:text-2xl">
							How can I help you today?
						</div>
						{activeThreadId ? (
							<p className="animate-in slide-in-from-bottom-1 fade-in-0 mt-3 max-w-xl text-muted-foreground text-sm duration-300">
								{activeThreadTitle
									? `This conversation is empty so far. Continue "${activeThreadTitle}" below.`
									: "This conversation is empty so far. Continue it below."}
							</p>
						) : null}
					</div>
				) : (
					visibleMessages.map((message) => {
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

						return (
							<AssistantMessage
								isLastAssistant={message.id === lastAssistantMessageId}
								isStreaming={isStreaming}
								key={message.id}
								message={message}
								onOpenArtifact={onOpenArtifact}
								onRegenerate={onRegenerate}
								onSelectSuggestion={onSelectSuggestion}
								onVote={onVote}
								voteValue={votes[message.id]}
							/>
						);
					})
				)}

				{shouldShowThinkingMessage ? <ThinkingMessage /> : null}
			</ConversationContent>

			<ConversationScrollButton className="bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border bg-background p-2 shadow-lg transition-all hover:bg-muted" />
		</Conversation>
	);
}
