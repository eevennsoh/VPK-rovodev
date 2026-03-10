# Cursor & Annotation for Artifacts (react-grab integration, revised)

## Context

`react-grab` can select rendered DOM nodes and enrich them with React-aware context such as component name, source stack, source file, and selector data. That capability is valid and useful here.

The important constraint is the current Future Chat artifact surface:

- `FutureChatArtifactPanel` renders a viewer for serialized artifact content
- it does not render a live generated app/component tree
- for `text`, `code`, and `image`, the selectable surface is the viewer DOM the user sees right now (no `sheet` viewer exists today)

So Phase 1 should be a **viewer-surface annotation system**, not a claim that we are selecting the original generated application DOM behind the artifact.

This plan also fixes the previous draft’s API mismatches:

- use the `react-grab` plugin API for selection hooks
- do **not** assume `getElementContext()` exists on `window.__REACT_GRAB__`
- use `react-grab/primitives` only where we explicitly import it
- treat the feature as **dev-only in Phase 1**, matching the current `DevReactGrabMount`
- wire annotation context into both realtime prompt submission and active artifact steering

## Corrections to the previous draft

1. `react-grab` does support `registerPlugin`, `unregisterPlugin`, and `onElementSelect`.
2. `getElementContext()` is part of `react-grab/primitives`, not the public `ReactGrabAPI` on `window.__REACT_GRAB__`.
3. `react-grab` has built-in comment/prompt/history UI, but that internal state is not the right source of truth for Future Chat voice context. We should keep a VPK-owned annotation model.
4. The current artifact panel is a viewer surface. We must anchor annotations to the viewer the user actually clicked, not pretend every selection maps to original artifact DOM.
5. Realtime voice currently has no `onSpeechStarted` callback and `applyVoiceSteer()` does not accept extra context. The plan must change those APIs explicitly.
6. `backend/lib/openai-realtime.js` currently misses `thread_context` handling even though the client already sends it. The context protocol needs cleanup before adding `artifact_annotations`.
7. The backend also handles `initial_context` as a context type. Any normalization must preserve that existing case.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Artifact viewer surface only | Matches what `FutureChatArtifactPanel` actually renders today |
| Runtime | Dev-only in Phase 1 | Matches current `DevReactGrabMount` behavior and avoids accidental prod coupling |
| React-grab integration | Global `ReactGrabAPI` for activation/plugin lifecycle + lazy `react-grab/primitives` import for rich context | Uses the real API surfaces without double-initializing the overlay |
| Annotation ownership | VPK-owned annotation state | We need structured state for voice context, panel overlays, and badges |
| Comment UI | Custom lightweight comment popover | `react-grab` comment/history state is internal and not the right app contract |
| Context promotion | Flush on realtime `speech_started` and append to both prompt and steer flows | Preserves the intended LOG → CONTEXT behavior |
| Anchor model | Viewer-aware anchor per artifact kind | Avoids over-relying on brittle CSS selectors for code/image viewers |
| Persistence | Ephemeral per open artifact session | Fastest path to ship; persistence can come later |

## Out of Scope

- Rendering a live app preview inside the artifact panel
- Persisting annotations across page reloads or threads
- Shipping annotation mode in production
- Depending on `react-grab` internal history/comment UI as app state

## Files to Create

| File | Purpose |
|------|---------|
| `components/projects/future-chat/hooks/use-artifact-annotations.ts` | React-grab plugin lifecycle, pending selection state, annotation CRUD, overlay position tracking |
| `components/projects/future-chat/lib/future-chat-artifact-annotations.ts` | Pure helpers for anchor extraction, ring-buffer behavior, and context serialization |
| `components/projects/future-chat/lib/future-chat-artifact-annotations.test.js` | Regression tests for serialization, buffer limits, and anchor formatting |
| `backend/lib/openai-realtime.test.js` | Regression tests for `thread_context` and `artifact_annotations` injection handling |

## Files to Modify

