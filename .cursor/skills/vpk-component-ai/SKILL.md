---
name: vpk-component-ai
description: Migrate custom AI chat implementations to standardized ui-ai compound
  components. Use when the user asks to "migrate to ui-ai", "replace custom chat",
  "use ui-ai message", "standardize AI components", "use shared message component",
  "replace message bubble", "use conversation component", "migrate prompt input",
  "use code-block component", "replace custom suggestions", "use ui-ai prompt-input",
  "switch to ui-ai", "adopt ai-elements", or references a ui-ai component and wants
  to migrate custom code to use it.
argument-hint: "[target file or component path]"
prerequisites:
  files: [components/ui-ai/message.tsx, components/ui-ai/conversation.tsx]
produces: []
---

# VPK Component AI Migration

Migrate custom AI-related implementations (message bubbles, scroll containers, prompt inputs, suggestions, code blocks) to the standardized `components/ui-ai/` compound components.

**Context:** The VPK codebase has 47 component modules in `components/ui-ai/` (each with compound sub-components), but feature code in `components/templates/sidebar-chat/` and `components/templates/fullscreen-chat/` uses custom implementations instead. This skill guides the migration to shared primitives.

**Key constraint:** `components/ui-ai/**` is excluded from TypeScript checking in `tsconfig.json`. Type safety must be handled at the call site using JSDoc annotations or ambient declarations.

## Quick Start

```
/vpk-component-ai components/templates/sidebar-chat/components/message-bubble.tsx
/vpk-component-ai components/templates/fullscreen-chat/components/chat-input.tsx
/vpk-component-ai components/templates/sidebar-chat/    # Migrate entire chat feature
```

---

## Workflow

### Phase 1 — Discover

Scan the target file/directory for custom AI patterns and identify ui-ai replacements.

1. **Read target code** — Identify all custom AI-related patterns using the Detection Checklist below.
2. **Read ui-ai source** — For each detected pattern, read the corresponding `components/ui-ai/[slug].tsx` file to understand its API (props, sub-components, compound structure). Consult `references/migration-catalog.md` for the full list of ui-ai components grouped by category.
3. **Read ai-elements reference** — Check `~/.agents/skills/ai-elements/references/[slug].md` for usage examples and AI SDK integration patterns.
4. **Trace data flow** — Follow the data from context providers (especially `context-rovo-chat.tsx`) through the target component to understand props, state, and callbacks.

#### Detection Checklist

| # | Custom Pattern | Look For | ui-ai Replacement |
|---|---|---|---|
| 1 | Message bubble/container | `role === "user"` / `role === "assistant"` conditional styling | `Message` + `MessageContent` |
| 2 | Markdown/HTML rendering | `dangerouslySetInnerHTML`, custom markdown parser, `ReactMarkdown` | `MessageResponse` (built-in Streamdown) |
| 3 | Message action buttons | Copy/retry/like/dislike buttons on messages | `MessageActions` + `MessageAction` |
| 4 | Response branching | Branch navigation arrows, version switching | `MessageBranch` |
| 5 | Scroll container | `overflow-y-auto`, `scrollIntoView`, scroll-to-bottom | `Conversation` + `ConversationContent` |
| 6 | Scroll-to-bottom button | Floating button to scroll down | `ConversationScrollButton` |
| 7 | Empty state | "No messages" / welcome screen | `ConversationEmptyState` |
| 8 | Text input area | `<textarea>` for message composition | `PromptInput` + `PromptInputTextarea` |
| 9 | Submit button | Send/submit button for messages | `PromptInputSubmit` |
| 9a | Microphone button | Voice input / dictation toggle | `PromptInputMicrophone` |
| 10 | File attachments | File upload UI, attachment previews | `Attachments` + `Attachment` |
| 11 | Suggestion chips | Clickable suggestion buttons/pills | `Suggestions` + `Suggestion` |
| 12 | Code blocks | Syntax highlighting, copy button on code | `CodeBlock` + `CodeBlockHeader` |
| 13 | Reasoning/thinking | Expandable "thinking" or reasoning display | `Reasoning` |
| 14 | Loading shimmer | Streaming placeholder animation | `Shimmer` |
| 15 | Model selector | Dropdown to pick AI model | `ModelSelector` |

