"use client";

import { useRouter } from "next/navigation";
import { FutureChatArtifactPanel } from "@/components/projects/future-chat/components/future-chat-artifact-panel";
import { FutureChatComposer } from "@/components/projects/future-chat/components/future-chat-composer";
import { FutureChatHeader } from "@/components/projects/future-chat/components/future-chat-header";
import { FutureChatMessages } from "@/components/projects/future-chat/components/future-chat-messages";
import { FutureChatSidebar } from "@/components/projects/future-chat/components/future-chat-sidebar";
import { FUTURE_CHAT_MODELS } from "@/components/projects/future-chat/data/model-options";
import { useFutureChat } from "@/components/projects/future-chat/hooks/use-future-chat";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

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
	const activeThread =
		chat.activeThreadId
			? chat.threads.find((thread) => thread.id === chat.activeThreadId) ?? null
			: null;
	const visibleMessages = chat.messages.filter((message) => {
		return message.role === "user" || message.role === "assistant";
	});
	const workspaceDocument = chat.streamingArtifact
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
						id: "streaming",
						content: chat.streamingArtifact.content,
						createdAt: chat.streamingArtifact.updatedAt,
					},
				],
			}
		: chat.activeDocument;
	const selectedDocumentVersion =
		workspaceDocument?.versions.find((version) => version.id === chat.selectedVersionId)
		?? workspaceDocument?.versions.at(-1)
		?? null;
	const isArtifactOpen = Boolean(workspaceDocument);

	return (
		<SidebarProvider defaultOpen={true}>
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

			<SidebarInset className="h-svh overflow-hidden rounded-none shadow-none md:rounded-none md:shadow-none">
				<div className="relative flex h-full min-w-0 bg-background text-foreground">
					<div
						className={cn(
							"overscroll-behavior-contain flex min-w-0 touch-pan-y flex-col bg-background",
							isArtifactOpen ? "md:w-[400px] md:shrink-0" : "flex-1",
						)}
					>
						<FutureChatHeader
							onNewChat={() => void chat.openNewChat()}
							onSelectVisibility={chat.setThreadVisibility}
							visibility={chat.threadVisibility}
						/>

						<FutureChatMessages
							activeThreadId={chat.activeThreadId}
							activeThreadTitle={activeThread?.title ?? null}
							compact={isArtifactOpen}
							editingMessageId={chat.editingMessageId}
							isStreaming={chat.isStreaming}
							messages={chat.messages}
							onEditMessage={chat.editMessage}
							onOpenArtifact={chat.openArtifactFromMessage}
							onRegenerate={chat.regenerateLatest}
							onSelectSuggestion={chat.suggestedPrompt}
							onSetEditingMessageId={chat.setEditingMessageId}
							onVote={chat.voteOnMessage}
							votes={chat.votes}
						/>

						<div
							className={cn(
								"sticky bottom-0 z-10 mx-auto flex w-full gap-2 bg-background px-2 pb-3 md:px-4 md:pb-4",
								isArtifactOpen ? "max-w-none" : "max-w-4xl",
							)}
						>
							<FutureChatComposer
								key={chat.runtimeThreadId}
								artifactTitle={workspaceDocument?.title ?? null}
								compact={isArtifactOpen}
								errorMessage={chat.inputError}
								models={FUTURE_CHAT_MODELS}
								onSelectModel={chat.setSelectedModelId}
								onStop={chat.stop}
								onSubmit={chat.submitPrompt}
								onSuggestedAction={chat.suggestedPrompt}
								selectedModel={chat.selectedModel}
								showSuggestedActions={!isArtifactOpen && visibleMessages.length === 0}
								status={chat.status}
							/>
						</div>
					</div>

					{workspaceDocument ? (
						<FutureChatArtifactPanel
							document={workspaceDocument}
							draftContent={chat.streamingArtifact?.content ?? chat.artifactDraftContent}
							isStreamingArtifact={Boolean(chat.streamingArtifact)}
							mode={chat.artifactMode}
							onClose={() => {
								if (chat.streamingArtifact) {
									return;
								}
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
					) : null}
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
