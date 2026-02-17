---
name: vpk-component
description: Enrich shadcn components with ADS visual styling (state tokens, interaction feedback,
  semantic colors) while preserving all existing shadcn conventions (prop names, variant values,
  size values, sub-component names). Creates mapping tables, example demos, and doc site wiring.
  This skill should be used when the user asks to
  "map ADS to VPK", "ADS to shadcn", "ADS equivalent", "what's the VPK version of",
  "enrich component", "add ADS states", "add hover/active/disabled states",
  "add component demos", "create component examples", "document component mapping",
  "migrate from ADS", "how does [X] map to VPK", "what's the shadcn equivalent of [X]",
  "style component with ADS tokens", "which ADS component is [X] based on",
  or references an ADS component name and wants to see how it maps to VPK.
argument-hint: "[ADS component name]"
prerequisites:
  files: [.cursor/skills/vpk-design/references/tokens.md]
produces: []
---

# VPK Component Visual Enrichment

Enrich a shadcn component with ADS visual styling — state tokens, interaction feedback, and semantic colors — while preserving the existing shadcn API surface (prop names, variant names, size names, sub-component names, export patterns). Produce mapping tables, create example demos, and wire them into the doc site.

**Foundational rule:** This skill only changes **visual and interaction styling**. All shadcn/Radix conventions are preserved:
- **Prop names stay as-is:** `variant`, `size`, `disabled`, `className`, etc. — never rename to ADS equivalents (`appearance`, `isDisabled`, `spacing`)
- **No-equivalent components still use shadcn names:** if there is no direct shadcn UI equivalent (for example `Tag`), map ADS concepts to shadcn-style prop names (`appearance` → `variant`, `spacing` → `size`, `isDisabled` → `disabled`)
- **Variant values stay as-is:** `default`, `secondary`, `destructive`, `outline`, `ghost`, `link` — never rename to ADS equivalents (`primary`, `subtle`, `danger`)
- **Size values stay as-is:** `sm`, `md`, `lg`, `icon` — never rename to unabbreviated ADS equivalents (`small`, `medium`, `large`)
- **Sub-component names stay as-is:** `DialogHeader`, `TabsTrigger`, `SelectItem` — never rename to ADS equivalents (`ModalHeader`, `Tab`, `Option`)
- **Export patterns stay as-is:** preserve existing named exports, default exports, and `forwardRef` usage
- New variants (e.g., `warning`, `discovery`) may be **added** using names consistent with the existing component's naming pattern

**Gold standard:** `components/ui/button.tsx` — completed enrichment with all states, 8 variants, `isLoading`, and exported Props interface.

For the canonical ADS-to-shadcn prop-name mapping, see `references/common-mappings.md` § "Canonical Prop Naming".

## Quick Start

```
/vpk-component button        # Map ADS Button → VPK Button
/vpk-component modal-dialog  # Map ADS ModalDialog → VPK Dialog
/vpk-component tabs          # Map ADS Tabs → VPK Tabs
/vpk-component toggle        # Map + enrich ADS Toggle → VPK Switch
/vpk-component radio         # Map ADS Radio → VPK RadioGroup
```

---

## Workflow

### Phase 1 — Research

Gather the ADS component's visual specs and identify the target shadcn component.

1. **ADS visual reference** — Use `ads_get_components` or `ads_plan` to understand the ADS component's visual states, colors, and interaction patterns. Focus on **styling information only** — ignore ADS prop/variant naming.
2. **shadcn source** — Use `search_items_in_registries` / `view_items_in_registries` to understand the shadcn component's existing API surface. This API is the source of truth for naming.
3. **Library docs** — Use `resolve-library-id` + `query-docs` (context7) for latest library docs if needed.
4. **VPK source** — Read the existing VPK component:
   - UI: `components/ui/[slug].tsx`
   - AI: `components/ui-ai/[slug].tsx`
