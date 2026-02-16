import type { ComponentDetail } from "@/app/data/component-detail-types";

export const UI_AI_DETAILS: Record<string, ComponentDetail> = {
	"audio-player": {
		description:
			"A composable audio player built on media-chrome with play/pause, seek, time display, and volume controls. Supports remote URLs and AI SDK SpeechResult base64 audio.",
		usage: `import {
  AudioPlayer,
  AudioPlayerElement,
  AudioPlayerControlBar,
  AudioPlayerPlayButton,
  AudioPlayerTimeDisplay,
  AudioPlayerTimeRange,
  AudioPlayerDurationDisplay,
  AudioPlayerMuteButton,
  AudioPlayerVolumeRange,
  AudioPlayerSeekBackwardButton,
  AudioPlayerSeekForwardButton,
} from "@/components/ui-ai/audio-player";

<AudioPlayer>
  <AudioPlayerElement src="/audio/sample.mp3" />
  <AudioPlayerControlBar>
    <AudioPlayerPlayButton />
    <AudioPlayerTimeDisplay />
    <AudioPlayerTimeRange />
    <AudioPlayerDurationDisplay />
  </AudioPlayerControlBar>
</AudioPlayer>`,
		props: [
			{
				name: "src",
				type: "string",
				description: "Remote audio URL passed to AudioPlayerElement.",
			},
			{
				name: "data",
				type: "SpeechResult[\"audio\"]",
				description: "AI SDK SpeechResult audio object with base64 and mediaType fields, passed to AudioPlayerElement.",
			},
			{
				name: "seekOffset",
				type: "number",
				default: "10",
				description: "Seconds to skip on seek backward/forward buttons.",
			},
			{
				name: "className",
				type: "string",
				description: "Additional classes applied to any sub-component.",
			},
		],
		subComponents: [
			{ name: "AudioPlayer", description: "Root MediaController wrapper for audio playback with theme variables." },
			{ name: "AudioPlayerElement", description: "Audio source element supporting remote URLs (src) or AI SDK SpeechResult data (base64)." },
			{ name: "AudioPlayerControlBar", description: "Control bar container that wraps child controls in a ButtonGroup." },
			{ name: "AudioPlayerPlayButton", description: "Play/pause toggle button." },
			{ name: "AudioPlayerSeekBackwardButton", description: "Rewind button (default: 10 seconds)." },
			{ name: "AudioPlayerSeekForwardButton", description: "Fast-forward button (default: 10 seconds)." },
			{ name: "AudioPlayerTimeDisplay", description: "Current playback position display." },
			{ name: "AudioPlayerDurationDisplay", description: "Total audio duration display." },
			{ name: "AudioPlayerTimeRange", description: "Seek slider for position control." },
			{ name: "AudioPlayerMuteButton", description: "Mute/unmute toggle button." },
			{ name: "AudioPlayerVolumeRange", description: "Volume level slider." },
		],
		examples: [
			{ title: "Full controls", description: "Audio player with seek, play/pause, time, duration, mute, and volume.", demoSlug: "audio-player-demo-full" },
			{ title: "Compact", description: "Minimal player with play, seek slider, and time display.", demoSlug: "audio-player-demo-compact" },
			{ title: "With volume", description: "Player with time range, duration, and volume controls.", demoSlug: "audio-player-demo-with-volume" },
		],
	},

	agent: {
		description:
			"A structured card for displaying AI agent configuration including name, model, instructions, tools, and output schema.",
		usage: `import {
  Agent,
  AgentHeader,
  AgentContent,
  AgentInstructions,
  AgentTools,
  AgentTool,
  AgentOutput,
} from "@/components/ui-ai/agent";

<Agent>
  <AgentHeader name="Sentiment Analyzer" model="anthropic/claude-sonnet-4-5" />
  <AgentContent>
    <AgentInstructions>
      Analyze text sentiment and return structured results.
    </AgentInstructions>
    <AgentTools multiple>
      <AgentTool tool={webSearch} value="web_search" />
    </AgentTools>
    <AgentOutput schema={outputSchema} />
  </AgentContent>
</Agent>`,
		demoLayout: {
			previewContentWidth: "full",
			examplesContentWidth: "full",
		},
		props: [
			{
				name: "className",
				type: "string",
				description: "Additional classes applied to the outer container.",
			},
		],
		subComponents: [
			{ name: "AgentHeader", description: "Top bar with agent name, icon, and optional model badge." },
			{ name: "AgentContent", description: "Body container for instructions, tools, and output." },
			{ name: "AgentInstructions", description: "Instruction text block with label." },
			{ name: "AgentTools", description: "Accordion container for tool definitions." },
			{ name: "AgentTool", description: "Individual tool item with expandable JSON schema." },
			{ name: "AgentOutput", description: "Output schema display with syntax highlighting." },
		],
		examples: [
			{ title: "Full agent", description: "Agent card with instructions, tools, and output schema.", demoSlug: "agent-demo-full" },
			{ title: "With tools", description: "Agent card showing only the tools accordion.", demoSlug: "agent-demo-with-tools" },
			{ title: "With output", description: "Agent card with instructions and output schema, no tools.", demoSlug: "agent-demo-with-output" },
			{ title: "Minimal", description: "Header-only agent card with name and model badge.", demoSlug: "agent-demo-minimal" },
		],
	},

	attachments: {
		description:
			"A compound attachment system for displaying file and source-document attachments in grid, inline, or list layouts with hover previews, remove buttons, and media-aware icons.",
		usage: `import {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentInfo,
  AttachmentRemove,
} from "@/components/ui-ai/attachments";

<Attachments variant="grid">
  {files.map((file) => (
    <Attachment key={file.id} data={file} onRemove={() => remove(file.id)}>
      <AttachmentPreview />
      <AttachmentRemove />
    </Attachment>
  ))}
</Attachments>`,
		props: [
			{
				name: "variant",
				type: '"grid" | "inline" | "list"',
				default: '"grid"',
				description: "Layout presentation mode: grid thumbnails, inline badges, or list rows.",
			},
			{
				name: "data",
				type: "(FileUIPart & { id: string }) | (SourceDocumentUIPart & { id: string })",
				required: true,
				description: "Attachment data object passed to each Attachment item.",
			},
			{
				name: "onRemove",
				type: "() => void",
				description: "Remove callback. When provided, AttachmentRemove renders a dismiss button.",
			},
			{
				name: "className",
				type: "string",
				description: "Additional CSS classes.",
			},
		],
		subComponents: [
			{ name: "Attachments", description: "Container establishing layout variant context." },
			{ name: "Attachment", description: "Individual item wrapper with data and remove callback." },
			{ name: "AttachmentPreview", description: "Media preview rendering images, video, or category icons." },
			{ name: "AttachmentInfo", description: "Filename and optional media type display." },
			{ name: "AttachmentRemove", description: "Hover-visible remove button with screen-reader label." },
			{ name: "AttachmentHoverCard", description: "Hover preview wrapper for inline attachments." },
			{ name: "AttachmentHoverCardTrigger", description: "Trigger element for the hover card." },
			{ name: "AttachmentHoverCardContent", description: "Content panel for the hover preview." },
			{ name: "AttachmentEmpty", description: "Empty state placeholder when no attachments exist." },
		],
		examples: [
			{ title: "Grid", description: "Grid thumbnail layout with mixed file types and remove buttons.", demoSlug: "attachments-demo-grid" },
			{ title: "Inline", description: "Compact inline badge layout with filename and remove.", demoSlug: "attachments-demo-inline" },
			{ title: "List", description: "Full-row list layout showing media type metadata.", demoSlug: "attachments-demo-list" },
			{ title: "Hover card", description: "Inline badges with hover preview for image attachments.", demoSlug: "attachments-demo-hover-card" },
			{ title: "Read-only", description: "Grid images without remove buttons.", demoSlug: "attachments-demo-read-only" },
			{ title: "Empty state", description: "Empty state when no attachments are present.", demoSlug: "attachments-demo-empty" },
		],
	},

	checkpoint: {
		description:
			"A conversation checkpoint marker that lets users save and restore specific points in a chat history. Renders a visual separator with a bookmark icon and a restore trigger button.",
		usage: `import {
  Checkpoint,
  CheckpointIcon,
  CheckpointTrigger,
} from "@/components/ui-ai/checkpoint";

<Checkpoint>
  <CheckpointIcon />
  <CheckpointTrigger tooltip="Restore to this point">
    Restore checkpoint
  </CheckpointTrigger>
</Checkpoint>`,
		props: [
			{
				name: "children",
				type: "ReactNode",
				required: true,
				description: "CheckpointIcon and CheckpointTrigger sub-components.",
			},
			{
				name: "className",
				type: "string",
				description: "Additional classes applied to the root container.",
			},
		],
		subComponents: [
			{ name: "Checkpoint", description: "Root flex container with separator line." },
			{ name: "CheckpointIcon", description: "Visual indicator icon, defaults to BookmarkIcon. Pass custom children to override." },
			{ name: "CheckpointTrigger", description: "Ghost button that triggers a restore action. Supports an optional tooltip prop." },
		],
		examples: [
			{ title: "In conversation", description: "Checkpoints placed between messages with restore-on-click behavior.", demoSlug: "checkpoint-demo-conversation" },
			{ title: "Basic", description: "Minimal checkpoint with default bookmark icon and label.", demoSlug: "checkpoint-demo-basic" },
			{ title: "With tooltip", description: "Checkpoint trigger with a descriptive tooltip on hover.", demoSlug: "checkpoint-demo-with-tooltip" },
			{ title: "Custom icons", description: "Checkpoints using FlagIcon and HistoryIcon instead of the default bookmark.", demoSlug: "checkpoint-demo-custom-icon" },
		],
	},

	commit: {
		description:
			"A collapsible commit card displaying git commit details including hash, message, author avatar, relative timestamp, copy-to-clipboard, and an expandable file changes list with color-coded status badges and line change counts.",
		usage: `import {
  Commit,
  CommitHeader,
  CommitAuthor,
  CommitAuthorAvatar,
  CommitInfo,
  CommitMessage,
  CommitMetadata,
  CommitHash,
  CommitSeparator,
  CommitTimestamp,
  CommitActions,
  CommitCopyButton,
  CommitContent,
  CommitFiles,
  CommitFile,
  CommitFileInfo,
  CommitFileStatus,
  CommitFileIcon,
  CommitFilePath,
  CommitFileChanges,
  CommitFileAdditions,
  CommitFileDeletions,
} from "@/components/ui-ai/commit";

<Commit>
  <CommitHeader>
    <CommitAuthor>
      <CommitAuthorAvatar initials="ES" className="mr-3" />
      <CommitInfo>
        <CommitMessage>Refactor auth module</CommitMessage>
        <CommitMetadata>
          <CommitHash>a1b2c3d</CommitHash>
          <CommitSeparator />
          <CommitTimestamp date={new Date()} />
        </CommitMetadata>
      </CommitInfo>
    </CommitAuthor>
    <CommitActions>
      <CommitCopyButton hash="a1b2c3d" />
    </CommitActions>
  </CommitHeader>
  <CommitContent>
    <CommitFiles>
      <CommitFile>
        <CommitFileInfo>
          <CommitFileStatus status="modified" />
          <CommitFileIcon />
          <CommitFilePath>src/auth.ts</CommitFilePath>
        </CommitFileInfo>
        <CommitFileChanges>
          <CommitFileAdditions count={24} />
          <CommitFileDeletions count={8} />
        </CommitFileChanges>
      </CommitFile>
    </CommitFiles>
  </CommitContent>
</Commit>`,
		props: [
			{
				name: "className",
				type: "string",
				description: "Additional classes applied to the root Collapsible container.",
			},
			{
				name: "defaultOpen",
				type: "boolean",
				default: "false",
				description: "Initial expanded state for the collapsible file list.",
			},
		],
		subComponents: [
			{ name: "CommitHeader", description: "Collapsible trigger row containing author, message, and actions." },
			{ name: "CommitAuthor", description: "Flex container for avatar and commit info." },
			{ name: "CommitAuthorAvatar", description: "Avatar with initials fallback. Requires `initials` prop." },
			{ name: "CommitInfo", description: "Column container for message and metadata." },
			{ name: "CommitMessage", description: "Commit message text." },
			{ name: "CommitMetadata", description: "Row for hash, separator, and timestamp." },
			{ name: "CommitHash", description: "Monospace commit hash with git icon." },
			{ name: "CommitSeparator", description: "Visual separator (defaults to \u2022)." },
			{ name: "CommitTimestamp", description: "Relative time element. Requires `date` prop." },
			{ name: "CommitActions", description: "Action button container (stops event propagation)." },
			{ name: "CommitCopyButton", description: "Copy hash to clipboard. Requires `hash` prop." },
			{ name: "CommitContent", description: "Collapsible content area for file changes." },
			{ name: "CommitFiles", description: "Container for file rows." },
			{ name: "CommitFile", description: "Individual file row with hover highlight." },
			{ name: "CommitFileInfo", description: "File metadata: status badge, icon, and path." },
			{ name: "CommitFileStatus", description: "Color-coded status badge (added/modified/deleted/renamed)." },
			{ name: "CommitFileIcon", description: "File type icon." },
			{ name: "CommitFilePath", description: "Truncated monospace file path." },
			{ name: "CommitFileChanges", description: "Line change statistics container." },
			{ name: "CommitFileAdditions", description: "Green additions count with plus icon." },
			{ name: "CommitFileDeletions", description: "Red deletions count with minus icon." },
		],
		examples: [
			{ title: "Full commit", description: "Complete commit card with author, metadata, copy button, and expandable file changes.", demoSlug: "commit-demo-full" },
			{ title: "Expanded files", description: "Commit with file list expanded by default.", demoSlug: "commit-demo-with-files" },
			{ title: "Minimal", description: "Header-only commit with message, hash, and timestamp.", demoSlug: "commit-demo-minimal" },
			{ title: "Commit list", description: "Multiple commits stacked in a list view.", demoSlug: "commit-demo-multiple" },
		],
	},

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

	"chain-of-thought": {
		description:
			"A collapsible reasoning timeline that shows an assistant's step-by-step process with status states, search-result chips, and optional image context.",
		usage: `import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
} from "@/components/ui-ai/chain-of-thought";
import { SearchIcon } from "lucide-react";

<ChainOfThought defaultOpen>
  <ChainOfThoughtHeader>Tracing model reasoning</ChainOfThoughtHeader>
  <ChainOfThoughtContent>
    <ChainOfThoughtStep icon={SearchIcon} label="Searching source profiles" status="active">
      <ChainOfThoughtSearchResults>
        <ChainOfThoughtSearchResult>github.com</ChainOfThoughtSearchResult>
        <ChainOfThoughtSearchResult>x.com</ChainOfThoughtSearchResult>
      </ChainOfThoughtSearchResults>
    </ChainOfThoughtStep>
  </ChainOfThoughtContent>
</ChainOfThought>`,
		demoLayout: {
			previewContentWidth: "full",
			examplesContentWidth: "full",
		},
		props: [
			{
				name: "open",
				type: "boolean",
				description: "Controlled open state for the reasoning container.",
			},
			{
				name: "defaultOpen",
				type: "boolean",
				default: "false",
				description: "Initial open state when used uncontrolled.",
			},
			{
				name: "onOpenChange",
				type: "(open: boolean) => void",
				description: "Callback fired whenever open state changes.",
			},
			{
				name: "className",
				type: "string",
				description: "Additional classes for the root container.",
			},
		],
		subComponents: [
			{ name: "ChainOfThoughtHeader", description: "Collapsible trigger row with label and chevron." },
			{ name: "ChainOfThoughtContent", description: "Animated content panel shown when open." },
			{ name: "ChainOfThoughtStep", description: "Individual reasoning step with icon, label, description, and status." },
			{ name: "ChainOfThoughtSearchResults", description: "Container for source/result chips attached to a step." },
			{ name: "ChainOfThoughtSearchResult", description: "Single result chip rendered as an ADS-aligned badge." },
			{ name: "ChainOfThoughtImage", description: "Image container with caption support for visual reasoning evidence." },
		],
		examples: [
			{ title: "ADS workflow", description: "Canonical chain-of-thought flow from ai-elements: search, image evidence, summary, and active follow-up.", demoSlug: "chain-of-thought-demo-ads-workflow" },
			{ title: "Status variants", description: "Compare complete, active, and pending step states in one reasoning chain.", demoSlug: "chain-of-thought-demo-status-variants" },
			{ title: "Search results", description: "Standalone source-chip usage for search and retrieval phases.", demoSlug: "chain-of-thought-demo-search-results" },
			{ title: "Image step", description: "Reasoning step with image evidence and caption.", demoSlug: "chain-of-thought-demo-image-step" },
		],
	},

	canvas: {
		description:
			"A pre-configured React Flow canvas optimized for AI workflow visualization. Provides sensible defaults (fitView, panOnScroll, selectionOnDrag) and renders a themed Background. Use with Node, Edge, Connection, Controls, Panel, and Toolbar companion components.",
		usage: `import { Canvas } from "@/components/ui-ai/canvas";
import { Connection } from "@/components/ui-ai/connection";
import { Controls } from "@/components/ui-ai/controls";
import { Edge } from "@/components/ui-ai/edge";
import {
  Node, NodeHeader, NodeTitle, NodeDescription,
  NodeContent, NodeFooter,
} from "@/components/ui-ai/node";

<Canvas
  connectionLineComponent={Connection}
  edges={edges}
  edgeTypes={{ animated: Edge.Animated, temporary: Edge.Temporary }}
  nodes={nodes}
  nodeTypes={nodeTypes}
>
  <Controls />
</Canvas>`,
		demoLayout: {
			previewContentWidth: "full",
			examplesContentWidth: "full",
		},
		props: [
			{
				name: "children",
				type: "ReactNode",
				description: "Child components rendered inside the canvas (Controls, Panel, MiniMap, etc.).",
			},
			{
				name: "nodes",
				type: "Node[]",
				required: true,
				description: "Array of node objects with id, position, data, and optional type.",
			},
			{
				name: "edges",
				type: "Edge[]",
				required: true,
				description: "Array of edge objects with id, source, target, and optional type.",
			},
			{
				name: "nodeTypes",
				type: "Record<string, ComponentType>",
				description: "Map of custom node type renderers keyed by type name.",
			},
			{
				name: "edgeTypes",
				type: "Record<string, ComponentType>",
				description: "Map of custom edge type renderers keyed by type name.",
			},
			{
				name: "connectionLineComponent",
				type: "ConnectionLineComponent",
				description: "Custom component for rendering the connection line while dragging.",
			},
			{
				name: "className",
				type: "string",
				description: "Additional classes applied to the ReactFlow container.",
			},
		],
		subComponents: [
			{ name: "Canvas", description: "Pre-configured ReactFlow wrapper with Background, fitView, panOnScroll, and selectionOnDrag defaults." },
		],
		examples: [
			{ title: "Workflow", description: "Full workflow canvas with six nodes, animated and temporary edges, and connection line.", demoSlug: "canvas-demo-workflow" },
			{ title: "Minimal", description: "Simple two-node input-to-output graph.", demoSlug: "canvas-demo-minimal" },
			{ title: "With controls", description: "Canvas with zoom, fit-view, and interactive toggle controls.", demoSlug: "canvas-demo-with-controls" },
			{ title: "With panel", description: "Canvas with an overlay status panel and controls.", demoSlug: "canvas-demo-with-panel" },
			{ title: "With toolbar", description: "Nodes with a bottom-positioned toolbar for edit, copy, and delete actions.", demoSlug: "canvas-demo-with-toolbar" },
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
		demoLayout: {
			previewContentWidth: "full",
		},
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
		usage: `import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactDescription,
  ArtifactActions,
  ArtifactAction,
  ArtifactClose,
  ArtifactContent,
} from "@/components/ui-ai/artifact";

<Artifact>
  <ArtifactHeader>
    <div>
      <ArtifactTitle>Algorithm Implementation</ArtifactTitle>
      <ArtifactDescription>Updated 1 minute ago</ArtifactDescription>
    </div>
    <ArtifactActions>
      <ArtifactAction icon={CopyIcon} label="Copy" tooltip="Copy to clipboard" />
      <ArtifactAction icon={DownloadIcon} label="Download" tooltip="Download file" />
    </ArtifactActions>
  </ArtifactHeader>
  <ArtifactContent>
    {/* Your content here */}
  </ArtifactContent>
</Artifact>`,
		demoLayout: {
			previewContentWidth: "full",
			examplesContentWidth: "full",
		},
		props: [
			{
				name: "className",
				type: "string",
				description: "Additional classes applied to the outer container.",
			},
		],
		subComponents: [
			{ name: "ArtifactHeader", description: "Header bar with title area and actions. Uses flexbox with justify-between." },
			{ name: "ArtifactTitle", description: "Title text rendered as a paragraph with medium font weight." },
			{ name: "ArtifactDescription", description: "Subtitle/description text in muted foreground color." },
			{ name: "ArtifactActions", description: "Container for grouping action buttons with gap spacing." },
			{ name: "ArtifactAction", description: "Individual icon button with optional tooltip. Accepts icon (LucideIcon), tooltip (string), and label (string) props." },
			{ name: "ArtifactClose", description: "Close button defaulting to an X icon. Renders a ghost Button." },
			{ name: "ArtifactContent", description: "Scrollable content area with padding. Use className='p-0' for edge-to-edge content like CodeBlock." },
		],
		examples: [
			{ title: "With code display", description: "Artifact displaying a syntax-highlighted code file with multiple action buttons.", demoSlug: "artifact-demo-with-code" },
			{ title: "With close button", description: "Artifact with a close button alongside actions, showing a JSON response.", demoSlug: "artifact-demo-with-close" },
			{ title: "Document", description: "Artifact containing a rich text document instead of code.", demoSlug: "artifact-demo-document" },
			{ title: "Minimal", description: "Simple artifact with title and a single action.", demoSlug: "artifact-demo-minimal" },
		],
	},

	confirmation: {
		description:
			"A tool execution approval workflow component that displays approval requests and outcomes. Manages three states: pending approval, accepted, and rejected — with conditional sub-component rendering driven by AI SDK tool state.",
		usage: `import {
  Confirmation,
  ConfirmationTitle,
  ConfirmationRequest,
  ConfirmationAccepted,
  ConfirmationRejected,
  ConfirmationActions,
  ConfirmationAction,
} from "@/components/ui-ai/confirmation";

<Confirmation approval={toolPart.approval} state={toolPart.state}>
  <ConfirmationTitle>Allow file access?</ConfirmationTitle>
  <ConfirmationRequest>
    <p>The assistant wants to read files from your workspace.</p>
    <ConfirmationActions>
      <ConfirmationAction variant="outline" onClick={onDeny}>Deny</ConfirmationAction>
      <ConfirmationAction onClick={onApprove}>Allow</ConfirmationAction>
    </ConfirmationActions>
  </ConfirmationRequest>
  <ConfirmationAccepted>
    <CheckIcon /> You approved file access
  </ConfirmationAccepted>
  <ConfirmationRejected>
    <XIcon /> You denied file access
  </ConfirmationRejected>
</Confirmation>`,
		props: [
			{
				name: "approval",
				type: "ToolUIPartApproval",
				required: true,
				description: "Approval object from the AI SDK ToolUIPart. Contains id, and optionally approved (boolean) and reason (string).",
			},
			{
				name: "state",
				type: "ToolUIPart[\"state\"]",
				required: true,
				description: "Current tool execution state: input-streaming, input-available, approval-requested, approval-responded, output-denied, or output-available.",
			},
			{
				name: "variant",
				type: '"default" | "info" | "warning" | "success" | "discovery" | "danger" | "error"',
				default: '"default"',
				description: "Alert variant inherited from the Alert component. Controls background and icon color.",
			},
			{
				name: "className",
				type: "string",
				description: "Additional classes applied to the Alert wrapper.",
			},
		],
		subComponents: [
			{ name: "Confirmation", description: "Root container wrapping an Alert. Provides approval context to children. Renders nothing during input-streaming and input-available states." },
			{ name: "ConfirmationTitle", description: "Title text rendered via AlertDescription with inline display." },
			{ name: "ConfirmationRequest", description: "Content shown only during approval-requested state." },
			{ name: "ConfirmationAccepted", description: "Content shown when approval.approved is true and state is approval-responded, output-denied, or output-available." },
			{ name: "ConfirmationRejected", description: "Content shown when approval.approved is false and state is approval-responded, output-denied, or output-available." },
			{ name: "ConfirmationActions", description: "Action button container, only visible during approval-requested state. Right-aligned with gap spacing." },
			{ name: "ConfirmationAction", description: "Individual action button using the Button component. Accepts all Button props including variant." },
		],
		examples: [
			{ title: "Approval request", description: "Pending approval state with deny and allow action buttons.", demoSlug: "confirmation-demo-request" },
			{ title: "Accepted", description: "Approved state showing success message after user grants permission.", demoSlug: "confirmation-demo-accepted" },
			{ title: "Rejected", description: "Denied state showing rejection message after user declines.", demoSlug: "confirmation-demo-rejected" },
			{ title: "Interactive", description: "Full lifecycle demo: request, approve or deny, with reset. Shows state transitions.", demoSlug: "confirmation-demo-interactive" },
			{ title: "Alert variants", description: "Warning, danger, and discovery alert variants with contextual icons.", demoSlug: "confirmation-demo-variants" },
		],
	},

	context: {
		description:
			"A context window usage indicator that displays token consumption as a circular progress icon with a hover card breakdown of input, output, reasoning, and cache tokens with cost estimates powered by tokenlens.",
		usage: `import {
  Context,
  ContextTrigger,
  ContextContent,
  ContextContentHeader,
  ContextContentBody,
  ContextContentFooter,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextCacheUsage,
} from "@/components/ui-ai/context";

<Context
  maxTokens={128_000}
  usedTokens={21_490}
  usage={usage}
  modelId="openai:gpt-4o"
>
  <ContextTrigger />
  <ContextContent>
    <ContextContentHeader />
    <ContextContentBody>
      <ContextInputUsage />
      <ContextOutputUsage />
      <ContextReasoningUsage />
      <ContextCacheUsage />
    </ContextContentBody>
    <ContextContentFooter />
  </ContextContent>
</Context>`,
		props: [
			{
				name: "maxTokens",
				type: "number",
				required: true,
				description: "Total context window size in tokens.",
			},
			{
				name: "usedTokens",
				type: "number",
				required: true,
				description: "Currently consumed tokens.",
			},
			{
				name: "usage",
				type: "LanguageModelUsage",
				description: "AI SDK usage object with inputTokens, outputTokens, reasoningTokens, and cachedInputTokens breakdown.",
			},
			{
				name: "modelId",
				type: "string",
				description: "Model identifier for cost estimation via tokenlens (e.g., 'openai:gpt-4o').",
			},
		],
		subComponents: [
			{ name: "Context", description: "Root provider wrapping a HoverCard. Supplies token data to all children via React Context." },
			{ name: "ContextTrigger", description: "Ghost button showing usage percentage and a circular progress icon. Activates the hover card." },
			{ name: "ContextContent", description: "HoverCard content container with divided sections." },
			{ name: "ContextContentHeader", description: "Percentage label, compact token counts, and progress bar." },
			{ name: "ContextContentBody", description: "Container for usage breakdown rows." },
			{ name: "ContextContentFooter", description: "Total cost display computed from modelId via tokenlens." },
			{ name: "ContextInputUsage", description: "Input token count and cost row. Hidden when zero." },
			{ name: "ContextOutputUsage", description: "Output token count and cost row. Hidden when zero." },
			{ name: "ContextReasoningUsage", description: "Reasoning token count and cost row. Hidden when zero." },
			{ name: "ContextCacheUsage", description: "Cached input token count and cost row. Hidden when zero." },
		],
		examples: [
			{ title: "With cost", description: "Full context breakdown with input, output, reasoning, cache tokens and cost.", demoSlug: "context-demo-with-cost" },
			{ title: "Minimal", description: "Percentage and progress bar without usage breakdown or cost.", demoSlug: "context-demo-minimal" },
			{ title: "High usage", description: "Near-capacity context window showing 96% usage.", demoSlug: "context-demo-high-usage" },
			{ title: "Custom trigger", description: "Custom trigger text replacing the default percentage and icon.", demoSlug: "context-demo-custom-trigger" },
		],
	},

	image: {
		description:
			"Renders AI-generated images from the AI SDK's Experimental_GeneratedImage type. Converts base64-encoded image data into a responsive img element with data URI source.",
		usage: `import { Image } from "@/components/ui-ai/image";

<Image
  base64={generatedImage.base64}
  uint8Array={generatedImage.uint8Array}
  mediaType={generatedImage.mediaType}
  alt="AI-generated image"
/>`,
		props: [
			{
				name: "base64",
				type: "string",
				required: true,
				description: "Base64-encoded image data from AI SDK's generateImage result.",
			},
			{
				name: "uint8Array",
				type: "Uint8Array",
				description: "Raw image bytes from AI SDK (not used for rendering, available for download/processing).",
			},
			{
				name: "mediaType",
				type: "string",
				required: true,
				description: "MIME type of the image (e.g., 'image/png', 'image/jpeg').",
			},
			{
				name: "alt",
				type: "string",
				description: "Alternative text for the image element.",
			},
			{
				name: "className",
				type: "string",
				description: "Additional CSS classes applied to the img element.",
			},
		],
		subComponents: [
			{ name: "Image", description: "Responsive img element that constructs a data URI from base64 and mediaType. Defaults to rounded corners and max-width: 100%." },
		],
		examples: [
			{ title: "Custom styling", description: "Image with custom border, shadow, and aspect ratio via className.", demoSlug: "image-demo-custom-styling" },
			{ title: "Gallery", description: "Multiple generated images displayed in a responsive grid.", demoSlug: "image-demo-gallery" },
			{ title: "In message", description: "Image embedded within a Message compound component for chat contexts.", demoSlug: "image-demo-in-message" },
		],
	},

	reasoning: {
		description:
			"A collapsible reasoning/thinking indicator that auto-opens when streaming begins and auto-closes when complete. Both triggers use Rovo logo, shimmer text, and animated color dots — the default ReasoningTrigger always shows a chevron, while AdsReasoningTrigger supports an optional chevron.",
		usage: `import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
  AdsReasoningTrigger,
} from "@/components/ui-ai/reasoning";

// Default trigger (Rovo logo + shimmer + dots + chevron)
<Reasoning isStreaming={isStreaming}>
  <ReasoningTrigger />
  <ReasoningContent>{reasoningText}</ReasoningContent>
</Reasoning>

// ADS-styled trigger (optional chevron)
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
			{ name: "ReasoningTrigger", description: "Default trigger with Rovo logo, shimmer text, animated color dots, and chevron." },
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

	"environment-variables": {
		description:
			"A compound component for displaying environment variables with automatic value masking, visibility toggle, copy-to-clipboard in multiple formats, and required status badges.",
		usage: `import {
  EnvironmentVariables,
  EnvironmentVariablesHeader,
  EnvironmentVariablesTitle,
  EnvironmentVariablesToggle,
  EnvironmentVariablesContent,
  EnvironmentVariable,
  EnvironmentVariableName,
  EnvironmentVariableValue,
  EnvironmentVariableCopyButton,
  EnvironmentVariableRequired,
  EnvironmentVariableGroup,
} from "@/components/ui-ai/environment-variables";

<EnvironmentVariables>
  <EnvironmentVariablesHeader>
    <EnvironmentVariablesTitle />
    <EnvironmentVariablesToggle />
  </EnvironmentVariablesHeader>
  <EnvironmentVariablesContent>
    <EnvironmentVariable name="API_KEY" value="sk-123abc">
      <EnvironmentVariableGroup>
        <EnvironmentVariableName />
        <EnvironmentVariableRequired />
      </EnvironmentVariableGroup>
      <EnvironmentVariableGroup>
        <EnvironmentVariableValue />
        <EnvironmentVariableCopyButton />
      </EnvironmentVariableGroup>
    </EnvironmentVariable>
  </EnvironmentVariablesContent>
</EnvironmentVariables>`,
		props: [
			{
				name: "showValues",
				type: "boolean",
				description: "Controlled visibility state for all variable values.",
			},
			{
				name: "defaultShowValues",
				type: "boolean",
				default: "false",
				description: "Initial visibility state when used uncontrolled.",
			},
			{
				name: "onShowValuesChange",
				type: "(show: boolean) => void",
				description: "Callback fired when visibility state changes.",
			},
			{
				name: "className",
				type: "string",
				description: "Additional classes applied to the root container.",
			},
		],
		subComponents: [
			{ name: "EnvironmentVariables", description: "Root container with visibility context provider." },
			{ name: "EnvironmentVariablesHeader", description: "Header row with title and toggle controls." },
			{ name: "EnvironmentVariablesTitle", description: "Title text, defaults to 'Environment Variables'." },
			{ name: "EnvironmentVariablesToggle", description: "Switch to toggle value visibility with eye icon." },
			{ name: "EnvironmentVariablesContent", description: "Content container with dividers between variables." },
			{ name: "EnvironmentVariable", description: "Individual variable row providing name/value context to children." },
			{ name: "EnvironmentVariableGroup", description: "Flex group for laying out name/value/action elements." },
			{ name: "EnvironmentVariableName", description: "Monospace variable name display." },
			{ name: "EnvironmentVariableValue", description: "Value display with automatic dot masking when hidden." },
			{ name: "EnvironmentVariableCopyButton", description: "Copy button with format options: value, name, or export." },
			{ name: "EnvironmentVariableRequired", description: "Badge indicating a variable is required." },
		],
		examples: [
			{ title: "With copy buttons", description: "Variables with individual copy buttons supporting value and export formats.", demoSlug: "environment-variables-demo-with-copy" },
			{ title: "With required badges", description: "Variables marked as required alongside optional ones.", demoSlug: "environment-variables-demo-with-required" },
			{ title: "Values revealed", description: "Custom title with values visible by default.", demoSlug: "environment-variables-demo-revealed" },
			{ title: "Minimal", description: "Default rendering without copy buttons or badges.", demoSlug: "environment-variables-demo-minimal" },
		],
	},

	"file-tree": {
		description:
			"A hierarchical file system explorer with expandable folders, file selection, custom icons, and inline action buttons. Supports both controlled and uncontrolled expand/select state.",
		usage: `import {
  FileTree,
  FileTreeFolder,
  FileTreeFile,
  FileTreeIcon,
  FileTreeName,
  FileTreeActions,
} from "@/components/ui-ai/file-tree";

<FileTree
  defaultExpanded={new Set(["src"])}
  selectedPath={selectedPath}
  onSelect={setSelectedPath}
>
  <FileTreeFolder path="src" name="src">
    <FileTreeFile path="src/index.ts" name="index.ts" />
    <FileTreeFile path="src/utils.ts" name="utils.ts" />
  </FileTreeFolder>
  <FileTreeFile path="package.json" name="package.json" />
</FileTree>`,
		props: [
			{
				name: "expanded",
				type: "Set<string>",
				description: "Controlled expanded folder paths.",
			},
			{
				name: "defaultExpanded",
				type: "Set<string>",
				default: "new Set()",
				description: "Default expanded folder paths for uncontrolled usage.",
			},
			{
				name: "selectedPath",
				type: "string",
				description: "Currently selected file or folder path.",
			},
			{
				name: "onSelect",
				type: "(path: string) => void",
				description: "Callback when a file or folder is selected.",
			},
			{
				name: "onExpandedChange",
				type: "(expanded: Set<string>) => void",
				description: "Callback when expanded folder paths change.",
			},
			{
				name: "className",
				type: "string",
				description: "Additional classes applied to the root container.",
			},
		],
		subComponents: [
			{ name: "FileTree", description: "Root container with tree role and expand/select context provider." },
			{ name: "FileTreeFolder", description: "Collapsible folder node with chevron, folder icon, and nested children." },
			{ name: "FileTreeFile", description: "Leaf file node with click/keyboard selection and optional custom icon." },
			{ name: "FileTreeIcon", description: "Inline icon wrapper for custom file or folder icons." },
			{ name: "FileTreeName", description: "Truncated text display for file or folder names." },
			{ name: "FileTreeActions", description: "Right-aligned action button container with click propagation isolation." },
		],
		examples: [
			{ title: "Project structure", description: "Nested folder hierarchy with multiple levels expanded.", demoSlug: "file-tree-demo-project" },
			{ title: "With selection", description: "Interactive file tree with controlled selection state.", demoSlug: "file-tree-demo-with-selection" },
			{ title: "Custom icons", description: "File-type-specific icons for code, image, JSON, and text files.", demoSlug: "file-tree-demo-custom-icons" },
			{ title: "With actions", description: "File rows with inline copy, download, and delete action buttons.", demoSlug: "file-tree-demo-with-actions" },
		],
	},

	controls: {
		description:
			"Themed zoom and fit-view controls for React Flow canvases. Wraps @xyflow/react Controls with ADS-aligned card styling, rounded buttons, and hover states.",
		usage: `import { Canvas } from "@/components/ui-ai/canvas";
import { Controls } from "@/components/ui-ai/controls";

<Canvas nodes={nodes} edges={edges}>
  <Controls />
</Canvas>`,
		demoLayout: {
			previewContentWidth: "full",
			examplesContentWidth: "full",
		},
		props: [
			{
				name: "className",
				type: "string",
				description: "Additional classes applied to the controls container.",
			},
			{
				name: "showZoom",
				type: "boolean",
				default: "true",
				description: "Show zoom in/out buttons.",
			},
			{
				name: "showFitView",
				type: "boolean",
				default: "true",
				description: "Show fit-view button to center and scale content.",
			},
			{
				name: "showInteractive",
				type: "boolean",
				default: "true",
				description: "Show interactive toggle (lock/unlock) button.",
			},
			{
				name: "position",
				type: '"top-left" | "top-right" | "bottom-left" | "bottom-right"',
				default: '"bottom-left"',
				description: "Position of the controls overlay within the canvas.",
			},
		],
		subComponents: [
			{ name: "Controls", description: "Themed React Flow controls with card background, rounded buttons, and secondary hover states." },
		],
		examples: [
			{ title: "Default", description: "Controls with zoom, fit-view, and interactive toggle in bottom-left position.", demoSlug: "controls-demo-default" },
			{ title: "Position", description: "Controls placed in the bottom-right corner of the canvas.", demoSlug: "controls-demo-position" },
			{ title: "Zoom only", description: "Only zoom in/out buttons, fit-view and interactive toggle hidden.", demoSlug: "controls-demo-zoom-only" },
			{ title: "Fit only", description: "Only fit-view button, zoom and interactive toggle hidden.", demoSlug: "controls-demo-fit-only" },
		],
	},

	edge: {
		description:
			"Custom edge renderers for React Flow canvases. Provides Animated (bezier path with a flowing dot indicator) and Temporary (dashed stroke) edge variants for AI workflow visualization.",
		usage: `import { Canvas } from "@/components/ui-ai/canvas";
import { Edge } from "@/components/ui-ai/edge";

const edgeTypes = {
  animated: Edge.Animated,
  temporary: Edge.Temporary,
};

<Canvas
  nodes={nodes}
  edges={edges}
  edgeTypes={edgeTypes}
  nodeTypes={nodeTypes}
/>`,
		demoLayout: {
			previewContentWidth: "full",
			examplesContentWidth: "full",
		},
		props: [
			{
				name: "id",
				type: "string",
				required: true,
				description: "Unique identifier for the edge (provided by React Flow).",
			},
			{
				name: "source",
				type: "string",
				required: true,
				description: "ID of the source node (provided by React Flow).",
			},
			{
				name: "target",
				type: "string",
				required: true,
				description: "ID of the target node (provided by React Flow).",
			},
			{
				name: "sourceX / sourceY",
				type: "number",
				description: "Coordinates of the source handle (provided by React Flow).",
			},
			{
				name: "targetX / targetY",
				type: "number",
				description: "Coordinates of the target handle (provided by React Flow).",
			},
			{
				name: "sourcePosition / targetPosition",
				type: "Position",
				description: "Handle position enum (Left, Right, Top, Bottom) from @xyflow/react.",
			},
			{
				name: "markerEnd",
				type: "string",
				description: "SVG marker reference for the edge endpoint (Animated only).",
			},
			{
				name: "style",
				type: "CSSProperties",
				description: "Inline styles applied to the base edge path (Animated only).",
			},
		],
		subComponents: [
			{ name: "Edge.Animated", description: "Bezier edge with a flowing dot that travels along the path on a 2s loop. Uses source/target handle positions for accurate routing." },
			{ name: "Edge.Temporary", description: "Dashed bezier edge indicating a pending or conditional connection. Uses a simple bezier path with strokeDasharray styling." },
		],
		examples: [
			{ title: "Animated", description: "Edge with a flowing dot indicator between two nodes.", demoSlug: "edge-demo-animated" },
			{ title: "Temporary", description: "Dashed edge indicating a conditional or pending connection.", demoSlug: "edge-demo-temporary" },
			{ title: "Mixed", description: "Both animated and temporary edges in a branching workflow.", demoSlug: "edge-demo-mixed" },
		],
	},

	"mic-selector": {
		description:
			"A composable microphone selector dropdown built on Command and Popover primitives. Provides permission-aware device enumeration, real-time device detection, searchable device list, and intelligent hardware ID label parsing.",
		usage: `import {
  MicSelector,
  MicSelectorTrigger,
  MicSelectorValue,
  MicSelectorContent,
  MicSelectorInput,
  MicSelectorList,
  MicSelectorEmpty,
  MicSelectorItem,
  MicSelectorLabel,
  useAudioDevices,
} from "@/components/ui-ai/mic-selector";

<MicSelector>
  <MicSelectorTrigger className="w-[280px]">
    <MicSelectorValue />
  </MicSelectorTrigger>
  <MicSelectorContent>
    <MicSelectorInput />
    <MicSelectorList>
      {(devices) =>
        devices.length > 0 ? (
          devices.map((device) => (
            <MicSelectorItem key={device.deviceId} value={device.deviceId}>
              <MicSelectorLabel device={device} />
            </MicSelectorItem>
          ))
        ) : (
          <MicSelectorEmpty />
        )
      }
    </MicSelectorList>
  </MicSelectorContent>
</MicSelector>`,
		props: [
			{
				name: "value",
				type: "string",
				description: "Controlled selected device ID.",
			},
			{
				name: "defaultValue",
				type: "string",
				description: "Default selected device ID for uncontrolled usage.",
			},
			{
				name: "onValueChange",
				type: "(value: string | undefined) => void",
				description: "Callback fired when the selected device changes.",
			},
			{
				name: "open",
				type: "boolean",
				description: "Controlled open state of the popover.",
			},
			{
				name: "onOpenChange",
				type: "(open: boolean) => void",
				description: "Callback fired when the popover open state changes.",
			},
		],
		subComponents: [
			{ name: "MicSelector", description: "Root provider wrapping a Popover. Manages device enumeration, permission requests, and selection state." },
			{ name: "MicSelectorTrigger", description: "Outline button trigger with chevron icon and ResizeObserver-synced width." },
			{ name: "MicSelectorValue", description: "Displays the selected device label or a placeholder." },
			{ name: "MicSelectorContent", description: "Popover content wrapping a Command for searchable selection." },
			{ name: "MicSelectorInput", description: "Search input for filtering the device list." },
			{ name: "MicSelectorList", description: "Device list container with render-prop children receiving MediaDeviceInfo[]." },
			{ name: "MicSelectorEmpty", description: "Empty state shown when no devices match the search." },
			{ name: "MicSelectorItem", description: "Individual selectable device item." },
			{ name: "MicSelectorLabel", description: "Device label with intelligent hardware ID parsing (extracts XXXX:XXXX format)." },
		],
		examples: [
			{ title: "Controlled", description: "Controlled selector showing the selected device ID below.", demoSlug: "mic-selector-demo-controlled" },
			{ title: "With checkmark", description: "Selector with a check icon next to the active device.", demoSlug: "mic-selector-demo-with-checkmark" },
			{ title: "Compact", description: "Small-sized trigger without search input.", demoSlug: "mic-selector-demo-compact" },
		],
	},

	"inline-citation": {
		description:
			"An inline citation system for AI-generated text that displays source references as hover-triggered badges with a carousel of source details, quotes, and descriptions.",
		usage: `import {
  InlineCitation,
  InlineCitationText,
  InlineCitationCard,
  InlineCitationCardTrigger,
  InlineCitationCardBody,
  InlineCitationCarousel,
  InlineCitationCarouselContent,
  InlineCitationCarouselHeader,
  InlineCitationCarouselItem,
  InlineCitationCarouselIndex,
  InlineCitationCarouselPrev,
  InlineCitationCarouselNext,
  InlineCitationSource,
  InlineCitationQuote,
} from "@/components/ui-ai/inline-citation";

<InlineCitation>
  <InlineCitationText>React uses a virtual DOM</InlineCitationText>
  <InlineCitationCard>
    <InlineCitationCardTrigger sources={["https://react.dev"]} />
    <InlineCitationCardBody>
      <InlineCitationCarousel>
        <InlineCitationCarouselContent>
          <InlineCitationCarouselItem>
            <InlineCitationSource
              title="React Docs"
              url="https://react.dev"
              description="Official React documentation."
            />
          </InlineCitationCarouselItem>
        </InlineCitationCarouselContent>
      </InlineCitationCarousel>
    </InlineCitationCardBody>
  </InlineCitationCard>
</InlineCitation>`,
		props: [
			{
				name: "sources",
				type: "string[]",
				required: true,
				description: "Array of source URLs displayed on InlineCitationCardTrigger. The first URL hostname is shown as the badge label; additional sources show as a +N count.",
			},
			{
				name: "title",
				type: "string",
				description: "Source title displayed in InlineCitationSource.",
			},
			{
				name: "url",
				type: "string",
				description: "Source URL displayed in InlineCitationSource.",
			},
			{
				name: "description",
				type: "string",
				description: "Brief source description displayed in InlineCitationSource.",
			},
			{
				name: "className",
				type: "string",
				description: "Additional CSS classes applied to any sub-component.",
			},
		],
		subComponents: [
			{ name: "InlineCitation", description: "Root inline container grouping text and citation badge." },
			{ name: "InlineCitationText", description: "Text span that highlights on group hover." },
			{ name: "InlineCitationCard", description: "HoverCard wrapper managing open/close with zero delay." },
			{ name: "InlineCitationCardTrigger", description: "Badge trigger showing hostname and source count from the sources prop." },
			{ name: "InlineCitationCardBody", description: "HoverCard content panel (w-80, no padding)." },
			{ name: "InlineCitationCarousel", description: "Carousel wrapper with internal API context for multi-source navigation." },
			{ name: "InlineCitationCarouselContent", description: "Carousel content container." },
			{ name: "InlineCitationCarouselItem", description: "Individual carousel slide for a single source." },
			{ name: "InlineCitationCarouselHeader", description: "Navigation header with prev/next buttons and index indicator." },
			{ name: "InlineCitationCarouselIndex", description: "Position indicator displaying current/total (e.g., 1/3)." },
			{ name: "InlineCitationCarouselPrev", description: "Previous source navigation button." },
			{ name: "InlineCitationCarouselNext", description: "Next source navigation button." },
			{ name: "InlineCitationSource", description: "Source metadata display with title, URL, and description." },
			{ name: "InlineCitationQuote", description: "Blockquote for source excerpts with left border styling." },
		],
		examples: [
			{ title: "With carousel", description: "Multi-source citation with carousel navigation, descriptions, and a quote.", demoSlug: "inline-citation-demo-with-carousel" },
			{ title: "Basic", description: "Minimal inline citation badge without hover card body.", demoSlug: "inline-citation-demo-basic" },
			{ title: "Multiple citations", description: "Paragraph with two separate inline citations referencing different topics.", demoSlug: "inline-citation-demo-multiple" },
			{ title: "Single source", description: "Single-source citation with description and quote excerpt.", demoSlug: "inline-citation-demo-single-source" },
		],
	},
};