| File | Change |
|------|--------|
| `components/projects/future-chat/components/future-chat-artifact-panel.tsx` | Add annotate toggle, overlay layer, panel ref wiring, and comment popover |
| `components/projects/future-chat/components/future-chat-shell.tsx` | Create annotation state, clear on artifact close/version change, pass props to panel, forward context into voice flows |
| `components/projects/future-chat/components/realtime-voice-bar.tsx` | Show annotation badge and optional compact preview text |
| `components/projects/future-chat/hooks/use-realtime-voice.ts` | Add `onSpeechStarted` callback and extend allowed injected context types |
| `components/projects/future-chat/hooks/use-future-chat.ts` | Extend `applyVoiceSteer()` to accept context text and pass it through transport body |
| `backend/lib/openai-realtime.js` | Normalize context type handling, add `thread_context` + `artifact_annotations`, update system instructions |

## Implementation

### 1. Annotation model and pure helpers

Create `components/projects/future-chat/lib/future-chat-artifact-annotations.ts` for all pure logic that should be testable without React.

Use a viewer-aware annotation model:

```ts
export type ArtifactAnnotationKind = "text" | "code" | "image";
// "sheet" is reserved for a future viewer surface; no sheet viewer exists today

export interface ArtifactAnnotationSource {
	filePath: string | null;
	lineNumber: number | null;
	componentName: string | null;
	stackString: string;
}

export interface ArtifactAnnotationAnchor {
	selector: string | null;
	textExcerpt: string;
	htmlPreview: string;
	codeLineNumber?: number | null;
	codeLineText?: string | null;
	imagePoint?: { x: number; y: number }; // normalized 0..1 within rendered image
}

export interface ArtifactAnnotationPosition {
	top: number;
	left: number;
	width: number;
	height: number;
}

export interface ArtifactAnnotation {
	id: string;
	index: number;
	documentId: string;
	documentVersionId: string | null;
	kind: ArtifactAnnotationKind;
	comment: string;
	anchor: ArtifactAnnotationAnchor;
	source: ArtifactAnnotationSource;
	position: ArtifactAnnotationPosition;
	createdAt: number;
}
```

Key helper functions:

- `createAnnotationFromSelection(...)`
- `reindexAnnotations(...)`
- `appendWithRingBuffer(..., limit = 20)`
- `formatAnnotationsForVoiceContext(...)`
- `buildVoiceContextDescription(existing, annotationContext)`

Important change from the previous draft:

- selectors are now only one signal
- text excerpt, source file, stack string, and kind-specific anchor data are first-class
- code annotations should prefer `codeLineNumber` / `codeLineText` over raw syntax-token selectors
- image annotations should use normalized click coordinates, not only element selectors

Example serialized context:

```txt
[Artifact Annotations]
Artifact kind: code
#1: "Make this heading larger"
- viewer anchor: code line 12
- selected text: "Welcome to Future Chat"
- source: components/projects/future-chat/components/future-chat-artifact-panel.tsx:190
- selector: pre code > span:nth-child(12)

#2: "This image should be cropped tighter"
- viewer anchor: image point (0.42, 0.31)
- selected text: "Hero image"
- source: unknown
```

### 2. Hook: `use-artifact-annotations.ts`

This hook owns all runtime annotation state and bridges Future Chat with `react-grab`.

```ts
interface UseArtifactAnnotationsOptions {
	active: boolean;
	documentId: string | null;
	documentKind: ArtifactAnnotationKind | null;
	documentVersionId: string | null;
	containerRef: RefObject<HTMLDivElement | null>;
}

interface PendingArtifactSelection {
	element: Element;
	position: ArtifactAnnotationPosition;
	source: ArtifactAnnotationSource;
	anchor: ArtifactAnnotationAnchor;
}

interface UseArtifactAnnotationsResult {
	annotations: ArtifactAnnotation[];
	pendingSelection: PendingArtifactSelection | null;
	addComment: (comment: string) => void;
	dismissSelection: () => void;
	removeAnnotation: (id: string) => void;
	clearAnnotations: () => void;
	refreshPositions: () => void;
	formatContextForVoice: () => string;
}
```