5. **Visual specs (mandatory)** — Extract exact computed styles from the ADS component via Playwright `browser_evaluate` on the live `atlassian.design` examples page. **Never guess values from token name lookups** — token names like `radius.small` do not reliably map to computed pixel values. See `references/visual-spec-extraction.md` for the full methodology (Playwright computed styles, inner layout extraction, typography parity). For container/layout components (ButtonGroup, FieldGroup, etc.), also extract parent-level properties: `gap`, `display`, `flexDirection`, `alignItems`.
6. **Identity gate (required)** — Confirm which shadcn component maps to the ADS component:
   - ADS Toggle (`@atlaskit/toggle`) maps to VPK `Switch` (`components/ui/switch.tsx`)
   - VPK `Toggle` (`components/ui/toggle.tsx`) is a pressed toolbar button pattern, not ADS Toggle
   - ADS InlineDialog (`@atlaskit/inline-dialog`) maps to VPK `HoverCard` (`components/ui/hover-card.tsx`) — not a separate `inline-dialog` component
   - ADS InlineMessage (`@atlaskit/inline-message`) is covered by VPK `Alert` (component) and `HoverCard` (demos) — not a separate `inline-message` component
7. **No-equivalent gate (required)** — If there is no direct shadcn component, choose the closest shadcn/Radix API shape and enforce the canonical prop-name mapping from `references/common-mappings.md`.

**Scope reminder:** The ADS research is for **visual styling data** (colors, radii, spacing, state tokens). The existing shadcn prop names, variant names, and size names are never replaced. For no-equivalent components, normalize API naming to shadcn conventions using the canonical mapping table.

> MCP tools (`ads_*`, `search_items_in_registries`, etc.) require configured MCP servers. If unavailable, manually consult ADS docs at atlassian.design and the shadcn registry.

### Phase 2 — Audit & Mapping

#### 2a. Audit the VPK Component

Read the component source and fill in the **visual styling** audit template. The API columns (prop names, variant names, size names) are read-only — they document what exists but must not be changed.

| Aspect | Current (preserve) | Visual Styling Needed |
|---|---|---|
| Styling approach | CVA / data-attr / plain classes | — |
| Variant names | [list current — **keep as-is**] | — |
| Size names | [list current — **keep as-is**] | — |
| Prop names | [list current — **keep as-is**] | — |
| `hover:` classes | yes/no per variant | yes (with ADS tokens) |
| `active:` classes | yes/no per variant | yes (with ADS tokens) |
| `disabled:` classes | global opacity-50 / per-variant | per-variant bold/subtle pattern |
| `focus-visible:` | yes/no | yes (standard ring) |
| `aria-pressed:` styling | yes/no | if toggleable |
| `aria-invalid:` styling | yes/no | if form input |
| `isLoading` visual | yes/no | if interactive action trigger |
| Props interface | name or inline | `Readonly<ComponentProps>` |
| Demos | [list existing] | [list needed] |

**Common pre-enrichment visual gaps:**

| Pattern | Problem |
|---|---|
| `hover:bg-primary/80` | Opacity instead of ADS token — use `hover:bg-primary-hovered` |
| `hover:bg-muted` | Generic — use `hover:bg-bg-neutral-subtle-hovered` |
| `disabled:opacity-50` | Hardcoded — use `opacity-(--opacity-disabled)` or bold pattern |
| Inline type annotation | Should be named `[Component]Props` interface |
| No `active:` states | Missing pressed visual feedback |
| `rounded-lg` assumed without verification | Always extract computed `borderRadius` from ADS — e.g., ADS Button uses 6px (`rounded-md`), not 8px (`rounded-lg`) |

#### 2b. Produce Visual Styling Map

For styling guidance, refer to `.cursor/skills/vpk-design/references/tokens.md` for the complete semantic token reference.

**API preservation rule:** The mapping tables below are for **documentation purposes only** — to record which ADS concept maps to which existing shadcn name. They do **not** authorize renaming shadcn props/variants/sizes.

