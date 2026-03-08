"use client";

import type { ChatStatus, FileUIPart } from "ai";
import {
	ModelSelector,
	ModelSelectorContent,
	ModelSelectorGroup,
	ModelSelectorInput,
	ModelSelectorItem,
	ModelSelectorList,
	ModelSelectorLogo,
	ModelSelectorName,
	ModelSelectorTrigger,
} from "@/components/ui-ai/model-selector";
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
import type { FutureChatModelOption } from "@/lib/future-chat-types";
import { cn } from "@/lib/utils";
import { CheckIcon, MicIcon, PaperclipIcon } from "lucide-react";
import { useCallback, useState } from "react";
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
	models: ReadonlyArray<FutureChatModelOption>;
	onSelectModel: (modelId: string) => void;
	onStop: () => Promise<void>;
	onSubmit: (payload: {
		text: string;
		files: FileUIPart[];
	}) => Promise<void>;
	onSuggestedAction: (text: string) => Promise<void>;
	onToggleVoice?: () => void;
	selectedModel: FutureChatModelOption;
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

function CompactModelSelector({
	models,
	onSelectModel,
	selectedModel,
}: Readonly<{
	models: ReadonlyArray<FutureChatModelOption>;
	onSelectModel: (modelId: string) => void;
	selectedModel: FutureChatModelOption;
}>) {
	const [open, setOpen] = useState(false);

	return (
		<ModelSelector onOpenChange={setOpen} open={open}>
			<ModelSelectorTrigger
				render={(
					<Button className="h-8 w-[220px] justify-between rounded-full px-2" type="button" variant="ghost" />
				)}
			>
				<div className="flex min-w-0 items-center gap-2">
					<ModelSelectorLogo provider={selectedModel.provider} />
					<ModelSelectorName className="truncate">{selectedModel.label}</ModelSelectorName>
				</div>
			</ModelSelectorTrigger>
			<ModelSelectorContent>
				<ModelSelectorInput placeholder="Search models..." />
				<ModelSelectorList>
					<ModelSelectorGroup heading="Available models">
						{models.map((model) => (
							<ModelSelectorItem
								key={model.id}
								onSelect={() => {
									onSelectModel(model.id);
									setOpen(false);
								}}
								value={model.id}
							>
								<ModelSelectorLogo provider={model.provider} />
								<div className="min-w-0 flex flex-1 flex-col text-left">
									<ModelSelectorName>{model.label}</ModelSelectorName>
									<span className="truncate text-muted-foreground text-xs">
										{model.description}
									</span>
								</div>
								{model.id === selectedModel.id ? (
									<CheckIcon className="ml-auto size-4" />
								) : null}
							</ModelSelectorItem>
						))}
					</ModelSelectorGroup>
				</ModelSelectorList>
			</ModelSelectorContent>
		</ModelSelector>
	);
}

function FutureChatComposerInner({
	artifactTitle,
	compact = false,
	errorMessage,
	models,
	onSelectModel,
	onStop,
	onSubmit,
	onSuggestedAction,
	onToggleVoice,
	selectedModel,
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

						<CompactModelSelector
							models={models}
							onSelectModel={onSelectModel}
							selectedModel={selectedModel}
						/>
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