### Phase 2 — Map

Produce four mapping tables documenting the migration plan.

#### 2a. Component Mapping

| Custom Component | ui-ai Component | Match | Notes |
|---|---|---|---|
| `MessageBubble` | `Message` + `MessageContent` | Exact | Role-based styling built-in |
| `ChatScroll` | `Conversation` + `ConversationContent` | Approximate | Custom scroll anchoring may need extension |
| `ChatInput` | `PromptInput` compound | Exact | — |

Match quality: **Exact** (drop-in), **Approximate** (needs className/wrapper), **Gap** (no ui-ai equivalent).

#### 2b. Props Mapping

| Custom Prop | ui-ai Prop | Notes |
|---|---|---|
| `message.role` | `from` (on `Message`) | Renamed: `"user"` / `"assistant"` |
| `message.content` | children of `MessageResponse` | String → children |
| `onSubmit` | `onSubmit` (on `PromptInput`) | Same pattern |

#### 2c. Sub-component Mapping

| Custom Element | ui-ai Sub-component |
|---|---|
| Copy button on message | `MessageAction` with copy handler |
| Retry button | `MessageAction` with retry handler |
| Scroll indicator | `ConversationScrollButton` |

#### 2d. Gap Analysis

| Custom Feature | ui-ai Coverage | Resolution |
|---|---|---|
| Widget rendering | Gap | Keep custom widget renderer, compose inside `MessageContent` |
| Custom scroll anchoring | Approximate | Override via `Conversation` className + custom hook |
| Streaming state indicator | Approximate | Use `Shimmer` + status from `useChat` |
| ADS-specific styling | Gap | Apply via `className` overrides on ui-ai components |

### Phase 3 — Migrate

Step-by-step replacement process.

#### 3a. Import Replacement

Replace custom component imports with ui-ai imports:

```tsx
// Before
import { MessageBubble } from "./components/message-bubble";
import { ChatScroll } from "./components/chat-scroll";

// After
import { Message, MessageContent, MessageResponse } from "@/components/ui-ai/message";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ui-ai/conversation";
```

#### 3b. Component Replacement

Follow the Decision Tree (below) to select the right ui-ai component, then apply these rules:

1. **Preserve ADS styling** — Use `className` overrides to maintain ADS token classes:
   ```tsx
   <Message from="assistant" className="bg-surface-raised rounded-lg">
   ```

2. **Markdown rendering** — Replace `dangerouslySetInnerHTML` or custom markdown with `MessageResponse`:
   ```tsx
   // Before
   <div dangerouslySetInnerHTML={{ __html: renderedMarkdown }} />

   // After
   <MessageResponse>{part.text}</MessageResponse>
   ```

3. **Preserve callbacks** — Wire existing event handlers into ui-ai component props:
   ```tsx
   <MessageAction onClick={() => copyToClipboard(message.content)}>
     <CopyIcon />
   </MessageAction>
   ```

4. **Compose for gaps** — When ui-ai doesn't cover a custom feature, compose it inside the ui-ai component:
   ```tsx
   <MessageContent>
     <MessageResponse>{part.text}</MessageResponse>
     {/* Custom widget rendering — no ui-ai equivalent */}
     {part.type === "widget-data" && <WidgetRenderer data={part.data} />}
   </MessageContent>
   ```

#### 3c. Extension Patterns

When ui-ai components don't fully match, use these patterns:

**Legacy composer shell (ADS wrapper owns border/background)** — When migrating an existing ADS composer where the outer container already provides chrome, neutralize `PromptInput`'s default `InputGroup` chrome and keep the old shell:
```tsx
const promptInputClassName = cn(
  "w-full [&>[data-slot=input-group]]:h-auto [&>[data-slot=input-group]]:border-0 [&>[data-slot=input-group]]:bg-transparent [&>[data-slot=input-group]]:shadow-none [&>[data-slot=input-group]]:ring-0",
  customHeight ? "h-full [&>[data-slot=input-group]]:h-full [&>[data-slot=input-group]]:flex-1" : null
);

<PromptInput className={promptInputClassName} onSubmit={() => handleSubmit()}>
  {/* ... */}
</PromptInput>
```

**Wrapping** — Add a wrapper div for extra layout/styling:
```tsx
<div className="px-4 py-2 bg-surface">
  <Message from={role}>
    <MessageContent>{children}</MessageContent>
  </Message>
</div>
```

**className override** — Override default styles via className prop:
```tsx
<Conversation className="h-full border-none">
  <ConversationContent className="px-6">
    {/* messages */}
  </ConversationContent>
</Conversation>
```

**Composition** — Mix ui-ai and custom components:
```tsx
<Message from="assistant">
  <MessageContent>
    <MessageResponse>{text}</MessageResponse>
    <CustomWidgetArea />
  </MessageContent>
  <MessageActions>
    <MessageAction onClick={onCopy}><CopyIcon /></MessageAction>
    <CustomShareButton /> {/* Custom action not in ui-ai */}
  </MessageActions>
</Message>
```

**cmdk inside Portal (HoverCard/Popover)** — When mounting `PromptInputCommand` (cmdk) inside `PromptInputHoverCardContent`, cmdk's internal `useLayoutEffect` calls `scrollIntoView({block:"nearest"})` on the auto-selected item. Because the Portal hasn't been positioned yet, this scrolls the page to the top. Fix by wrapping the command content in a `ScrollLock` component:
```tsx
function ScrollLock({ children }: { children: ReactNode }) {
  const savedRef = useRef<number | null>(null);

  // eslint-disable-next-line react-hooks/refs
  if (typeof window !== "undefined" && savedRef.current === null) {
    savedRef.current = window.scrollY;
  }

  useEffect(() => {
    const saved = savedRef.current;
    if (saved === null) return;
    savedRef.current = null;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (window.scrollY !== saved) window.scrollTo(0, saved);
      });
    });
  }, []);

  return children;
}

// Usage:
<PromptInputHoverCardContent className="w-[400px] overflow-hidden p-0">
  <ScrollLock>
    <YourCommandMenu />
  </ScrollLock>
</PromptInputHoverCardContent>
```
`overflow-hidden` alone is insufficient — it doesn't create a scroll boundary for `scrollIntoView` when content fits without overflow. The `ScrollLock` captures scroll position during render and restores it via double-`requestAnimationFrame` after the browser finishes focus/scroll adjustments.

#### 3d. Accessibility and lint safety for icon-triggered composer controls

1. **Always set button labels for icon-only controls**:
   - `PromptInputActionMenuTrigger aria-label="Add"`
   - `PromptInputButton aria-label="Customize"`
   - `PromptInputButton aria-label="Voice"` or `"Stop listening"`
   - `PromptInputSubmit aria-label="Submit"`
2. **Keep decorative icon labels empty**:
   - `AddIcon label=""`, `ArrowUpIcon label=""`, etc.
3. **Use ESLint-safe submit handlers**:
   - Prefer `onSubmit={() => handleSubmit()}` over unused args such as `_message` when payload is not needed.
4. **Avoid nested-button tooltip markup**:
   - When adding tooltips to button-like controls, render the trigger as the button element (`TooltipTrigger render={button}` or equivalent `asChild`), not as a wrapper around a `<button>`.
   - Nested button symptoms include hydration/runtime errors like: `button cannot be a descendant of button`.
5. **PromptInput action-menu callbacks**:
   - Use `onSelect` on `PromptInputActionMenuItem` — it auto-closes the dropdown menu after firing.
   - Do not use `onClick` for menu item handlers; it fires but doesn't trigger the dropdown close behavior, requiring manual `onClose`/`onOpenChange(false)` callbacks.

