"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { RovoChatProvider, useRovoChat } from "@/app/contexts";
import type { SendPromptOptions } from "@/app/contexts";
import { ChatMessages } from "@/components/projects/shared/components/chat-messages";
import { useScrollAnchoring } from "@/components/projects/shared/hooks/use-scroll-anchoring";
import { BrowserPreviewPanel } from "@/components/website/demos/utils/components/browser-preview-panel";
import { useBrowserArtifacts } from "@/components/website/demos/utils/hooks/use-browser-artifacts";
import { getFutureChatShellLayout } from "@/components/projects/future-chat/lib/future-chat-shell-layout";
import {
	PromptInput,
	PromptInputBody,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputFooter,
} from "@/components/ui-ai/prompt-input";
import ArrowUpIcon from "@atlaskit/icon/core/arrow-up";
import GlobeIcon from "@atlaskit/icon/core/globe";
import { Footer } from "@/components/ui/footer";
import { token } from "@/lib/tokens";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const BROWSER_PROMPT_OPTIONS: SendPromptOptions = {
	contextDescription: [
		"You are a browser automation assistant. You have access to the agent-browser tool via MCP.",
		"When the user asks you to browse a website, use the available browser tools to:",
		"1. Open the URL (browser_navigate)",
		"2. Take a snapshot of the accessibility tree (browser_snapshot)",
		"3. Take a screenshot (browser_take_screenshot) — save screenshots to public/screenshots/ so they're served by Next.js dev server",
		"4. Interact with elements if needed (browser_click, browser_type)",
		"5. Close the browser when done",
		"Show each step as you go. Describe what you see on the page.",
		"If the user asks to interact with elements, use the accessibility refs from the snapshot.",
	].join(" "),
};

const SUGGESTIONS = [
	"Browse https://example.com and describe what you see",
	"Open https://news.ycombinator.com and take a screenshot",
	"Navigate to https://example.com and click the 'More information...' link",
];

const SPRING_TRANSITION = {
	type: "spring" as const,
	stiffness: 300,
	damping: 30,
};

/* -------------------------------------------------------------------------- */
/*  Empty state                                                                */
/* -------------------------------------------------------------------------- */

function AgentBrowserEmptyState() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
			<div
				className="bg-surface-raised flex items-center justify-center rounded-2xl"
				style={{ width: 56, height: 56 }}
			>
				<GlobeIcon label="" size="medium" color={token("color.icon.brand")} />
			</div>
			<div>
				<p className="text-text text-lg font-semibold">Agent Browser</p>
				<p className="text-text-subtlest mt-1 max-w-md text-sm">
					Browse websites with AI assistance. The agent navigates pages, captures
					snapshots and screenshots, and interacts with elements — all visible
					step by step in the chat.
				</p>
			</div>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  Main demo component                                                        */
/* -------------------------------------------------------------------------- */

