# ui-ai Migration Catalog

Quick-lookup catalog of all ui-ai components grouped by category. Each entry includes the import path, description, primary sub-components, and link to the ai-elements reference doc.

Reference docs are at `~/.agents/skills/ai-elements/references/[slug].md`.

---

## Message / Chat Core

| Component | Import | Description | Primary Sub-components |
|---|---|---|---|
| [message](~/.agents/skills/ai-elements/references/message.md) | `@/components/ui-ai/message` | Chat message display with role-based styling, markdown, actions, and branching | `Message`, `MessageContent`, `MessageResponse`, `MessageActions`, `MessageAction`, `MessageBranch` |
| [conversation](~/.agents/skills/ai-elements/references/conversation.md) | `@/components/ui-ai/conversation` | Auto-scrolling message container with scroll button and empty state | `Conversation`, `ConversationContent`, `ConversationScrollButton`, `ConversationEmptyState`, `ConversationDownload` |
| [prompt-input](~/.agents/skills/ai-elements/references/prompt-input.md) | `@/components/ui-ai/prompt-input` | Message input with textarea, submit, file attachments, model selector, and action menu | `PromptInput`, `Input`, `PromptInputTextarea`, `PromptInputSubmit`, `PromptInputBody`, `PromptInputHeader`, `PromptInputFooter`, `PromptInputTools`, `PromptInputSelect`, `PromptInputActionAddAttachments`, `PromptInputActionMenu`, `PromptInputButton` |
| [attachments](~/.agents/skills/ai-elements/references/attachments.md) | `@/components/ui-ai/attachments` | File attachment display with previews and remove functionality | `Attachments`, `Attachment`, `AttachmentPreview`, `AttachmentRemove` |

## Content Display

| Component | Import | Description | Primary Sub-components |
|---|---|---|---|
| [code-block](~/.agents/skills/ai-elements/references/code-block.md) | `@/components/ui-ai/code-block` | Syntax-highlighted code with copy button, line numbers, and filename display | `CodeBlock`, `CodeBlockHeader`, `CodeBlockTitle`, `CodeBlockFilename`, `CodeBlockActions`, `CodeBlockCopyButton` |
| [artifact](~/.agents/skills/ai-elements/references/artifact.md) | `@/components/ui-ai/artifact` | Artifact display container for generated content | `Artifact` |
| [image](~/.agents/skills/ai-elements/references/image.md) | `@/components/ui-ai/image` | AI-generated image display | `Image` |
| [web-preview](~/.agents/skills/ai-elements/references/web-preview.md) | `@/components/ui-ai/web-preview` | Web page preview embed | `WebPreview` |
| [canvas](~/.agents/skills/ai-elements/references/canvas.md) | `@/components/ui-ai/canvas` | Canvas area for visual content | `Canvas` |

## AI Features

| Component | Import | Description | Primary Sub-components |
|---|---|---|---|
| [reasoning](~/.agents/skills/ai-elements/references/reasoning.md) | `@/components/ui-ai/reasoning` | Expandable thinking/reasoning process display | `Reasoning` |
| [chain-of-thought](~/.agents/skills/ai-elements/references/chain-of-thought.md) | `@/components/ui-ai/chain-of-thought` | Step-by-step reasoning chain visualization | `ChainOfThought` |
| [agent](~/.agents/skills/ai-elements/references/agent.md) | `@/components/ui-ai/agent` | Agent status and activity display | `Agent` |
| [tool](~/.agents/skills/ai-elements/references/tool.md) | `@/components/ui-ai/tool` | Tool invocation and result display | `Tool` |
| [terminal](~/.agents/skills/ai-elements/references/terminal.md) | `@/components/ui-ai/terminal` | Terminal/command output display | `Terminal` |

## User Feedback

| Component | Import | Description | Primary Sub-components |
|---|---|---|---|
| [suggestion](~/.agents/skills/ai-elements/references/suggestion.md) | `@/components/ui-ai/suggestion` | Clickable suggestion chips/pills | `Suggestions`, `Suggestion` |
| [confirmation](~/.agents/skills/ai-elements/references/confirmation.md) | `@/components/ui-ai/confirmation` | Confirmation dialog for AI actions | `Confirmation` |
| [inline-citation](~/.agents/skills/ai-elements/references/inline-citation.md) | `@/components/ui-ai/inline-citation` | Inline source citation markers | `InlineCitation` |
| [sources](~/.agents/skills/ai-elements/references/sources.md) | `@/components/ui-ai/sources` | Source reference list display | `Sources` |

## Input Controls