**Variant Styling Map:**

Map each existing shadcn variant to its ADS visual equivalent, then apply ADS state tokens to that variant's classes:

| shadcn Variant (keep) | ADS Visual Equivalent | Action |
|---|---|---|
| `default` | `primary` | Add ADS state tokens |
| `ghost` | `subtle` | Add ADS state tokens |
| — | `warning` | **NEW** — add variant using shadcn naming pattern |

When adding new variants, use names consistent with the component's existing convention (e.g., if the component uses `destructive`, add `warning` and `discovery` — not `danger`).

**Sub-component Reference (read-only, if applicable):**

| ADS Sub-component | shadcn Sub-component (keep) |
|---|---|
| `ModalHeader` | `DialogHeader` |

Document any visual gaps with workarounds.

#### 2c. Identity & Metadata Lock (required)

Before coding, lock these docs/nav rules so ADS mapping is consistent:

1. If implementing ADS Toggle parity, update `switch` docs/metadata (not `toggle`):
   - `app/data/details/ui.ts` `switch.adsUrl = "https://atlassian.design/components/toggle"`
   - `app/data/ads-equivalents.ts` `switch: "@atlaskit/toggle"`
2. Ensure `toggle` has no ADS Toggle mapping:
   - No `toggle` entry pointing to `@atlaskit/toggle` in `app/data/ads-equivalents.ts`
   - No ADS Toggle URL on `toggle` detail entry in `app/data/details/ui.ts`
3. Verify doc hero behavior after metadata updates:
   - `/components/ui/switch` shows `@atlaskit/toggle` under the header
   - `/components/ui/toggle` does not show ADS Toggle package/link

### Phase 3 — Enrich Component

Apply ADS visual states and tokens to the existing shadcn component's CSS classes. **Do not change any prop names, variant values, size values, or sub-component names.** Only modify the Tailwind class strings within the CVA variants or className expressions. Follow the decision trees below, then use the token cheat sheet for correct class values.

#### State Attribute Source of Truth (required)

Do not guess state selectors. Confirm the rendered data attributes from the primitive API (or runtime DOM) before styling:

- Base UI `Toggle` uses `data-pressed` (not `data-[state=on]`)
- Base UI `Switch` uses `data-checked` / `data-unchecked`
- Base UI `Radio` uses `data-checked` / `data-unchecked` (plus `data-invalid`, `data-disabled`, `data-required`)
- If uncertain, inspect Base UI type docs in `node_modules` (e.g., `ToggleDataAttributes.d.ts`) or inspect the live DOM

This prevents silent visual regressions where controlled state updates correctly but styles never apply.

#### Decision Trees

**Does this component need `isLoading`?**
- **Yes:** Button, Select trigger — they initiate async actions
- **No:** Badge, Skeleton, Progress, Spinner, Avatar, Tooltip — display-only
- **No:** Checkbox, Radio, Switch, Toggle — synchronous state toggles
- **No:** Input, Textarea — they receive input, don't trigger actions

**Does this component need `aria-pressed` / selected state?**
- **Yes:** Button (as toggle), Toggle, ToggleGroup
- **No (own mechanism):** Checkbox/Switch (`data-checked:`), Tabs (`data-active:`), Radio (`data-checked:`)
- **No:** Badge, Alert, Progress, Input, Textarea — not toggleable

**Bold vs subtle disabled?**
- **Bold** (filled bg like primary, warning, discovery) → `disabled:bg-bg-disabled disabled:text-text-disabled`
- **Subtle** (transparent/bordered bg like ghost, outline, link) → `disabled:opacity-(--opacity-disabled)`
- **All** get `disabled:pointer-events-none`