function AgentBrowserView() {
	const {
		uiMessages,
		sendPrompt,
		stopStreaming,
		resetChat,
		isStreaming,
		isSubmitPending,
	} = useRovoChat();

	const [prompt, setPrompt] = useState("");
	const isSubmittingRef = useRef(false);
	const isRequestInFlight = isStreaming || isSubmitPending;

	const { conversationContextRef, scrollSpacerRef } = useScrollAnchoring({
		uiMessages,
		enabled: uiMessages.length > 0,
	});

	/* ---- Browser artifacts ---- */
	const artifacts = useBrowserArtifacts(uiMessages);
	const [previewDismissed, setPreviewDismissed] = useState(false);
	const isPreviewOpen = artifacts.hasArtifacts && !previewDismissed;

	/* ---- Shell sizing / layout ---- */
	const shellRef = useRef<HTMLDivElement | null>(null);
	const [shellWidth, setShellWidth] = useState(0);

	useEffect(() => {
		const shellElement = shellRef.current;
		if (!shellElement || typeof ResizeObserver === "undefined") {
			return;
		}

		const updateWidth = () => {
			setShellWidth(shellElement.clientWidth);
		};

		updateWidth();
		const observer = new ResizeObserver(() => {
			updateWidth();
		});
		observer.observe(shellElement);
		return () => observer.disconnect();
	}, []);

	const layout = getFutureChatShellLayout(shellWidth);
	const shouldSplit = isPreviewOpen && layout.mode === "split";

	/* ---- Handlers ---- */
	const handleSubmit = useCallback(async () => {
		const trimmed = prompt.trim();
		if (!trimmed || isSubmittingRef.current) return;

		isSubmittingRef.current = true;
		setPrompt("");

		try {
			await sendPrompt(trimmed, BROWSER_PROMPT_OPTIONS);
		} finally {
			isSubmittingRef.current = false;
		}
	}, [prompt, sendPrompt]);

	const handleSuggestionClick = useCallback(
		async (question: string) => {
			if (isSubmittingRef.current) return;
			isSubmittingRef.current = true;

			try {
				await sendPrompt(question, BROWSER_PROMPT_OPTIONS);
			} finally {
				isSubmittingRef.current = false;
			}
		},
		[sendPrompt],
	);

	const submitStatus = isStreaming
		? ("streaming" as const)
		: isSubmitPending
			? ("submitted" as const)
			: ("ready" as const);

	const handleStop = useCallback(() => {
		void stopStreaming();
	}, [stopStreaming]);

	useEffect(() => {
		return () => {
			void stopStreaming();
		};
	}, [stopStreaming]);

	const handleNewSession = useCallback(() => {
		resetChat();
		setPrompt("");
		setPreviewDismissed(false);
	}, [resetChat]);

	const isChatMode = uiMessages.length > 0;

	return (
		<div ref={shellRef} className="relative flex h-[calc(100dvh-1px)] overflow-hidden">
			{/* Chat pane */}
			<motion.div
				layout
				transition={SPRING_TRANSITION}
				style={
					shouldSplit
						? { width: `${layout.chatPaneWidth ?? shellWidth}px` }
						: undefined
				}
				className={cn(
					"relative z-10 flex min-w-0 flex-col bg-background",
					shouldSplit ? "w-full shrink-0 flex-none" : "flex-1",
				)}
			>
				{/* Header */}
				<div
					className="border-border flex shrink-0 items-center justify-between border-b px-4"
					style={{ height: 56 }}
				>
					<div className="flex items-center gap-2">
						<GlobeIcon label="" size="small" color={token("color.icon.brand")} />
						<span className="text-text text-sm font-semibold">Agent Browser</span>
					</div>
					<div className="flex items-center gap-2">
						{artifacts.hasArtifacts && !isPreviewOpen ? (
							<button
								type="button"
								onClick={() => setPreviewDismissed(false)}
								className="text-text-subtle hover:text-text border-border hover:bg-surface-raised rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
							>
								Preview
							</button>
						) : null}
						{isChatMode ? (
							<button
								type="button"
								onClick={handleNewSession}
								disabled={isRequestInFlight}
								className="text-text-subtle hover:text-text border-border hover:bg-surface-raised rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
							>
								New session
							</button>
						) : null}
					</div>
				</div>

				{/* Chat area */}
				{!isChatMode ? (
					<div className="flex flex-1 flex-col">
						<AgentBrowserEmptyState />
						{/* Suggestion chips */}
						<div className="flex flex-wrap justify-center gap-2 px-4 pb-4">
							{SUGGESTIONS.map((s) => (
								<button
									key={s}
									type="button"
									onClick={() => void handleSuggestionClick(s)}
									className="text-text-subtle bg-surface-raised border-border hover:bg-surface-raised-hovered rounded-full border px-3 py-1.5 text-xs transition-colors"
								>
									{s}
								</button>
							))}
						</div>
					</div>
				) : (
					<div className="flex flex-1 flex-col items-center overflow-hidden">
						<div className="flex w-full max-w-[768px] flex-1 flex-col overflow-hidden">
							<ChatMessages
								uiMessages={uiMessages}
								onSuggestedQuestionClick={handleSuggestionClick}
								conversationContextRef={conversationContextRef}
								scrollSpacerRef={scrollSpacerRef}
								isStreaming={isStreaming}
								isSubmitPending={isSubmitPending}
								messageMode="ask"
								streamingIndicatorVariant="reasoning-expanded"
							/>
						</div>
					</div>
				)}

				{/* Composer */}
				<div className="mx-auto w-full max-w-[800px] shrink-0 px-3 pb-3">
					<PromptInput onSubmit={handleSubmit}>
						<PromptInputBody>
							<PromptInputTextarea
								placeholder="Enter a URL to browse or describe what you want to do…"
								value={prompt}
								onChange={(e) => setPrompt(e.target.value)}
							/>
						</PromptInputBody>
						<PromptInputFooter>
							<PromptInputSubmit
								aria-label="Submit"
								disabled={!isRequestInFlight && !prompt.trim()}
								status={submitStatus}
								onStop={handleStop}
								size="icon-sm"
							>
								<ArrowUpIcon label="" />
							</PromptInputSubmit>
						</PromptInputFooter>
					</PromptInput>
					<Footer className="mt-2">
						Rovo Dev may produce inaccurate information
					</Footer>
				</div>
			</motion.div>

			{/* Preview panel */}
			<AnimatePresence>
				{isPreviewOpen ? (
					<motion.div
						animate={{
							opacity: 1,
							x: shouldSplit ? layout.artifactPaneX : 0,
							width: shouldSplit ? layout.artifactPaneWidth : shellWidth || "100%",
							height: "100%",
						}}
						className="absolute top-0 left-0 z-40 flex h-full flex-col overflow-hidden border-border bg-background md:border-l"
						exit={{
							opacity: 0,
							x: shellWidth,
							transition: {
								...SPRING_TRANSITION,
								stiffness: 600,
							},
						}}
						initial={{
							opacity: 0,
							x: shellWidth,
							width: shouldSplit ? layout.artifactPaneWidth : shellWidth || "100%",
							height: "100%",
						}}
						transition={SPRING_TRANSITION}
					>
						<BrowserPreviewPanel
							currentUrl={artifacts.currentUrl}
							latestScreenshot={artifacts.latestScreenshot}
							latestSnapshot={artifacts.latestSnapshot}
							isToolRunning={artifacts.isToolRunning}
							onClose={() => setPreviewDismissed(true)}
						/>
					</motion.div>
				) : null}
			</AnimatePresence>
		</div>
	);
}

export default function AgentBrowser() {
	return (
		<RovoChatProvider>
			<AgentBrowserView />
		</RovoChatProvider>
	);
}
