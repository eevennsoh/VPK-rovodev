# Cursor & Annotation for Artifacts (react-grab integration)

## Context

With GPT Realtime Voice + RovoDev delegation now working, the next step is adding a **pointing/annotation layer** so users can visually identify and mark elements in artifacts for RovoDev to act on. This follows the ambient teammate architecture's LOG → CONTEXT promotion pattern: selections accumulate client-side, then flush into GPT's context when the user speaks.

React-grab is already loaded globally in dev mode (`DevReactGrabMount` in `app/layout.tsx`). It provides element selection with `getElementContext()` returning `{ componentName, selector, stackString, stack, element }` and a plugin system with `onElementSelect` hooks. Artifacts render inline (not in iframes) in `FutureChatArtifactPanel`, so react-grab can target their content directly.

React-grab does **not** have built-in annotation/comment UI. It handles selection and context capture. We build a thin annotation layer on top: pin markers on the artifact + a comment popover.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Artifact panel only | Cursor mode is meaningless without an open artifact |
| Context flow | Client-side ring buffer → flush on `speech_started` | Follows ambient LOG → CONTEXT promotion; zero latency for selections |
| Annotation creation | Client-side via react-grab plugin + custom comment popover | No GPT tool needed — annotations are UI state, not AI decisions |
| Persistence | Ephemeral (session-only, cleared on artifact close) | Ship fast, add persistence later if needed |
| Voice flow | Annotate first, batch apply later ("fix these annotations") | Natural flow: mark problems → voice command → RovoDev acts |
| Annotation visuals | Numbered pin markers on artifact + annotation list in voice bar | Clear visual mapping between pins and descriptions |
| Activation | Cursor toggle button in artifact panel toolbar | Co-located with other artifact modes (edit/preview) |
| Selection data | `{ selector, componentName, textContent, comment }` | Minimal but enough for RovoDev to locate and understand the element |

## Files to Create

| File | Purpose |
|------|---------|
| `components/projects/future-chat/hooks/use-artifact-annotations.ts` | Annotation state, react-grab plugin, ring buffer, context formatting |

## Files to Modify

| File | Change |
|------|--------|
| `components/projects/future-chat/components/future-chat-artifact-panel.tsx` | Add cursor toggle button, annotation overlay layer, pass annotation props |
| `components/projects/future-chat/components/future-chat-shell.tsx` | Wire annotation hook, flush buffer on `speech_started`, pass to artifact panel |
| `components/projects/future-chat/components/realtime-voice-bar.tsx` | Show annotation count/list when annotations exist |
| `backend/lib/openai-realtime.js` | Update system instructions to understand annotation context |

## Implementation

### 1. Hook: `use-artifact-annotations.ts`

**New file.** Manages annotation lifecycle and react-grab integration.

```ts
interface Annotation {
    id: string;
    index: number;           // 1-based display number
    selector: string;        // CSS selector from getElementContext
    componentName: string;   // React component name
    textContent: string;     // First ~100 chars of element text
    comment: string;         // User's annotation text
    rect: DOMRect;           // Position for pin marker
    timestamp: number;
}

interface UseArtifactAnnotationsOptions {
    active: boolean;                                   // cursor mode on/off
    containerRef: RefObject<HTMLDivElement | null>;     // artifact content container
    onAnnotationAdded?: (annotation: Annotation) => void;
}

interface UseArtifactAnnotationsReturn {
    annotations: Annotation[];
    pendingSelection: { element: Element; context: ReactGrabElementContext } | null;
    addComment: (comment: string) => void;             // confirm pending selection with comment
    dismissSelection: () => void;                      // cancel pending selection
    removeAnnotation: (id: string) => void;
    clearAnnotations: () => void;
    formatContextForGPT: () => string;                 // serialize annotations for context injection
}
```

**Behavior:**

1. When `active` becomes `true`:
   - Call `window.__REACT_GRAB__?.activate?.()`
   - Register a react-grab plugin via `registerPlugin({ name: "artifact-annotator", hooks: { onElementSelect } })`
   - The `onElementSelect` handler captures `getElementContext(element)` and sets `pendingSelection`

2. When `active` becomes `false`:
   - Call `window.__REACT_GRAB__?.deactivate?.()`
   - Unregister plugin via `unregisterPlugin("artifact-annotator")`
   - Clear `pendingSelection`

3. `addComment(comment)`: Takes `pendingSelection`, creates an `Annotation` with `element.getBoundingClientRect()` relative to container, appends to array, clears pending.

4. `formatContextForGPT()`: Returns a string like:
   ```
   [Artifact Annotations]
   #1 (selector: .header > h1, component: Header): "Make this title larger" — element text: "Welcome to..."
   #2 (selector: .card-list > .card:nth-child(2), component: Card): "Wrong color here" — element text: "Project Alpha"
   ```