**Does this component need new variants?**
- **Yes if** ADS has visual appearances without a shadcn equivalent (e.g., `warning`, `discovery`) — add using the component's existing naming convention
- **No:** Checkbox, Radio, Switch, Spinner — single appearance in ADS
- **Naming rule:** New variant names must follow the component's existing pattern. If existing variants are `default`, `destructive`, `outline`, `ghost`, then new variants use the same style (e.g., `warning`, `discovery` — not ADS names like `subtle`, `primary`)

#### VPK Icon Wrapper (Required)

**Always wrap atlaskit icons in the VPK `<Icon>` component** (`components/ui/icon.tsx`). Never render atlaskit icons directly as raw `<IconName />` or inside plain `<span>` wrappers.

```tsx
// Correct — use VPK Icon wrapper
import { Icon } from "@/components/ui/icon"
import SearchIcon from "@atlaskit/icon/core/search"

<Icon render={<SearchIcon label="" />} label="Search" className="text-icon" />
```

The VPK `<Icon>` wrapper provides `data-slot="icon"`, `role="img"` + `aria-label`, flex centering, and Tailwind color class support.

#### Atlaskit Icon Sizing

Atlaskit new core icons render their own SVG with fixed internal dimensions. The `size` prop must be passed **directly to the icon component**, not to a parent wrapper.

```tsx
// Correct — size on the icon itself
<Icon render={<SearchIcon label="" size="small" />} label="Search" />

// Wrong — className on the wrapper does not resize the SVG
<Icon render={<SearchIcon label="" />} label="Search" className="size-3" />
```

#### ADS Toggle Geometry Lock (Required for `switch`)

When mapping ADS Toggle (`@atlaskit/toggle`) to VPK `Switch`, lock both icon identity and geometry. This component is easy to make visually incorrect even when tokens/states are otherwise correct.

- Icon identity is fixed:
  - Checked icon: `@atlaskit/icon/core/check-mark`
  - Unchecked icon: `@atlaskit/icon/core/cross`
  - Both icons use `size="small"` on the icon element itself
  - Both icons are wrapped with VPK `<Icon>`
- Geometry is fixed to ADS proportions:
  - ADS regular/default track content area is 32x16
  - ADS large track content area is 40x20
  - ADS regular/default thumb is 12px
  - ADS large thumb is 16px
  - Icon container inset is 3px from left/right edges
- Keep ADS layout characteristics:
  - Root uses content-box layout with explicit border + inner padding
  - Do not scale the default thumb to 20px (`size-5`) or it will overlap/mask icons
- Validate both states visually:
  - Checked (left icon visible) and unchecked (right icon visible)
  - Ensure icon remains legible and thumb does not collide with icon in either state

#### Sonner/ADS Flag Mapping Guardrails (Required for `sonner`)

When mapping ADS Flag patterns to `components/ui/sonner.tsx`, use headless Sonner with fully custom JSX and avoid wrapper-level styling conflicts.

- Keep Sonner headless for custom toast UI:
  - Use `toast.custom(...)` with a custom toast component (for example `SonnerToast`)
  - Set `toastOptions.unstyled = true` on `<Toaster />`
- Treat `SonnerToast` as normal component API:
  - Import `SonnerToast` before usage at each callsite
  - Keep variants on the custom component (`success`, `warning`, `error`, etc.), not on Sonner defaults
- Prevent multi-toaster demo stacking:
  - On pages that mount multiple demo `<Toaster />` instances, assign each toaster a unique `id`
  - Pass matching `toasterId` in every `toast.*`/`toast.custom` call so one action does not render through multiple toasters
- Debug harsh/doubled shadow correctly:
  - If shadow looks harsher than token previews, inspect Sonner wrapper `<li data-sonner-toast>` styles
  - Sonner applies an outer `:focus-visible` wrapper shadow even in headless flows; if it conflicts, neutralize it for `data-styled="false"` and keep the visual shadow on the custom toast surface only

#### Tile Shape