### Phase 4 — Examples

Create or update demos for the migrated component.

1. **Check for existing demos** — Look in `components/website/demos/ai/` for the component slug.
2. **Create/update demo** — Follow the demo pattern from `vpk-component` skill:
   - Demo files in `components/website/demos/ai/[slug]/`
   - Register in `UI_AI_VARIANT_DEMOS` in `components/website/registry.ts`
   - Add metadata to `app/data/details/ai.ts`
   - Keep slug wiring consistent across all three surfaces: named demo export, `UI_AI_VARIANT_DEMOS` key, and details `demoSlug` entry.
   - If the component page preview should use a specific variant, set that variant as the demo module's default export.
3. **Show before/after** — If practical, create a demo that contrasts the custom approach vs. ui-ai approach.

### Phase 5 — Validate

1. **Run baseline checks (required)**:
   - `pnpm run lint`
   - `pnpm tsc --noEmit` (ui-ai source is excluded, but call-site types must resolve)
3. **Visual comparison** — Verify in browser (light + dark):
   - Message rendering matches pre-migration appearance
   - Streaming text renders correctly
   - Widget areas still function
   - Scroll behavior works (auto-scroll, scroll-to-bottom button)
   - Message actions (copy, retry, like/dislike) function
   - **Dark mode testing recipe** — When toggling dark mode via Playwright, setting just the CSS class is insufficient. Update all three layers:
     ```js
     await page.evaluate(() => {
       document.documentElement.classList.remove('light');
       document.documentElement.classList.add('dark');
       document.documentElement.style.colorScheme = 'dark';
       const dt = document.documentElement.getAttribute('data-theme') || '';
       document.documentElement.setAttribute('data-theme', dt.replace('light:light', 'light:dark'));
     });
     ```
     Note: `color-scheme` inline style and `data-theme` attribute must also be updated for ADS tokens and native controls to switch correctly.
4. **Runtime smoke checks** — Validate interaction, not just rendering:
   - Browser console has no new runtime/hydration errors after load and after interacting with controls.
   - At least one stateful interaction per migrated surface succeeds (for example, action menu inserts text, submit status indicator updates, submit enable/disable toggles correctly).
5. **Accessibility** — Run both:
   - `ads_analyze_a11y` on migrated source code
   - `ads_analyze_localhost_a11y` scoped to the component root selector (for docs pages, prefer `main article`) to reduce unrelated page-shell/tooling violations
   - If local overlays/toolbars are present, classify those findings separately from migrated component findings (regression vs pre-existing/tooling).
6. **Dead-code cleanup + residual import gate (required)** — Remove old custom modules that are no longer referenced:
   - `rg -n "OldComponentName|old-component-path" components app`
   - Delete unreferenced files after confirming no imports remain
   - **Upstream pipeline cleanup:** When `MessageResponse` replaces `dangerouslySetInnerHTML`, the parent component's markdown pre-rendering pipeline becomes dead code. Remove:
     - Pre-render memos (e.g., `renderedMessages` useMemo that called a markdown function)
     - Custom markdown utilities (e.g., `renderMarkdownToHtml` in `lib/markdown.ts`)
     - Extended types (e.g., `RenderedMessage` with `renderedHtml` field)
     - Unused imports (e.g., `type { Message }` when no longer referenced)
   - **Style data cleanup:** When inline `style` objects are replaced by Tailwind classes, clean up orphaned entries in style data files (e.g., `data/styles.ts`)
7. **Validation fallback when lint baseline is noisy (required)**:
   - If repo-wide `pnpm run lint` fails for unrelated pre-existing issues, you must also run targeted lint on changed files:
     - `pnpm exec eslint <changed-file-1> <changed-file-2> ...`
   - Report both outcomes clearly: global baseline status and changed-file status
8. **API/consumer safety gates (required when interfaces changed)**:
   - Create API delta map for changed props/types/events
   - Audit all consumers with `rg` before and after migration
   - Migrate callsites before deleting legacy wrappers/components