#### 2a. React-grab lifecycle

Use the global API for overlay activation and plugin registration:

```ts
type ReactGrabApi = {
	activate?: () => void;
	deactivate?: () => void;
	registerPlugin?: (plugin: {
		name: string;
		hooks?: {
			onElementSelect?: (element: Element) => boolean | void | Promise<boolean>;
		};
	}) => void;
	unregisterPlugin?: (name: string) => void;
	getDisplayName?: (element: Element) => string | null;
	getSource?: (element: Element) => Promise<{
		filePath: string | null;
		lineNumber: number | null;
		componentName: string | null;
	} | null>;
	getStackContext?: (element: Element) => Promise<string>;
};
```

When `active` becomes `true`:

- no-op outside development
- read `window.__REACT_GRAB__`
- call `activate()`
- register a plugin named `"future-chat-artifact-annotations"`

When `active` becomes `false` or the hook unmounts:

- unregister the plugin
- call `deactivate()`
- clear `pendingSelection`

#### 2b. Rich selection context

Inside `onElementSelect`, lazily import primitives only in dev:

```ts
const { getElementContext } = await import("react-grab/primitives");
```

This fixes the previous plan’s incorrect assumption that `getElementContext()` lives on `window.__REACT_GRAB__`.

Selection flow:

1. Ignore selections outside the artifact viewer container.
2. Call `getElementContext(element)` for rich DOM/React context.
3. Build kind-specific anchor data:
   - `text`: selector + text excerpt + html preview
   - `code`: nearest line text + line number when derivable, plus selector fallback
   - `image`: normalized click point within the rendered image and image alt/text context
4. Resolve source metadata with `context.stack`, `context.stackString`, and `api.getSource(element)` as fallback.
5. Capture viewer-relative bounds for pin placement.
6. Set `pendingSelection`.
7. Return `true` from `onElementSelect` so the plugin owns the selection event.

#### 2c. Why not use `react-grab` built-in comments?

`react-grab` already has comment/prompt/history concepts, but Future Chat needs:

- annotations scoped to the currently open artifact
- structured context formatting for voice injection
- explicit badge/count UI in the voice bar
- deterministic cleanup when artifact/version changes

So we keep a VPK-owned annotation list and use `react-grab` only as the selection engine.

### 3. Artifact viewer anchors and overlay behavior

This is the main architectural correction from the previous draft.

We are annotating the **current viewer surface**:

- `text`: the rendered prose/message DOM
- `code`: the syntax-highlighted code viewer DOM
- `image`: the rendered image surface

Note: there is no `sheet` viewer today. If one is added later, the kind type can be extended.

We are **not** promising that every selector points to an original app element inside the generated artifact source.

#### 3a. Position tracking

The previous draft’s scroll logic was contradictory. Replace it with:

- store last-known viewer-relative bounds per annotation
- on container scroll, resize, and version change, call `refreshPositions()`
- for text/code:
  - if a selector can be re-resolved inside the container, update bounds from the live element
  - otherwise keep the last-known bounds and mark the pin as stale-but-visible
- for image:
  - recompute pin position from normalized coordinates and current image rect

Use `ResizeObserver` on the container and the rendered image element where relevant.

#### 3b. Version safety

Annotations are only valid for the currently visible artifact version.

Rules:

- clear annotations when artifact closes
- clear annotations when selected artifact document changes
- clear annotations when the selected version changes
- clear annotations when switching from preview to edit mode

This avoids carrying stale viewer anchors across content changes.

### 4. Artifact panel UI

**File:** `components/projects/future-chat/components/future-chat-artifact-panel.tsx`

Add new props:

```ts
interface FutureChatArtifactPanelProps {
	// existing props...
	annotations?: ArtifactAnnotation[];
	cursorMode?: boolean;
	contentRef?: RefObject<HTMLDivElement | null>;
	pendingSelection?: PendingArtifactSelection | null;
	onCursorModeChange?: (active: boolean) => void;
	onAddComment?: (comment: string) => void;
	onDismissSelection?: () => void;
	onRemoveAnnotation?: (id: string) => void;
}
```