Tile and IconTile components use `rounded-tile` (maps to `--ds-radius-tile: 25%`) for their proportional rounded-square shape. Do not use fixed radius classes like `rounded-lg` on tiles.

#### Size-Dependent Child Constraints

When a component mode constrains child element sizes differently per size variant, use a lookup map of descendant selector classes:

```tsx
const INSET_CHILD_SIZES = {
	xxsmall: "[&_img]:size-2.5 [&_svg]:size-2.5",
	xsmall: "[&_img]:size-3 [&_svg]:size-3",
	small: "[&_img]:size-3.5 [&_svg]:size-3.5",
	medium: "[&_img]:size-4 [&_svg]:size-4",
	large: "[&_img]:size-5 [&_svg]:size-5",
	xlarge: "[&_img]:size-6 [&_svg]:size-6",
} as const satisfies Record<string, string>
```

#### Inner Gap Per Size Variant

ADS components with multiple inline children use size-dependent `gap` values. Include gap in CVA `size` variants unconditionally — `gap` only applies between siblings, so it's harmless with single children:

```tsx
const variants = cva("inline-flex items-center ...", {
	variants: {
		size: {
			compact: "h-5 px-1 py-0.5 rounded-sm text-xs gap-1 [&_svg]:size-3",
			spacious: "h-8 px-3 py-1 rounded-md text-sm gap-1.5 [&_svg]:size-4",
		},
	},
})
```

#### State Classes Per Variant

For each variant, add state classes using ADS token triplets (rest → hovered → pressed). For interactive state token triplets and selected state selectors, see `.cursor/skills/vpk-design/references/tokens.md`.

**Bold variant example (Button `default`):**
```
bg-primary                              ← rest
hover:bg-primary-hovered               ← hover
active:bg-primary-pressed              ← pressed
disabled:bg-bg-disabled                ← disabled bg (bold pattern)
disabled:text-text-disabled            ← disabled text (bold pattern)
```

**Subtle variant example (Button `ghost`):**
```
hover:bg-bg-neutral-subtle-hovered     ← hover
active:bg-bg-neutral-subtle-pressed    ← pressed
disabled:opacity-(--opacity-disabled)  ← disabled (subtle — opacity)
```

#### Selected & Expanded State Consistency (Required)

All button variants use **the same** selected/expanded state visual — regardless of whether the variant is bold or subtle. Do not vary selected styling per variant.

```
aria-pressed:bg-bg-selected aria-pressed:text-text-selected aria-pressed:border-border-selected
aria-expanded:bg-bg-selected aria-expanded:text-text-selected aria-expanded:border-border-selected
```

Common mistakes:
- Using `aria-pressed:bg-bg-selected-bold aria-pressed:text-primary-foreground` on bold variants (default, warning, discovery) — wrong, use `bg-bg-selected` like all other variants
- Using `aria-expanded:bg-primary-pressed` or `aria-expanded:bg-muted` — wrong, `aria-expanded` should match `aria-pressed` (the selected state visual)
- Missing `border-border-selected` on some variants — all variants need the selected border

#### Overlay Elevation Shadow (Required for popup components)

All overlay/popup components must use ADS elevation overlay shadow (`shadow-xl`) with **no border ring**. The `shadow-xl` class maps to `var(--ds-shadow-overlay)` + perimeter and already provides a subtle edge — an additional `ring-1` creates a visible double-border.

Applies to: `dropdown-menu`, `popover`, `context-menu`, `menubar`, `combobox`, `select`, `hover-card`.

```
shadow-xl        ← correct (ADS elevation.shadow.overlay + perimeter)
```

Common mistakes:
- `ring-foreground/10 shadow-md ring-1` — wrong, visible border + weak shadow
- `ring-border shadow-lg ring-1` — wrong, visible border
- `shadow-md` or `shadow-lg` alone — wrong shadow level for overlays

#### Loading State Pattern (if applicable)