5. Ring buffer: Cap at 20 annotations. Oldest drops off when exceeded.

### 2. Artifact panel: Cursor toggle + annotation overlay

**File:** `components/projects/future-chat/components/future-chat-artifact-panel.tsx`

**2a. Add new props:**

```ts
interface FutureChatArtifactPanelProps {
    // ... existing props
    annotations?: Annotation[];
    cursorMode?: boolean;
    onCursorModeChange?: (active: boolean) => void;
    pendingSelection?: { element: Element; context: any } | null;
    onAddComment?: (comment: string) => void;
    onDismissSelection?: () => void;
    onRemoveAnnotation?: (id: string) => void;
}
```

**2b. Add cursor toggle button** in the toolbar (after Edit/Preview button, before Copy button, ~line 145):

```tsx
<Button
    aria-label={cursorMode ? "Exit cursor mode" : "Enter cursor mode"}
    aria-pressed={cursorMode}
    className={cn(cursorMode && "bg-bg-selected text-text-selected")}
    disabled={isStreamingArtifact}
    onClick={() => onCursorModeChange?.(!cursorMode)}
    size="sm"
    type="button"
    variant="outline"
>
    <MousePointerClickIcon className="size-4" />
    Annotate
</Button>
```

Icon: `MousePointerClickIcon` from lucide-react.

**2c. Add annotation pin overlay** on the content area. Wrap the content `<div>` (line 168) with `position: relative`, then render pin markers:

```tsx
<div className="relative min-h-0 flex-1 overflow-auto bg-surface" ref={contentRef}>
    {/* Existing content */}
    <div className="mx-auto ...">...</div>

    {/* Annotation pins overlay */}
    {annotations?.map((ann) => (
        <div
            key={ann.id}
            className="absolute flex size-5 items-center justify-center rounded-full bg-brand-bold text-[10px] font-bold text-text-inverse shadow-sm"
            style={{ top: ann.rect.top, left: ann.rect.left - 24 }}
            title={ann.comment}
        >
            {ann.index}
        </div>
    ))}

    {/* Pending selection comment popover */}
    {pendingSelection ? (
        <AnnotationCommentPopover
            onSubmit={onAddComment}
            onDismiss={onDismissSelection}
            position={pendingSelection.element.getBoundingClientRect()}
        />
    ) : null}
</div>
```

**2d. `AnnotationCommentPopover`** — Inline in the same file (or extract if large). Simple popover with:
- Text input for comment
- Submit button (CheckIcon)
- Dismiss button (XIcon)
- Positioned near the selected element using absolute positioning relative to the scrollable container

**2e. Pin position tracking:** Annotations store `rect` relative to the scroll container. On scroll or resize, pin positions naturally stay correct because they're absolute within the scrollable container. We recalculate rects on scroll by re-querying `document.querySelector(annotation.selector)?.getBoundingClientRect()` relative to container.

### 3. Shell: Wire annotations to voice context

**File:** `components/projects/future-chat/components/future-chat-shell.tsx`

**3a. Add annotation state:**

```tsx
const [cursorMode, setCursorMode] = useState(false);
const artifactContentRef = useRef<HTMLDivElement>(null);

const annotations = useArtifactAnnotations({
    active: cursorMode && chat.isArtifactOpen,
    containerRef: artifactContentRef,
});
```

**3b. Flush annotations on `speech_started`:**

In the existing realtime voice event handling, when `speech_started` fires (user begins speaking while realtime is active):

```tsx
// Add to the speech_started handler in useRealtimeVoice options
onSpeechStarted: useCallback(() => {
    if (annotations.annotations.length > 0) {
        realtime.injectContext({
            type: "artifact_annotations",
            content: annotations.formatContextForGPT(),
        });
    }
}, [annotations]),
```

This follows the ambient teammate's CONTEXT promotion: accumulated selections flush when voice input begins.

**3c. Pass annotation props to `FutureChatArtifactPanel`:**

```tsx
<FutureChatArtifactPanel
    // ... existing props
    annotations={annotations.annotations}
    cursorMode={cursorMode}
    onCursorModeChange={setCursorMode}
    pendingSelection={annotations.pendingSelection}
    onAddComment={annotations.addComment}
    onDismissSelection={annotations.dismissSelection}
    onRemoveAnnotation={annotations.removeAnnotation}
/>
```

**3d. Auto-disable cursor mode** when artifact closes:

```tsx
useEffect(() => {
    if (!chat.isArtifactOpen) {
        setCursorMode(false);
    }
}, [chat.isArtifactOpen]);
```

**3e. Include annotations in delegation context:**

When `onDelegateToRovo` fires and annotations exist, append annotation context to the `contextDescription`:

