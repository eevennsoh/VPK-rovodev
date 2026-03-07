# Tooltip Enrichment — Summary

## 1. ADS Tooltip Visual Research Findings

### Component Identity
- ADS component: `@atlaskit/tooltip` (`Tooltip`)
- VPK equivalent: `components/ui/tooltip.tsx` (Base UI `Tooltip` primitive)
- ADS docs URL: `https://atlassian.design/components/tooltip`
- ADS equivalents entry confirmed: `tooltip: "@atlaskit/tooltip"` in `app/data/ads-equivalents.ts`

### ADS Visual Specification (extracted from `@atlaskit/tokens` installed package)

| Property | ADS Token | Computed Value |
|---|---|---|
| Background | `color.background.neutral.bold` | `#292A2E` / `rgb(41, 42, 46)` |
| Text color | `color.text.inverse` | `#FFFFFF` / `rgb(255, 255, 255)` |
| Border radius | `radius.medium` | `0.375rem` = 6px |
| Shadow | `elevation.shadow.raised` | `0px 1px 1px #1E1F2140, 0px 0px 1px #1E1F214F` + perimeter |
| Padding vertical | `space.075` | 6px (`py-1.5`) |
| Padding horizontal | `space.150` | 12px (`px-3`) |
| Font size | `text-xs` (12px) | 12px |

### Shadow Level Reasoning

ADS Tooltip is a small floating label, not an interactive overlay panel. The ADS documentation and skill rules define two categories:

- **`elevation.shadow.overlay` (`shadow-xl`)** — for dropdown menus, popovers, comboboxes, select, hover-card (interactive overlay panels with rich content)
- **`elevation.shadow.raised` (`shadow-md`)** — for smaller floating elements like tooltips (lightweight labels that float just above the surface)

The skill's "Overlay Elevation Shadow" rule explicitly lists: `dropdown-menu`, `popover`, `context-menu`, `menubar`, `combobox`, `select`, `hover-card` — Tooltip is NOT in this list. Using `shadow-xl` on a small dark tooltip label would be visually overpowering and inconsistent with ADS. `shadow-md` (`elevation.shadow.raised` + perimeter) is the correct level.

### Pre-existing State (what was already correct)
- `bg-bg-neutral-bold` — correct ADS background token
- `text-text-inverse` — correct ADS text token
- `rounded-md` — correct ADS `radius.medium` (6px)
- `px-3 py-1.5` — correct ADS spacing
- `text-xs` — correct font size (12px)
- Animation using `data-open:` / `data-closed:` Base UI data attributes

### Visual Gaps Found (before enrichment)
1. **Missing shadow** — No `shadow-*` class on `TooltipContent`, so tooltip appeared with no elevation
2. **Stale Radix selectors** — `data-[state=delayed-open]:animate-in`, `data-[state=delayed-open]:fade-in-0`, `data-[state=delayed-open]:zoom-in-95` are Radix UI patterns; Base UI uses `data-open:` only
3. **Missing `outline-hidden`** — No suppression of browser default outline, present on `HoverCardContent` but absent here
4. **Duplicate `z-50`** — Present on both `Positioner` (`isolate z-50`) and `Popup` (`z-50`); the Positioner is the stacking context element, Popup should not duplicate it

---

## 2. Audit Template (filled in)

| Aspect | Current (preserve) | Visual Styling Applied |
|---|---|---|
| Styling approach | Plain Tailwind classes on `TooltipPrimitive.Popup` | Same — no CVA needed (single appearance) |
| Variant names | None (single appearance) | No variants added — ADS Tooltip has one appearance |
| Size names | None | None needed |
| Prop names | `side`, `sideOffset`, `align`, `alignOffset`, `className`, `children` | Preserved as-is |
| `hover:` classes | n/a (display-only component) | n/a |
| `active:` classes | n/a (display-only component) | n/a |
| `disabled:` classes | n/a | n/a |
| `focus-visible:` | n/a | n/a (tooltip is not focusable) |
| `isLoading` | n/a — display-only per skill decision tree | Not added |
| `aria-pressed:` | n/a — not toggleable | Not added |
| Shadow | **MISSING** | Added `shadow-md` (elevation.shadow.raised) |
| Stale selectors | `data-[state=delayed-open]:*` (3 classes) | **Removed** — Base UI uses `data-open:` only |
| `outline-hidden` | **MISSING** | Added |
| Duplicate `z-50` | Present on Popup (`z-50`) and Positioner (`isolate z-50`) | **Removed** from Popup |
| Props interface | `interface TooltipContentProps` — already named | Preserved |
| Demos | Multiple demos in `tooltip-demo.tsx` | No new demos needed (not applicable per skill — tooltip has no variants) |