```tsx
interface ComponentProps extends PrimitiveProps, VariantProps<typeof variants> {
  isLoading?: boolean
}

function Component({
  isLoading = false,
  children,
  ...props
}: Readonly<ComponentProps>) {
  return (
    <Primitive
      aria-busy={isLoading || undefined}
      className={cn(
        variants({ variant, size }),
        isLoading && "pointer-events-none opacity-(--opacity-loading)",
        className
      )}
      {...props}
    >
      {isLoading && <Spinner />}
      {children}
    </Primitive>
  )
}
```

#### Focus Ring Pattern (all components)

```
focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3
```

#### Invalid State Pattern (form inputs only)

Support both `aria-invalid` (HTML attribute) and `data-invalid` (Base UI Field attribute):

```
aria-invalid:ring-destructive/20 aria-invalid:border-destructive aria-invalid:ring-3
data-invalid:ring-destructive/20 data-invalid:border-destructive data-invalid:ring-3
```

#### TypeScript Interface

Every enriched component must have a named, exported Props interface:

```tsx
interface ComponentNameProps
  extends PrimitiveName.Props,
    VariantProps<typeof componentVariants> {
  isLoading?: boolean  // if applicable
}

function ComponentName({
  className,
  variant = "default",
  ...props
}: Readonly<ComponentNameProps>) {
  // ...
}

export { ComponentName, componentVariants, type ComponentNameProps }
```

### Phase 4 — Examples

Create demo files demonstrating each key variant/feature.

**ADS example structure rule (required):** When a VPK component maps to an ADS component, fetch or review the ADS documentation examples page for that component and **mirror its example structure** — use the same demo titles, grouping, and content patterns. Demo names should match ADS examples (e.g., "Default", "Menu structure", "Button item", "Density", "Loading"), not be invented from the component API surface (e.g., "With icons", "With descriptions", "Compact spacing"). This ensures VPK demos serve as a recognizable reference for developers familiar with ADS.

**Two demo types exist:**
- **Overview demo** — Single file `components/website/demos/ui/[slug]-demo.tsx`, registered in `UI_DEMO` / `UI_AI_DEMO`. Shows the component's primary use case. Should already exist.
- **Variant demos** — Per-variant files in `components/website/demos/ui/[slug]/[slug]-demo-*.tsx`, registered in `UI_VARIANT_DEMOS` / `UI_AI_VARIANT_DEMOS`. Show individual variants and features.

This skill creates **variant demos**.

#### Required Demos Per Enriched Component

| Demo | When to Create |
|---|---|
| `[slug]-demo-variants.tsx` | Component has multiple variants |
| `[slug]-demo-disabled.tsx` | Component has disabled state |
| `[slug]-demo-loading.tsx` | Component has `isLoading` prop |
| `[slug]-demo-selected.tsx` | Component is toggleable |
| `[slug]-demo-sizes.tsx` | Component has size variants |

#### File Structure

```
components/website/demos/ui/[slug]/        # or ai/[slug]/
├── [slug]-demo-default.tsx
├── [slug]-demo-variants.tsx
├── [slug]-demo-disabled.tsx
├── [slug]-demo-loading.tsx             # if applicable
├── [slug]-demo-selected.tsx            # if applicable
└── ...
```

#### Demo File Template

```tsx
"use client";

import { Component } from "@/components/ui/[slug]";

export default function ComponentDemoDescriptor() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			{/* Variants/states side by side */}
		</div>
	);
}
```

Rules:
- `"use client"` directive at top
- Named exports with function name `[Component]Demo[Descriptor]` (e.g. `SearchDemoDefault`, `SearchDemoControlled`)
- Keep each example minimal — show one concept per export
- Use `@atlaskit/icon/core/*` for icon examples, always wrapped in VPK `<Icon>` component
- Use Tailwind semantic icon color classes (`text-icon-success`, `text-icon-warning`, `text-icon-danger`, `text-icon-information`) — never raw `color` prop on atlaskit icons
- Use VPK `<Link>` component for text link triggers — it handles underline-on-hover natively, never add static `underline` classes