#### 4a. Toolbar button

Add an `Annotate` toggle beside `Edit/Preview`.

Behavior:

- only enabled in preview mode
- disabled while streaming
- visually indicates active cursor mode
- dev-only tooltip/copy should make the Phase 1 scope explicit

#### 4b. Content ref

Pass a `contentRef` to the outer scrollable artifact viewer container so the hook can:

- constrain valid selections
- compute viewer-relative pin positions
- listen for scroll/resize

#### 4c. Comment popover

Keep a lightweight VPK-owned popover:

- textarea/input for the comment
- submit and dismiss buttons
- positioned near the selected element inside the artifact viewer

Do not route this through `react-grab` prompt mode.

#### 4d. Pin rendering

Render pins from `annotations` using stored viewer-relative positions.

Recommended behavior:

- show numbered pins
- title/tooltip uses the comment text
- clicking a pin can remove the annotation or highlight it in a future refinement

### 5. Future Chat shell wiring

**File:** `components/projects/future-chat/components/future-chat-shell.tsx`

Add annotation state:

```tsx
const [cursorMode, setCursorMode] = useState(false);
const artifactContentRef = useRef<HTMLDivElement | null>(null);

const annotationState = useArtifactAnnotations({
	active:
		cursorMode &&
		isArtifactOpen &&
		chat.artifactMode === "preview" &&
		process.env.NODE_ENV === "development",
	documentId: workspaceDocument?.id ?? null,
	documentKind: workspaceDocument?.kind ?? null,
	documentVersionId: selectedDocumentVersion?.id ?? null,
	containerRef: artifactContentRef,
});
```

#### 5a. Clear state on artifact lifecycle changes

Add explicit effects to:

- disable cursor mode when the artifact closes
- clear annotations when `workspaceDocument?.id` changes
- clear annotations when `selectedDocumentVersion?.id` changes
- clear annotations and disable cursor mode when `chat.artifactMode !== "preview"`

#### 5b. Pass props to artifact panel

Pass:

- `contentRef`
- `annotations`
- `cursorMode`
- `pendingSelection`
- `onAddComment`
- `onDismissSelection`
- `onRemoveAnnotation`

### 6. Realtime voice integration

This is the other main correction from the previous draft.

#### 6a. `use-realtime-voice.ts`

Extend the hook options:

```ts
export interface UseRealtimeVoiceOptions {
	onDelegateToRovo: (request: DelegationRequest) => void;
	onSpeechStarted?: () => void;
	chatMessages: RovoUIMessage[];
	isGenerating?: boolean;
}
```

In the `"speech_started"` server-message case:

- keep the existing playback interruption behavior
- then call `onSpeechStarted?.()`

Also extend the inject context types:

```ts
type RealtimeContextType =
	| "thread_context"
	| "artifact_complete"
	| "thread_message"
	| "artifact_annotations";
```

This fixes the previous draft’s missing API surface.

#### 6b. Flush annotation context on speech start

In `FutureChatShell`, pass:

```tsx
onSpeechStarted: useCallback(() => {
	if (!annotationState.annotations.length) {
		return;
	}

	realtime.injectContext({
		type: "artifact_annotations",
		content: annotationState.formatContextForVoice(),
	});
}, [annotationState, realtime]),
```

#### 6c. Include annotations in `submitPrompt()`

For non-steer delegations, append formatted annotation context to `contextDescription` before calling `submitPrompt()`.

#### 6d. Include annotations in `applyVoiceSteer()`

This was missing in the previous draft.

`applyVoiceSteer()` currently only accepts `{ text }`. Extend it to:

```ts
applyVoiceSteer: (payload: {
	text: string;
	contextDescription?: string;
}) => Promise<void>;
```

Inside `use-future-chat.ts`, add `contextDescription` to the existing `sendMessage` body alongside the steering fields:

```ts
void sendMessage(
	{ text: trimmedText, files: [] },
	{
		body: {
			id: threadId,
			contextDescription: payload.contextDescription,
			artifactSteering: {
				preferCurrentArtifact: true,
				source: "voice",
			} satisfies FutureChatArtifactSteeringPayload,
			artifactContext: checkpointDocument
				? buildArtifactContextPayload(
					checkpointDocument,
					getLatestDocumentContent(checkpointDocument),
				)
				: undefined,
		},
	},
);
```

Note: `contextDescription` sits as a top-level body key next to `artifactSteering` and `artifactContext` — this mirrors how `submitPrompt()` already passes it. The backend server route reads `contextDescription` from the body and forwards it to the AI provider.

This ensures annotation context survives **active artifact steering**, not just fresh prompt submission.

### 7. Voice bar UI

**File:** `components/projects/future-chat/components/realtime-voice-bar.tsx`

Add:

```ts
annotationCount?: number;
annotationPreview?: string[];
```

Render:

- a compact badge when count > 0
- optionally the latest 1-2 annotation comments in tiny text when space allows

Keep it secondary to transcript/status UI.

### 8. Server context protocol cleanup

**File:** `backend/lib/openai-realtime.js`

This plan must normalize the context types instead of only appending a prompt string.

**Prerequisite bug fix:** `thread_context` is already sent by the client (`use-realtime-voice.ts` line 511) but the backend `_handleContextInject()` switch statement only matches `artifact_complete`, `thread_message`, and `initial_context`. The `thread_context` case falls through to the default branch and is silently logged and dropped. This means thread context injection has **never actually worked** in realtime voice. Fix this first — it is a pre-existing bug independent of annotations.

#### 8a. Update allowed context types

Handle all of the following in `_handleContextInject()`:

- `initial_context` (already handled today — preserve this case)
- `thread_context` (sent by client today but currently dropped — **bug fix**)
- `artifact_complete` (already handled today)
- `thread_message` (already handled today)
- `artifact_annotations` (new)

#### 8b. System instructions

Append concise instruction text:

```txt
When artifact annotations are provided as system context, treat them as viewer-selected notes from the user.
Reference annotation numbers when helpful.
Use the annotation text together with the artifact context and the user’s spoken request.
If steering an active artifact, preserve the annotation intent while applying the new changes.
```

Keep it short. The important behavior change is protocol support, not a long prompt expansion.

### 9. Testing

Because the repo does not have a general frontend test harness, move as much logic as possible into pure helpers and cover that with JS tests.

#### 9a. Frontend helper tests

Create `components/projects/future-chat/lib/future-chat-artifact-annotations.test.js` covering:

- ring buffer trims to 20 items
- annotation indices are re-numbered after deletion
- voice context serialization includes kind-specific anchor details
- `buildVoiceContextDescription()` appends cleanly to existing voice context

#### 9b. Backend tests

Create `backend/lib/openai-realtime.test.js` covering:

- `initial_context` is accepted and injected as a system message
- `thread_context` is accepted and injected as a system message (regression for the pre-existing bug fix)
- `artifact_annotations` is accepted and injected as a system message
- unknown context types still log and no-op

#### 9c. Manual validation

1. Run `pnpm run lint`
2. Run `pnpm tsc --noEmit`
3. Open a Future Chat artifact in development
4. Enable `Annotate`
5. Click text/code/image viewer elements and add comments
6. Verify pins appear and remain aligned while scrolling
7. Change artifact version and confirm annotations clear
8. Start realtime voice and speak a follow-up
9. Verify annotation context is injected on `speech_started`
10. Trigger both paths:
    - no active generation → `submitPrompt()`
    - active artifact generation → `applyVoiceSteer()`
11. Verify both flows include annotation context

## Final Notes

This revised plan deliberately aligns with how `react-grab` actually works and how Future Chat actually renders artifacts today.

If we later add a live app preview inside the artifact panel, we can reuse the same hook and voice plumbing, but we should create a separate Phase 2 plan for that surface instead of overloading this one.