```tsx
onDelegateToRovo: useCallback(
    async (request: DelegationRequest) => {
        const c = chatRef.current;
        let contextDescription = request.conversationSummary
            ? `[Voice context] ${request.conversationSummary}`
            : undefined;

        // Append annotation context if present
        if (annotations.annotations.length > 0) {
            const annotationCtx = annotations.formatContextForGPT();
            contextDescription = contextDescription
                ? `${contextDescription}\n\n${annotationCtx}`
                : annotationCtx;
        }

        // ... rest unchanged (steer vs submit logic)
    },
    [annotations],
),
```

### 4. Voice bar: Annotation count indicator

**File:** `components/projects/future-chat/components/realtime-voice-bar.tsx`

**4a. Add `annotationCount` prop:**

```ts
interface RealtimeVoiceBarProps {
    // ... existing props
    annotationCount?: number;
}
```

**4b. Render annotation badge** next to status label when annotations exist:

```tsx
{annotationCount && annotationCount > 0 ? (
    <span className="flex items-center gap-1 text-xs text-brand-bold">
        <MousePointerClickIcon className="size-3" />
        {annotationCount} annotation{annotationCount !== 1 ? "s" : ""}
    </span>
) : null}
```

### 5. Server: Update system instructions

**File:** `backend/lib/openai-realtime.js`

**5a. Add annotation awareness** to `ROVO_SYSTEM_INSTRUCTIONS`:

Append to the existing system instructions:

```
When the user has made artifact annotations (marked with numbered pins and comments),
you will receive them as context. Reference specific annotation numbers when discussing them.
When delegating to RovoDev, include the annotation context so it knows exactly which
elements to modify and what changes the user wants.
```

**5b. Handle `artifact_annotations` context type** in `_handleContextInject`:

Add a case for `contextType === "artifact_annotations"` that creates a system message with the formatted annotation text. This reuses the existing context injection mechanism — no new protocol needed.

### 6. React-grab plugin registration

The plugin registration uses react-grab's `registerPlugin` API. Since `window.__REACT_GRAB__` may not expose `registerPlugin` directly (the current typed interface only has `activate`, `deactivate`, `setEnabled`), we need to:

**6a. Extend the `ReactGrabWindow` type** in `use-artifact-annotations.ts`:

```ts
type ReactGrabWindow = Window & {
    __REACT_GRAB__?: {
        activate?: () => void;
        deactivate?: () => void;
        setEnabled?: (enabled: boolean) => void;
        registerPlugin?: (config: {
            name: string;
            hooks?: { onElementSelect?: (element: Element) => void };
        }) => void;
        unregisterPlugin?: (name: string) => void;
        getElementContext?: (element: Element) => {
            componentName: string;
            selector: string;
            stackString: string;
            stack: Array<{ fileName: string; lineNumber: number }>;
            element: Element;
        };
    };
};
```

**6b. Fallback if plugin API unavailable:** If `registerPlugin` is not available on the global, fall back to a click event listener on the artifact container that calls `getElementContext` on the clicked element. This makes the feature work even if react-grab's plugin API isn't exposed.

## Key Architectural Decisions

- **Client-side annotations, not GPT-managed** — Annotations are UI state. GPT doesn't create them; it receives them as context. Follows ambient teammate's LOG → CONTEXT separation.
- **`speech_started` as context flush trigger** — Key insight from ambient teammate: promote accumulated context exactly when the user begins speaking, giving GPT maximum relevant context with zero latency.
- **Annotations in delegation payload** — When GPT calls `delegate_to_rovo`, annotation context rides along in `contextDescription`. RovoDev receives element selectors and comments, enabling targeted updates.
- **Ephemeral by design** — Annotations clear when the artifact closes. No database, no sync. If persistence is needed later, serialize to `sessionStorage`.
- **React-grab plugin with click fallback** — Use the plugin API if available, fall back to container click + `getElementContext` if not. Defensive against API surface changes.

## Verification

1. **Typecheck:** `pnpm tsc --noEmit` — zero new errors
2. **Lint:** `pnpm run lint`
3. **Manual test — cursor mode activation:**
   - Open an artifact in future-chat
   - Click "Annotate" button in toolbar → react-grab activates (element highlighting on hover)
   - Click "Annotate" again → deactivates
4. **Manual test — adding annotations:**
   - Enable cursor mode
   - Click an element in the artifact → comment popover appears
   - Type a comment → numbered pin marker appears on the element
   - Add 2-3 annotations → pins numbered sequentially
5. **Manual test — voice with annotations:**
   - Add annotations to artifact
   - Start realtime voice
   - Say "Fix the issues I marked" → GPT receives annotation context, delegates to RovoDev with selectors and comments
   - Verify RovoDev output addresses the annotated elements
6. **Manual test — voice bar indicator:**
   - With annotations active, verify count badge shows in voice bar
7. **Manual test — cleanup:**
   - Close artifact → cursor mode auto-disables, annotations clear
   - Re-open artifact → clean state
