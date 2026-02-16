import type { ComponentDetail } from "@/app/data/component-detail-types";

export const UI_AI_DETAILS: Record<string, ComponentDetail> = {
	"code-block": {
		description:
			"An ADS-aligned syntax-highlighted code block using Shiki with copy-to-clipboard, line numbers, and optional language selection.",
		adsUrl: "https://atlassian.design/components/code/code-block/",
		usage: `import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockFilename,
  CodeBlockHeader,
  CodeBlockCopyButton,
  CodeBlockTitle,
} from "@/components/ui-ai/code-block";

<CodeBlock code={codeString} language="typescript" showLineNumbers>
  <CodeBlockHeader>
    <CodeBlockTitle>
      <CodeBlockFilename>example.ts</CodeBlockFilename>
    </CodeBlockTitle>
    <CodeBlockActions>
      <CodeBlockCopyButton />
    </CodeBlockActions>
  </CodeBlockHeader>
</CodeBlock>`,
		props: [
			{
				name: "code",
				type: "string",
				required: true,
				description: "The code string to highlight and display.",
			},
			{
				name: "language",
				type: "BundledLanguage",
				required: true,
				description: "Programming language for syntax highlighting.",
			},
			{
				name: "showLineNumbers",
				type: "boolean",
				default: "false",
				description: "Show line numbers in the gutter.",
			},
			{
				name: "className",
				type: "string",
				description: "Additional classes applied to the outer container.",
			},
		],
		subComponents: [
			{ name: "CodeBlockContainer", description: "Wrapper with language data attribute." },
			{ name: "CodeBlockHeader", description: "Top bar for metadata and actions." },
			{ name: "CodeBlockTitle", description: "Title section in the header." },
			{ name: "CodeBlockFilename", description: "Filename display in the header." },
			{ name: "CodeBlockActions", description: "Container for action buttons." },
			{ name: "CodeBlockContent", description: "Syntax-highlighted code area." },
			{ name: "CodeBlockCopyButton", description: "Copy to clipboard button." },
			{ name: "CodeBlockLanguageSelector", description: "Select wrapper for choosing code language." },
		],
		examples: [
			{ title: "ADS basic", description: "Standard code block with filename and copy action.", demoSlug: "code-block-demo-ads-basic" },
			{ title: "ADS line numbers", description: "Code block with gutter line numbers for review workflows.", demoSlug: "code-block-demo-ads-line-numbers" },
			{ title: "ADS shell output", description: "Terminal-style command snippets following ADS usage.", demoSlug: "code-block-demo-ads-shell" },
			{ title: "ADS language selector", description: "Switch between languages in a single code block surface.", demoSlug: "code-block-demo-ads-language-selector" },
		],
	},

	message: {
		description:
			"A compound message component system for rendering chat messages with branches (multiple responses), actions, and rich content rendering via Streamdown.",
		usage: `import { Message, MessageContent, MessageActions, MessageAction } from "@/components/ui-ai/message";

<Message from="assistant">
  <MessageContent>
    <p>Hello! How can I help you today?</p>
  </MessageContent>
  <MessageActions>
    <MessageAction tooltip="Copy" label="Copy">
      <CopyIcon />
    </MessageAction>
  </MessageActions>
</Message>`,
		props: [
			{
				name: "from",
				type: '"user" | "assistant"',
				required: true,
				description: "The sender role, affects message styling.",
			},
			{
				name: "className",
				type: "string",
				description: "Additional CSS classes.",
			},
		],
		subComponents: [
			{ name: "MessageContent", description: "Main message body content area." },
			{ name: "MessageActions", description: "Container for action buttons." },
			{ name: "MessageAction", description: "Individual action button with tooltip." },
			{ name: "MessageBranch", description: "Branching container for multiple responses." },
			{ name: "MessageResponse", description: "Single response variant using Streamdown." },
		],
	},

	persona: {
		description:
			"An animated persona component using Rive WebGL animations with state-driven visuals. Supports multiple visual variants and lifecycle callbacks.",
		usage: `import Persona from "@/components/ui-ai/persona";

<Persona state="idle" variant="obsidian" />
<Persona state="thinking" variant="glint" />
<Persona state="speaking" variant="halo" />`,
		props: [
			{
				name: "state",
				type: '"idle" | "listening" | "thinking" | "speaking" | "asleep"',
				required: true,
				description: "Visual animation state of the persona.",
			},
			{
				name: "variant",
				type: '"command" | "glint" | "halo" | "mana" | "obsidian" | "opal"',
				default: '"obsidian"',
				description: "Rive animation variant.",
			},
			{
				name: "onLoad",
				type: "function",
				description: "Callback when Rive animation loads.",
			},
			{
				name: "onReady",
				type: "() => void",
				description: "Callback when Rive is ready to play.",
			},
		],
	},

	plan: {
		description:
			"A collapsible plan/outline card component with shimmer loading effects for streamed content. Organizes steps or plan details in an expandable Card container.",
		usage: `import {
  Plan,
  PlanHeader,
  PlanTitle,
  PlanDescription,
  PlanContent,
  PlanTrigger,
} from "@/components/ui-ai/plan";

<Plan>
  <PlanHeader>
    <PlanTitle>Implementation plan</PlanTitle>
    <PlanDescription>Steps to complete the feature</PlanDescription>
    <PlanTrigger />
  </PlanHeader>
  <PlanContent>
    <ol>
      <li>Set up the database schema</li>
      <li>Implement the API endpoints</li>
    </ol>
  </PlanContent>
</Plan>`,
		props: [
			{
				name: "isStreaming",
				type: "boolean",
				default: "false",
				description: "Enable shimmer loading animation for streamed content.",
			},
			{
				name: "className",
				type: "string",
				description: "Additional CSS classes.",
			},
		],
		subComponents: [
			{ name: "PlanHeader", description: "Top section of the plan card." },
			{ name: "PlanTitle", description: "Title text with shimmer support." },
			{ name: "PlanDescription", description: "Description text with shimmer support." },
			{ name: "PlanContent", description: "Collapsible content area." },
			{ name: "PlanTrigger", description: "Toggle button for expand/collapse." },
			{ name: "PlanFooter", description: "Bottom section for actions." },
		],
	},

	"prompt-input": {
		description:
			"A composable AI prompt composer built on InputGroup primitives, with textarea submission semantics, action menus, model/tool controls, file attachments, and provider-based external control.",
		usage: `import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionMenuItem,
  PromptInputSubmit,
} from "@/components/ui-ai/prompt-input";
import AddIcon from "@atlaskit/icon/core/add";

<PromptInput onSubmit={({ text, files }) => sendMessage({ text, files })}>
  <PromptInputBody>
    <PromptInputTextarea placeholder="Ask anything..." rows={1} />
  </PromptInputBody>
  <PromptInputFooter className="justify-between px-1">
    <PromptInputTools>
      <PromptInputActionMenu>
        <PromptInputActionMenuTrigger aria-label="Add">
          <AddIcon label="" />
        </PromptInputActionMenuTrigger>
        <PromptInputActionMenuContent>
          <PromptInputActionMenuItem>Add context</PromptInputActionMenuItem>
        </PromptInputActionMenuContent>
      </PromptInputActionMenu>
    </PromptInputTools>
    <PromptInputSubmit />
  </PromptInputFooter>
</PromptInput>`,
		props: [
			{
				name: "onSubmit",
				type: '(message: { text: string; files: FileUIPart[] }, event: FormEvent<HTMLFormElement>) => void | Promise<void>',
				required: true,
				description: "Submit handler for the composed message. Supports sync and async flows.",
			},
			{
				name: "accept",
				type: "string",
				description: "Optional file MIME filter for uploads (for example, 'image/*,application/pdf').",
			},
			{
				name: "multiple",
				type: "boolean",
				default: "false",
				description: "Allow selecting multiple files from the file picker.",
			},
			{
				name: "globalDrop",
				type: "boolean",
				default: "false",
				description: "When true, file drag-and-drop is captured at the document level.",
			},
			{
				name: "maxFiles",
				type: "number",
				description: "Maximum number of files accepted by the composer.",
			},
			{
				name: "maxFileSize",
				type: "number",
				description: "Maximum file size in bytes for each uploaded file.",
			},
			{
				name: "onError",
				type: '(error: { code: \"max_files\" | \"max_file_size\" | \"accept\"; message: string }) => void',
				description: "Validation callback for file acceptance/size/count failures.",
			},
			{
				name: "className",
				type: "string",
				description: "Additional classes applied to the form wrapper.",
			},
		],
		subComponents: [
			{ name: "PromptInputProvider", description: "Optional provider for externally controlled text input and attachments." },
			{ name: "PromptInputBody", description: "Body slot that wraps the main textarea input region." },
			{ name: "PromptInputTextarea", description: "Autosizing textarea with Enter-to-submit and paste-file support." },
			{ name: "PromptInputHeader", description: "Top aligned addon row for tabs, modes, or context chips." },
			{ name: "PromptInputFooter", description: "Bottom aligned addon row for tools and submit actions." },
			{ name: "PromptInputTools", description: "Inline tools container commonly used inside PromptInputFooter." },
			{ name: "PromptInputButton", description: "Action button primitive with optional tooltip support." },
			{ name: "PromptInputActionMenu", description: "Dropdown menu container for add/context actions." },
			{ name: "PromptInputActionMenuTrigger", description: "Menu trigger button specialized for PromptInput actions." },
			{ name: "PromptInputActionMenuContent", description: "Menu content panel aligned for prompt actions." },
			{ name: "PromptInputActionMenuItem", description: "Individual menu item for quick prompt actions." },
			{ name: "PromptInputActionAddAttachments", description: "Prebuilt menu item that opens the file picker." },
			{ name: "PromptInputSelect", description: "Select wrapper for model/reasoning/verbosity controls." },
			{ name: "PromptInputSubmit", description: "Submit/stop button with chat status-aware icon states." },
		],
		examples: [
			{ title: "Chat Composer style", description: "ADS-styled prompt input with add menu, customize options, and disclaimer.", demoSlug: "prompt-input-demo-chat-composer" },
			{ title: "Cursor style", description: "Compact assistant layout with mode tabs and model selector.", demoSlug: "prompt-input-demo-cursor-style" },
			{ title: "Button tooltips", description: "Action buttons with tooltip strings and shortcut hints.", demoSlug: "prompt-input-demo-button-tooltips" },
			{ title: "Action menu", description: "Quick insert actions and contextual prompt starters.", demoSlug: "prompt-input-demo-action-menu" },
			{ title: "Submit status", description: "Preview submitted, streaming, error, and stop button behaviors.", demoSlug: "prompt-input-demo-submit-status" },
			{ title: "Model selects", description: "Compose with model and response-style dropdown controls.", demoSlug: "prompt-input-demo-model-select" },
			{ title: "Provider controlled", description: "Drive PromptInput externally with PromptInputProvider and controller hooks.", demoSlug: "prompt-input-demo-provider-controlled" },
		],
	},

	artifact: {
		description:
			"A container for displaying AI-generated artifacts like code, documents, or other structured output with a title bar and optional actions.",
	},

	reasoning: {
		description:
			"A collapsible reasoning/thinking indicator that auto-opens when streaming begins and auto-closes when complete. Includes both a default BrainIcon trigger and an ADS-styled variant with Rovo logo, shimmer text, and animated color dots.",
		usage: `import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
  AdsReasoningTrigger,
} from "@/components/ui-ai/reasoning";

// Default trigger (BrainIcon)
<Reasoning isStreaming={isStreaming}>
  <ReasoningTrigger />
  <ReasoningContent>{reasoningText}</ReasoningContent>
</Reasoning>

// ADS-styled trigger (Rovo logo + shimmer + dots)
<Reasoning isStreaming={isStreaming}>
  <AdsReasoningTrigger />
  <ReasoningContent>{reasoningText}</ReasoningContent>
</Reasoning>

// Indicator-only (no chevron)
<Reasoning isStreaming={isStreaming}>
  <AdsReasoningTrigger showChevron={false} />
  <ReasoningContent>{reasoningText}</ReasoningContent>
</Reasoning>`,
		props: [
			{
				name: "isStreaming",
				type: "boolean",
				default: "false",
				description: "Whether reasoning content is actively streaming. Controls auto-open/close behavior.",
			},
			{
				name: "open",
				type: "boolean",
				description: "Controlled open state of the collapsible.",
			},
			{
				name: "defaultOpen",
				type: "boolean",
				description: "Initial open state. Defaults to the value of isStreaming. Set to false to prevent auto-open.",
			},
			{
				name: "onOpenChange",
				type: "(open: boolean) => void",
				description: "Callback when the open state changes.",
			},
			{
				name: "duration",
				type: "number",
				description: "Thinking duration in seconds. Auto-computed from streaming start/stop when not provided.",
			},
		],
		subComponents: [
			{ name: "ReasoningTrigger", description: "Default trigger with BrainIcon, shimmer text, and chevron." },
			{ name: "AdsReasoningTrigger", description: "ADS-styled trigger with Rovo logo, shimmer text, animated color dots, and optional chevron." },
			{ name: "ReasoningContent", description: "Collapsible content area rendering reasoning text via Streamdown." },
		],
		examples: [
			{ title: "ADS streaming", description: "ADS trigger with Rovo logo, shimmer, dots, and chevron in streaming state.", demoSlug: "reasoning-demo-ads-streaming" },
			{ title: "ADS completed", description: "ADS trigger showing completed state with duration.", demoSlug: "reasoning-demo-ads-completed" },
			{ title: "ADS indicator", description: "ADS trigger without chevron, matching ThinkingIndicator visual.", demoSlug: "reasoning-demo-ads-indicator" },
			{ title: "Default streaming", description: "Default BrainIcon trigger in streaming state.", demoSlug: "reasoning-demo-streaming" },
			{ title: "Custom label", description: "ADS trigger with custom label text.", demoSlug: "reasoning-demo-custom-label" },
		],
	},
};