---

## Decision Tree

Use this flowchart to select the right ui-ai component based on what the custom code does:

```
Is it a message display?
├── Yes → Does it show role-based styling (user vs assistant)?
│   ├── Yes → Message + MessageContent
│   │   ├── Has markdown/rich text? → Add MessageResponse
│   │   ├── Has action buttons? → Add MessageActions + MessageAction
│   │   └── Has branch navigation? → Add MessageBranch
│   └── No → Is it a system/status message?
│       └── Yes → Message from="system" or custom wrapper
├── Is it a scroll/conversation container?
│   ├── Yes → Conversation + ConversationContent
│   │   ├── Has scroll-to-bottom? → Add ConversationScrollButton
│   │   ├── Has empty state? → Add ConversationEmptyState
│   │   └── Has download? → Add ConversationDownload
├── Is it a text input for sending messages?
│   ├── Yes → PromptInput compound
│   │   ├── Has file upload? → Add PromptInputActionAddAttachments
│   │   ├── Has model picker? → Add PromptInputSelect
│   │   └── Has action menu? → Add PromptInputActionMenu
├── Is it suggestion chips/buttons?
│   └── Yes → Suggestions + Suggestion
├── Is it a code display with syntax highlighting?
│   └── Yes → CodeBlock + CodeBlockHeader + CodeBlockCopyButton
├── Is it a thinking/reasoning display?
│   └── Yes → Reasoning
├── Is it a loading shimmer/skeleton?
│   └── Yes → Shimmer
└── No match? → Keep custom implementation, document as gap
```

---

## Common Migration Patterns

For full before/after code examples covering Message, Conversation, Suggestions, MessageActions, and CodeBlock migrations, see `references/migration-examples.md`.

---

## ui-ai Quick API Reference

For complete sub-component listings and key props for all ui-ai compound components (Message, Conversation, PromptInput, Suggestion, CodeBlock, Reasoning, Shimmer), see `references/api-reference.md`.

---

## TypeScript Exclusion Warning

`components/ui-ai/**` is excluded from TypeScript checking in `tsconfig.json`. This means:

- **No type errors are reported** for ui-ai source files
- **Call-site types must be handled manually** — ensure props match by reading the ui-ai source
- **Import paths resolve** but hover/autocomplete may not work in IDEs
- **Mitigation:** Always read the ui-ai component source before using it to verify prop names and types
- When adding new props or wrappers, add JSDoc annotations or `@ts-expect-error` comments at the call site if needed

## Gotchas

### Naming Collisions

ui-ai component names often collide with local types in the consuming feature. For example, a local `Message` type from `context-chat.tsx` collides with `Message` from `ui-ai/message.tsx`.

**Solution:** Alias the ui-ai import at the call site:

```tsx
import { Message as UiMessage, MessageContent, MessageResponse } from "@/components/ui-ai/message";
```

**Rule:** Any ui-ai component name that matches a local type or variable needs aliasing. Check for collisions during Phase 3 — Migrate before committing imports.

### Source Demo as Source of Truth

When adding or modifying ui-ai sub-components (e.g., adding `PromptInputMicrophone`), always update the canonical demo in `components/website/demos/ai/` first. Feature pages (`/chat`, `/plan`, `/rovo`) copy the demo's composer pattern. Fixing consumers individually without updating the source demo means every new consumer will miss the change.

**Rule:** Source demo → feature pages, not the other way around.

### InputGroupTextarea Hover Override

`InputGroupTextarea` must use `variant="none"` on its inner `Textarea` to prevent hover/active background changes. The default `Textarea` variant applies `data-[variant=default]:hover:bg-bg-input-hovered` which has higher specificity than a plain `hover:bg-transparent` utility class. Don't try to override variant styles with utility classes — use the variant system instead.

---

## Checklist

