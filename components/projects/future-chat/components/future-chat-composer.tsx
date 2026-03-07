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
import type { FutureChatModelOption } from "@/lib/future-chat-types";
import { cn } from "@/lib/utils";
import { CheckIcon, PaperclipIcon } from "lucide-react";
import { useState } from "react";
import { PendingAttachments } from "./pending-attachments";

const SUGGESTED_ACTIONS = [
	"What are the advantages of using Next.js?",
	"Write code to demonstrate Dijkstra's algorithm",
	"Help me write an essay about Silicon Valley",
	"What is the weather in San Francisco?",
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
	selectedModel: FutureChatModelOption;
	showSuggestedActions?: boolean;
	status: ChatStatus;
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
					className="h-auto justify-start whitespace-normal p-3 text-left"
					key={suggestion}
					onClick={() => void onSuggestedAction(suggestion)}
					type="button"
					variant="outline"
				>
					{suggestion}
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
					<Button className="h-8 w-[200px] justify-between px-2" type="button" variant="ghost" />
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
	selectedModel,
	showSuggestedActions = false,
	status,
}: Readonly<FutureChatComposerProps>) {
	const attachments = usePromptInputAttachments();
	const controller = usePromptInputController();
	const canSubmit =
		controller.textInput.value.trim().length > 0 || attachments.files.length > 0;

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
				className="rounded-xl border border-border bg-background p-3 shadow-xs transition-all duration-200 hover:border-muted-foreground/50 focus-within:border-border"
				onSubmit={onSubmit}
			>
				{artifactTitle ? (
					<div className="mb-3 rounded-lg border border-border bg-muted/50 px-3 py-2 text-muted-foreground text-xs">
						Editing artifact context from{" "}
						<span className="font-medium text-foreground">{artifactTitle}</span>
					</div>
				) : null}

				<PendingAttachments />

				<div className="flex flex-row items-start gap-1 sm:gap-2">
					<PromptInputTextarea
						className="min-h-11 max-h-[200px] grow resize-none border-0! border-none! bg-transparent p-2 text-base outline-none ring-0 [-ms-overflow-style:none] [scrollbar-width:none] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [&::-webkit-scrollbar]:hidden"
						placeholder="Send a message..."
					/>
				</div>

				<PromptInputFooter className="justify-between gap-2 border-t-0 pt-0">
					<PromptInputTools className="gap-0 sm:gap-0.5">
						<Button
							className="aspect-square h-8 rounded-lg p-1 transition-colors hover:bg-accent"
							onClick={(event) => {
								event.preventDefault();
								attachments.openFileDialog();
							}}
							type="button"
							variant="ghost"
						>
							<PaperclipIcon className="size-4" />
						</Button>

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