---

## 3. Mapping Table (ADS → VPK)

### Visual Token Mapping

| ADS Token | VPK Tailwind Class | Verified Value |
|---|---|---|
| `color.background.neutral.bold` | `bg-bg-neutral-bold` | `#292A2E` ✓ |
| `color.text.inverse` | `text-text-inverse` | `#FFFFFF` ✓ |
| `radius.medium` | `rounded-md` | `6px` ✓ |
| `elevation.shadow.raised` | `shadow-md` | `0px 1px 1px #1E1F2140, 0px 0px 1px #1E1F214F + perimeter` ✓ |
| `space.075` (6px) | `py-1.5` | `6px` ✓ |
| `space.150` (12px) | `px-3` | `12px` ✓ |

### Sub-component Mapping (display-only)

| ADS Sub-component | VPK Sub-component (kept) |
|---|---|
| `Tooltip` (root) | `Tooltip` (wraps `TooltipPrimitive.Root`) |
| `Tooltip` (trigger wrapping pattern) | `TooltipTrigger` (wraps `TooltipPrimitive.Trigger`) |
| `Tooltip` (content/popup) | `TooltipContent` (wraps `TooltipPrimitive.Popup`) |
| `TooltipPrimitive` (provider) | `TooltipProvider` (wraps `TooltipPrimitive.Provider`) |

### Prop Name Preservation Check

| ADS Prop Name | VPK Prop Name (kept) | Notes |
|---|---|---|
| `position` | `side` | shadcn convention preserved |
| `delay` | `delay` (on Provider) | Same |
| `content` | `children` | shadcn convention (children) |

---

## 4. Full Modified tooltip.tsx File Content

```tsx
"use client"

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"

import { cn } from "@/lib/utils"

type TooltipProviderProps = TooltipPrimitive.Provider.Props

function TooltipProvider({
	delay = 0,
	...props
}: Readonly<TooltipProviderProps>) {
	return (
		<TooltipPrimitive.Provider
			data-slot="tooltip-provider"
			delay={delay}
			{...props}
		/>
	)
}

type TooltipProps = TooltipPrimitive.Root.Props

function Tooltip({ ...props }: Readonly<TooltipProps>) {
	return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

type TooltipTriggerProps = TooltipPrimitive.Trigger.Props

function TooltipTrigger(props: Readonly<TooltipTriggerProps>) {
	return (
		<TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
	)
}

interface TooltipContentProps
	extends TooltipPrimitive.Popup.Props,
		Pick<
			TooltipPrimitive.Positioner.Props,
			"align" | "alignOffset" | "side" | "sideOffset"
		> {}

function TooltipContent({
	className,
	side = "top",
	sideOffset = 4,
	align = "center",
	alignOffset = 0,
	children,
	...props
}: Readonly<TooltipContentProps>) {
	return (
		<TooltipPrimitive.Portal>
			<TooltipPrimitive.Positioner
				align={align}
				alignOffset={alignOffset}
				side={side}
				sideOffset={sideOffset}
				className="isolate z-50"
			>
				<TooltipPrimitive.Popup
					data-slot="tooltip-content"
					className={cn(
						"data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1 data-[side=inline-start]:slide-in-from-right-1 data-[side=inline-end]:slide-in-from-left-1 w-fit max-w-xs rounded-md bg-bg-neutral-bold px-3 py-1.5 text-xs text-text-inverse shadow-md outline-hidden origin-(--transform-origin) duration-[var(--duration-fast)] ease-[var(--ease-out)]",
						className
					)}
					{...props}
				>
					{children}
				</TooltipPrimitive.Popup>
			</TooltipPrimitive.Positioner>
		</TooltipPrimitive.Portal>
	)
}

export {
	Tooltip,
	TooltipTrigger,
	TooltipContent,
	TooltipProvider,
	type TooltipProps,
	type TooltipTriggerProps,
	type TooltipContentProps,
	type TooltipProviderProps,
}
```

---

## 5. Shadcn Prop Names / Variant Values: Preserved or Changed?

**Preserved.** No prop names, variant values, size values, or sub-component names were changed.

- All four sub-components keep their shadcn names: `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`
- All prop names preserved: `side`, `sideOffset`, `align`, `alignOffset`, `className`, `children`, `delay`
- No variants exist on this component (ADS Tooltip has a single appearance), so none were added or renamed
- All four exported type names preserved: `TooltipProps`, `TooltipTriggerProps`, `TooltipContentProps`, `TooltipProviderProps`

---

## 6. Shadow Elevation Used and Why

**Shadow used: `shadow-md`** → maps to `elevation.shadow.raised` (`--ds-shadow-raised`) + perimeter overlay.