### Discovery
- [ ] Custom menu item divs replaced with `PromptInputActionMenuItem` (use `onSelect`, not `onClick`)
- [ ] Footer disclaimer/legal text replaced with `Footer` from `@/components/ui/footer`
- [ ] Target file/directory read and custom AI patterns identified
- [ ] Detection Checklist applied (all 15 patterns checked)
- [ ] Corresponding ui-ai source files read
- [ ] ai-elements reference docs consulted
- [ ] Data flow traced through contexts

### Mapping
- [ ] Component Mapping table produced (with match quality)
- [ ] Props Mapping table produced
- [ ] Sub-component Mapping table produced
- [ ] Gap Analysis table produced with resolutions

### Migration
- [ ] Imports replaced with ui-ai imports
- [ ] Components replaced following Decision Tree
- [ ] ADS styling preserved via className overrides
- [ ] Legacy composer shell recipe applied when existing container owns chrome
- [ ] Markdown rendering switched to MessageResponse
- [ ] Callbacks wired into ui-ai component props
- [ ] Icon-only controls have explicit `aria-label` values
- [ ] ESLint-safe `onSubmit` handler used (no unused params)
- [ ] Gaps handled via extension patterns (wrap, className, compose)
- [ ] Legacy custom components removed when unreferenced

### Examples
- [ ] Demo files created/updated in `components/website/demos/ai/`
- [ ] Demos registered in `components/website/registry.ts`
- [ ] Detail metadata updated in `app/data/details/ai.ts`

### Validation
- [ ] `pnpm run lint` passes (0 new errors)
- [ ] If global lint is noisy, targeted ESLint on changed files passes
- [ ] `pnpm tsc --noEmit` passes (0 new errors)
- [ ] Validation report includes both global lint status and changed-file lint status
- [ ] API delta map created when props/types/events changed
- [ ] Consumer audit completed with `rg` before/after migration
- [ ] Residual import scan confirms no references to retired custom components
- [ ] Visual comparison in light and dark theme
- [ ] Streaming text renders correctly
- [ ] Scroll behavior verified
- [ ] Message actions function
- [ ] Accessibility code scan (`ads_analyze_a11y`) passed
- [ ] Accessibility live scan (`ads_analyze_localhost_a11y`) passed on scoped selector
- [ ] Accessibility findings classified as regression vs pre-existing/tooling

---

## File Reference

| File | Role |
|---|---|
| `components/ui-ai/message.tsx` | Message compound component |
| `components/ui-ai/conversation.tsx` | Conversation scroll container |
| `components/ui-ai/prompt-input.tsx` | Prompt input compound component |
| `components/ui-ai/suggestion.tsx` | Suggestion chips |
| `components/ui-ai/code-block.tsx` | Code block with syntax highlighting |
| `components/ui-ai/reasoning.tsx` | Reasoning/thinking display |
| `components/ui-ai/shimmer.tsx` | Loading shimmer animation |
| `components/templates/sidebar-chat/` | Chat feature (primary migration target) |
| `components/templates/fullscreen-chat/` | Full-screen AI chat (primary migration target) |
| `app/contexts/context-rovo-chat.tsx` | Chat context with useChat integration |
| `components/website/registry.ts` | Demo registry |
| `app/data/details/ai.ts` | AI component detail entries |
| `~/.agents/skills/ai-elements/references/` | ai-elements API reference docs |

## References

- **`references/api-reference.md`** — Full sub-component listings and key props for all ui-ai compounds
- **`references/migration-examples.md`** — Before/after code examples for common migration patterns
- **`references/migration-catalog.md`** — All 47 ui-ai modules grouped by category

## MCP Tool Reference

| Tool | Purpose |
|---|---|
| `ads_plan` | Search ADS component docs, props, tokens |
| `ads_analyze_a11y` | Analyze component code for accessibility |
| `ads_analyze_localhost_a11y` | Analyze live page for accessibility |
| `resolve-library-id` + `query-docs` | Fetch library docs via context7 |
| `browser_navigate` + `browser_snapshot` | Visual comparison in browser |