| Component | Import | Description | Primary Sub-components |
|---|---|---|---|
| [mic-selector](~/.agents/skills/ai-elements/references/mic-selector.md) | `@/components/ui-ai/mic-selector` | Microphone device selector | `MicSelector` |
| [voice-selector](~/.agents/skills/ai-elements/references/voice-selector.md) | `@/components/ui-ai/voice-selector` | Voice/TTS voice picker | `VoiceSelector` |
| [model-selector](~/.agents/skills/ai-elements/references/model-selector.md) | `@/components/ui-ai/model-selector` | AI model picker dropdown | `ModelSelector` |
| [audio-player](~/.agents/skills/ai-elements/references/audio-player.md) | `@/components/ui-ai/audio-player` | Audio playback controls | `AudioPlayer` |
| [speech-input](~/.agents/skills/ai-elements/references/speech-input.md) | `@/components/ui-ai/speech-input` | Voice-to-text input | `SpeechInput` |
| [open-in-chat](~/.agents/skills/ai-elements/references/open-in-chat.md) | `@/components/ui-ai/open-in-chat` | "Open in chat" action button | `OpenInChat` |

## Workflow

| Component | Import | Description | Primary Sub-components |
|---|---|---|---|
| [checkpoint](~/.agents/skills/ai-elements/references/checkpoint.md) | `@/components/ui-ai/checkpoint` | Workflow checkpoint/milestone marker | `Checkpoint` |
| [commit](~/.agents/skills/ai-elements/references/commit.md) | `@/components/ui-ai/commit` | Code commit display | `Commit` |
| [stack-trace](~/.agents/skills/ai-elements/references/stack-trace.md) | `@/components/ui-ai/stack-trace` | Error stack trace display | `StackTrace` |
| [test-results](~/.agents/skills/ai-elements/references/test-results.md) | `@/components/ui-ai/test-results` | Test execution results display | `TestResults` |
| [file-tree](~/.agents/skills/ai-elements/references/file-tree.md) | `@/components/ui-ai/file-tree` | File system tree visualization | `FileTree` |
| [task](~/.agents/skills/ai-elements/references/task.md) | `@/components/ui-ai/task` | Task/step tracking display | `Task` |
| [plan](~/.agents/skills/ai-elements/references/plan.md) | `@/components/ui-ai/plan` | Multi-step plan visualization | `Plan` |

## Visual

| Component | Import | Description | Primary Sub-components |
|---|---|---|---|
| [shimmer](~/.agents/skills/ai-elements/references/shimmer.md) | `@/components/ui-ai/shimmer` | Loading shimmer/skeleton animation | `Shimmer` |
| [panel](~/.agents/skills/ai-elements/references/panel.md) | `@/components/ui-ai/panel` | Side panel container | `Panel` |
| [toolbar](~/.agents/skills/ai-elements/references/toolbar.md) | `@/components/ui-ai/toolbar` | Toolbar with action buttons | `Toolbar` |
| [connection](~/.agents/skills/ai-elements/references/connection.md) | `@/components/ui-ai/connection` | Connection line between nodes | `Connection` |
| [edge](~/.agents/skills/ai-elements/references/edge.md) | `@/components/ui-ai/edge` | Graph edge visualization | `Edge` |
| [node](~/.agents/skills/ai-elements/references/node.md) | `@/components/ui-ai/node` | Graph node visualization | `Node` |
| [persona](~/.agents/skills/ai-elements/references/persona.md) | `@/components/ui-ai/persona` | AI persona/avatar display | `Persona` |

## Advanced

| Component | Import | Description | Primary Sub-components |
|---|---|---|---|
| [jsx-preview](~/.agents/skills/ai-elements/references/jsx-preview.md) | `@/components/ui-ai/jsx-preview` | Live JSX preview renderer | `JsxPreview` |
| [sandbox](~/.agents/skills/ai-elements/references/sandbox.md) | `@/components/ui-ai/sandbox` | Sandboxed code execution environment | `Sandbox` |
| [package-info](~/.agents/skills/ai-elements/references/package-info.md) | `@/components/ui-ai/package-info` | Package/dependency information display | `PackageInfo` |
| [context](~/.agents/skills/ai-elements/references/context.md) | `@/components/ui-ai/context` | Context/memory display | `Context` |
| [controls](~/.agents/skills/ai-elements/references/controls.md) | `@/components/ui-ai/controls` | Interactive parameter controls | `Controls` |
| [environment-variables](~/.agents/skills/ai-elements/references/environment-variables.md) | `@/components/ui-ai/environment-variables` | Environment variable display/editor | `EnvironmentVariables` |
| [queue](~/.agents/skills/ai-elements/references/queue.md) | `@/components/ui-ai/queue` | Task queue display | `Queue` |
| [schema-display](~/.agents/skills/ai-elements/references/schema-display.md) | `@/components/ui-ai/schema-display` | Data schema visualization | `SchemaDisplay` |
| [snippet](~/.agents/skills/ai-elements/references/snippet.md) | `@/components/ui-ai/snippet` | Code snippet display (lightweight) | `Snippet` |
| [transcription](~/.agents/skills/ai-elements/references/transcription.md) | `@/components/ui-ai/transcription` | Audio/video transcription display | `Transcription` |