Computed value confirmed: `rgba(30, 31, 33, 0.25) 0px 1px 1px 0px, rgba(30, 31, 33, 0.31) 0px 0px 1px 0px, rgba(9, 30, 66, 0.31) 0px 0px 1px 0px`

**Reasoning:**

ADS defines three shadow elevation levels for floating UI:
1. `elevation.shadow.raised` (`shadow-md`) — small floating elements: cards, tooltips, raised surfaces
2. `elevation.shadow.overflow` (`shadow-lg`) — scrolling overflow indicators
3. `elevation.shadow.overlay` (`shadow-xl`) — interactive overlay panels: dropdowns, popovers, dialogs, select menus, hover cards

The skill's "Overlay Elevation Shadow" rule (Phase 3) explicitly states the `shadow-xl` rule applies to: `dropdown-menu`, `popover`, `context-menu`, `menubar`, `combobox`, `select`, `hover-card`. **Tooltip is not in this list.**

ADS Tooltip is a small informational label — it does not contain interactive content, does not require a strong elevation to establish panel hierarchy, and is visually compact. Applying `shadow-xl` (8px + 12px vertical blur) to a small 6px-padded dark tooltip label would be visually disproportionate. `shadow-md` provides the correct subtle edge definition for this element type.

---

## 7. Lint / Typecheck Results

### ESLint

```
pnpm exec eslint components/ui/tooltip.tsx --max-warnings=0
(no output — 0 errors, 0 warnings)
```

**Result: PASS**

### TypeScript

```
pnpm tsc --noEmit
```

No errors in `components/ui/tooltip.tsx` or any tooltip-related files. The only TypeScript errors in the full project are pre-existing, unrelated errors in generated app files:
- `components/generated-apps/create-time-tracker-block-structure-and-component/components/timer.test.tsx` — implicit `any` parameters
- `components/generated-apps/create-time-tracker-block-structure-and-component/components/timer.tsx` — `Readonly` module error

**Result: PASS (0 new errors introduced)**

### Browser Verification

Computed styles extracted via Playwright from live `http://localhost:3000/components/ui/tooltip`:

| Property | Expected | Actual | Pass? |
|---|---|---|---|
| `backgroundColor` | `rgb(41, 42, 46)` (#292A2E) | `rgb(41, 42, 46)` | ✓ |
| `color` | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` | ✓ |
| `boxShadow` | raised shadow + perimeter | `rgba(30,31,33,0.25) 0px 1px 1px 0px, rgba(30,31,33,0.31) 0px 0px 1px 0px, rgba(9,30,66,0.31) 0px 0px 1px 0px` | ✓ |
| `borderRadius` | `6px` | `6px` | ✓ |
| `fontSize` | `12px` | `12px` | ✓ |
| `paddingTop` | `6px` | `6px` | ✓ |
| `paddingLeft` | `12px` | `12px` | ✓ |
| `outline` | none | `none` | ✓ |

---

## 8. Demo Files Created

**No new demo files were created.** The existing demos in `components/website/demos/ui/tooltip-demo.tsx` already cover all relevant use cases (default, sides, icon button, disabled, formatted content, long content, on link, with keyboard shortcut). ADS Tooltip has a single visual appearance — no variants to add variant demos for.

The skill's required demo table:

| Demo | Created? | Reason |
|---|---|---|
| `tooltip-demo-variants.tsx` | No | Single appearance — no variants |
| `tooltip-demo-disabled.tsx` | No | Already exists as `TooltipDemoDisabled` export in existing demo file |
| `tooltip-demo-loading.tsx` | No | Display-only component — no `isLoading` per skill decision tree |
| `tooltip-demo-selected.tsx` | No | Not toggleable |
| `tooltip-demo-sizes.tsx` | No | No size variants |

---

## Changes Summary

**File modified:** `/Users/esoh/Documents/Labs/VPK-rovodev/components/ui/tooltip.tsx`

**Diff (logical):**

`TooltipContent` popup className string — 4 changes:

1. **Added `shadow-md`** — ADS `elevation.shadow.raised` elevation for the tooltip label
2. **Added `outline-hidden`** — suppress browser default outline (parity with `HoverCardContent`)
3. **Removed `z-50`** from Popup — de-duplicated; `z-50` already set on the wrapping Positioner (`isolate z-50`)
4. **Removed 3 stale Radix selectors** — `data-[state=delayed-open]:animate-in`, `data-[state=delayed-open]:fade-in-0`, `data-[state=delayed-open]:zoom-in-95` — Base UI Tooltip uses `data-open:` / `data-closed:` only, not `data-[state=*]`

**Class string reorganization:** Reordered for readability — animation classes first, then layout/size, then visual (bg, text, shadow), then motion variables. No semantic change.