For demo registration, metadata wiring, ADS equivalents setup, and component consolidation procedures, see `references/demo-wiring.md`.

### Phase 5 — Validation

1. Run `pnpm run lint` — fix all ESLint errors (0 new errors)
2. Run `pnpm tsc --noEmit` — fix all TypeScript errors in modified files
3. Verify the page renders at `/components/ui/[slug]` (or `/components/ai/[slug]`)
4. Verify left-nav ADS indicator behavior for mapped components:
   - Purple `ADS` badge appears next to the component entry in `WebsiteSidebarNav`
   - ADS-only filter still includes the component
5. Pre-existing errors in unrelated files can be ignored
6. **API preservation check (required)** — Verify no prop names, variant values, size values, or sub-component names were changed. Search the codebase for all usages of the modified component and confirm they still work without modification. Run `pnpm tsc --noEmit` to catch any breakage. If any consumer needs updating, the enrichment introduced an API change — revert the API change and keep only the visual styling changes.
7. **Typography parity check (required for text-bearing components)** — Compare local rendering against the `atlassian.design` example and computed typography values (`fontSize`, `lineHeight`, `fontWeight`). If local text appears larger/smaller, adjust classes to match ADS.

#### Migration Safety Gates (only needed if new variants were added)

1. **Consumer import audit** — run `rg` over `components` and `app` for component imports.
2. **Noisy baseline fallback**:
   - Run global lint: `pnpm run lint`
   - If global lint fails for unrelated baseline issues, run changed-file lint:
     - `pnpm exec eslint <changed-file-1> <changed-file-2> ...`
   - Still require `pnpm tsc --noEmit`
3. **Scoped runtime + a11y checks (required for UI behavior changes)**:
   - Verify affected route(s) in browser snapshots
   - Run code-level and localhost a11y checks
   - Classify findings as either regression or pre-existing/tooling noise

---

## Patterns and Anti-Patterns

Essential rules are listed below. For the complete tables (45+ entries), see `references/patterns-anti-patterns.md`.

### Do

| Pattern | Example |
|---|---|
| Use ADS hovered/pressed tokens | `hover:bg-primary-hovered` |
| Use ADS opacity tokens | `disabled:opacity-(--opacity-disabled)` |
| Use `aria-busy` for loading | `aria-busy={isLoading \|\| undefined}` |
| Export named Props interface | `export { Component, type ComponentProps }` |
| Include `pointer-events-none` with disabled AND loading | Always pair with interaction prevention |
| Use `data-slot` on root element | `data-slot="button"` |
| Use VPK `Icon` wrapper with Tailwind color classes | `<Icon render={<StatusSuccessIcon label="" />} className="text-icon-success" />` |
| Include gap in CVA size variants unconditionally | `gap` only applies between siblings — no conditional logic needed |
| Use same selected state across all variants | `aria-pressed:bg-bg-selected aria-pressed:text-text-selected aria-pressed:border-border-selected` |
| Use `shadow-xl` on all overlay popups | Maps to ADS `elevation.shadow.overlay` + perimeter |

### Do Not

