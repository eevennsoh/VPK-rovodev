"use client";

import type { ChatStatus, FileUIPart } from "ai";
import {
	PromptInput,
	PromptInputFooter,
	PromptInputProvider,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
	usePromptInputAttachments,
	usePromptInputController,
} from "@/components/ui-ai/prompt-input";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { VoiceButton } from "@/components/ui-audio/voice-button";
import type { VoiceButtonState } from "@/components/ui-audio/voice-button";
import { cn } from "@/lib/utils";
import { AudioWaveformIcon, MicIcon, PaperclipIcon } from "lucide-react";
import { useCallback } from "react";
import { PendingAttachments } from "./pending-attachments";

const SUGGESTED_ACTIONS = [
	{
		label: "Plan a migration",
		prompt: "Draft a migration plan for replacing a legacy chatbot UI with a Vercel-style chat surface while keeping the backend contract unchanged.",
	},
	{
		label: "Turn an answer into an artifact",
		prompt: "Compare two approaches for a chat redesign, then turn the recommendation into an editable implementation brief.",
	},
	{
		label: "Summarize source material",
		prompt: "Summarize the uploaded material and extract the key risks, assumptions, and follow-up actions.",
	},
	{
		label: "Generate working code",
		prompt: "Generate a production-ready React component with a clear explanation of the tradeoffs and edge cases.",
	},
];

interface FutureChatComposerProps {
	artifactTitle?: string | null;
	compact?: boolean;
	errorMessage?: string | null;
	onStop: () => Promise<void>;
	onSubmit: (payload: {
		text: string;
		files: FileUIPart[];
	}) => Promise<void>;
	onSuggestedAction: (text: string) => Promise<void>;
	onToggleRealtimeVoice?: () => void;
	onToggleVoice?: () => void;
	realtimeVoiceActive?: boolean;
	showSuggestedActions?: boolean;
	status: ChatStatus;
	voiceState?: VoiceButtonState;
}

function SuggestedActions({
	onSuggestedAction,
}: Readonly<{
	onSuggestedAction: (text: string) => Promise<void>;
}>) {
	return (
		<div className="grid w-full gap-2 sm:grid-cols-2">
			{SUGGESTED_ACTIONS.map((suggestion) => (
				<Button
					className="h-auto min-h-20 justify-start rounded-2xl border-border bg-surface px-4 py-3 text-left text-text shadow-none hover:bg-surface-hovered"
					key={suggestion.label}
					onClick={() => void onSuggestedAction(suggestion.prompt)}
					type="button"
					variant="outline"
				>
					<div className="flex flex-col items-start gap-1">
						<span className="font-medium text-sm">{suggestion.label}</span>
						<span className="whitespace-normal text-text-subtle text-xs leading-5">
							{suggestion.prompt}
						</span>
					</div>
				</Button>
			))}
		</div>
	);
}

function FutureChatComposerInner({
	artifactTitle,
	compact = false,
	errorMessage,
	onStop,
	onSubmit,
	onSuggestedAction,
	onToggleRealtimeVoice,
	onToggleVoice,
	realtimeVoiceActive = false,
	showSuggestedActions = false,
	status,
	voiceState = "idle",
}: Readonly<FutureChatComposerProps>) {
	const attachments = usePromptInputAttachments();
	const controller = usePromptInputController();
	const canSubmit =
		controller.textInput.value.trim().length > 0 || attachments.files.length > 0;
	const handlePromptSubmit = useCallback(
		(payload: { text: string; files: FileUIPart[] }) => {
			void onSubmit(payload);
		},
		[onSubmit],
	);

	return (
		<div className={cn("relative flex w-full flex-col gap-4", compact && "gap-3")}>
			{showSuggestedActions && attachments.files.length === 0 ? (
				<SuggestedActions onSuggestedAction={onSuggestedAction} />
			) : null}

			{errorMessage ? (
				<Alert variant="danger">
					{errorMessage}
				</Alert>
			) : null}

			<PromptInput
				className="rounded-[28px] border border-border bg-background/95 p-3 shadow-xs transition-all duration-200 hover:border-muted-foreground/50 focus-within:border-border"
				onSubmit={handlePromptSubmit}
			>
				{artifactTitle ? (
					<div className="mb-3 rounded-2xl border border-border bg-bg-neutral px-3 py-2 text-text-subtle text-xs">
						Editing artifact context from{" "}
						<span className="font-medium text-text">{artifactTitle}</span>
					</div>
				) : null}

				<PendingAttachments />

				<div className="flex flex-row items-start gap-1 sm:gap-2">
					<PromptInputTextarea
						className="min-h-11 max-h-[220px] grow resize-none border-0! border-none! bg-transparent p-2 text-base leading-7 outline-none ring-0 [-ms-overflow-style:none] [scrollbar-width:none] placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [&::-webkit-scrollbar]:hidden"
						placeholder="Ask anything or attach material to work from..."
					/>
				</div>

				<PromptInputFooter className="mt-1 justify-between gap-2 border-border/70 border-t pt-2">
					<PromptInputTools className="gap-0 sm:gap-0.5">
						<Button
							aria-label="Add attachment"
							className="aspect-square h-8 rounded-full p-1 transition-colors hover:bg-accent"
							onClick={(event) => {
								event.preventDefault();
								attachments.openFileDialog();
							}}
							type="button"
							variant="ghost"
						>
							<PaperclipIcon className="size-4" />
						</Button>

						{onToggleVoice ? (
							<VoiceButton
								allowPressWhileProcessing
								aria-label="Voice mode"
								className="h-8 w-8 rounded-full"
								icon={<MicIcon className="size-4" />}
								onPress={onToggleVoice}
								size="icon"
								state={voiceState}
								variant="ghost"
							/>
						) : null}

						{onToggleRealtimeVoice ? (
							<Button
								aria-label="Live voice conversation"
								aria-pressed={realtimeVoiceActive}
								className={cn(
									"aspect-square h-8 rounded-full p-1 transition-colors",
									realtimeVoiceActive
										? "bg-bg-selected text-text-selected hover:bg-bg-selected-hovered"
										: "hover:bg-accent",
								)}
								onClick={onToggleRealtimeVoice}
								type="button"
								variant="ghost"
							>
								<AudioWaveformIcon className="size-4" />
							</Button>
						) : null}
					</PromptInputTools>

					<PromptInputSubmit
						className="size-8 rounded-full bg-primary text-primary-foreground transition-colors duration-200 hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
						disabled={!canSubmit && status !== "submitted" && status !== "streaming"}
						onStop={() => void onStop()}
						status={status}
					/>
				</PromptInputFooter>
			</PromptInput>

			<div className="px-2 text-[11px] text-text-subtle">
				Threads, attachments, and generated artifacts stay inside the current local session.
			</div>
		</div>
	);
}

export function FutureChatComposer(props: Readonly<FutureChatComposerProps>) {
	return (
		<PromptInputProvider>
			<FutureChatComposerInner {...props} />
		</PromptInputProvider>
	);
}