| Anti-Pattern | Correct Alternative |
|---|---|
| Renaming shadcn props to ADS names (`variant` → `appearance`) | **Keep existing shadcn prop names** |
| Renaming shadcn variant values (`destructive` → `danger`) | **Keep existing shadcn variant values** |
| Renaming shadcn size values (`sm` → `small`) | **Keep existing shadcn size values** |
| Renaming sub-components (`DialogHeader` → `ModalHeader`) | **Keep existing shadcn sub-component names** |
| `hover:bg-primary/80` | `hover:bg-primary-hovered` |
| `disabled:opacity-50` | `disabled:opacity-(--opacity-disabled)` or bold pattern |
| `hover:bg-muted` for ghost/subtle variants | `hover:bg-bg-neutral-subtle-hovered` |
| Mapping ADS Toggle to VPK `Toggle` | Map ADS Toggle to VPK `Switch` |
| Triggering toasts without toaster scoping on multi-demo docs pages | Give each `<Toaster />` a unique `id` and pass matching `toasterId` in `toast.*` calls |
| Assuming harsh Sonner shadows come only from `shadow-*` token choice | Inspect/neutralize Sonner wrapper `li[data-sonner-toast]:focus-visible` shadow in headless mode (`data-styled="false"`) |
| `aria-pressed:bg-bg-selected-bold` on bold variants | Use `bg-bg-selected` uniformly — all variants share the same selected visual |
| `aria-expanded:bg-primary-pressed` or `aria-expanded:bg-muted` | Use `aria-expanded:bg-bg-selected aria-expanded:text-text-selected aria-expanded:border-border-selected` |
| `ring-foreground/10 shadow-md ring-1` on overlay popups | Use `shadow-xl` only — no `ring-1` border |

---

## Common Mapping Reference

See `references/common-mappings.md` for pre-built mapping tables covering Button, Dialog, Tabs, Select, Checkbox, Toggle, Icon, and Avatar.

---

## MCP Tool Reference

| Tool | Purpose |
|---|---|
| `ads_get_components` | List all ADS components |
| `ads_plan` | Search component docs, props, tokens, icons |
| `ads_get_all_tokens` | Look up design token names |
| `ads_get_all_icons` | Find icon names for examples |
| `search_items_in_registries` | Find shadcn component |
| `view_items_in_registries` | Get shadcn component details |
| `get_item_examples_from_registries` | Get shadcn example code |
| `resolve-library-id` + `query-docs` | Fetch library docs via context7 |
| `browser_navigate` | Navigate Playwright to `atlassian.design/components/[name]/examples` for computed style extraction |
| `browser_evaluate` | Run `getComputedStyle()` to extract visual specs from rendered ADS components |

---

## File Reference

| File | Role |
|---|---|
| `components/ui/[slug].tsx` | VPK UI component source |
| `components/ui-ai/[slug].tsx` | VPK AI component source |
| `components/website/registry.ts` | Register variant demos |
| `app/data/details/ui.ts` | UI component detail entries |
| `app/data/details/ai.ts` | AI component detail entries |
| `app/data/component-detail-types.ts` | `ExampleDefinition` type |
| `app/data/ads-equivalents.ts` | ADS package mapping + `getAdsDisplayInfo` helper |
| `components/website/demos/ui/button/` | Gold standard demo pattern |

---

## Checklist (Essential)

For the full 35-item checklist, see `references/checklist-full.md`.

- [ ] ADS visual states researched and visual specs extracted via computed styles
- [ ] **Computed styles extracted from live `atlassian.design` page via Playwright** — never guessed from token names
- [ ] shadcn component identified, source read, audit template filled
- [ ] Each variant has rest, `hover:`, `active:`, `disabled:` states with ADS tokens
- [ ] Selected state (`aria-pressed` + `aria-expanded`) uses same visual across all variants: `bg-bg-selected text-text-selected border-border-selected`
- [ ] Overlay popups use `shadow-xl` with no `ring-1` border
- [ ] For ADS Toggle parity, Switch geometry lock verified (track/thumb/icon sizing and checked/unchecked visuals)
- [ ] Focus ring uses `focus-visible:border-ring ring-ring/50 ring-3`
- [ ] TypeScript interface named `[Component]Props`, exported, used as `Readonly<>`
- [ ] **No prop names, variant values, size values, or sub-component names were renamed**
- [ ] Demo files created, registered in registry, and examples added to detail entry
- [ ] `adsUrl` and ADS equivalents entry set
- [ ] `pnpm run lint` passes (0 new errors)
- [ ] `pnpm tsc --noEmit` passes (0 new errors)
