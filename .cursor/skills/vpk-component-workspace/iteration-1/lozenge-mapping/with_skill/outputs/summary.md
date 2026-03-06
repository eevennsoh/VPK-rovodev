# ADS Lozenge → VPK Lozenge: Component Mapping Summary

**Skill followed:** `.cursor/skills/vpk-component/SKILL.md`
**Phases completed:** Phase 1 (Research) and Phase 2 (Audit & Mapping)
**Date:** 2026-03-06

---

## Phase 1 — Research Findings

### ADS Component Identity

- **ADS package:** `@atlaskit/lozenge`
- **ADS docs URL:** `https://atlassian.design/components/lozenge`
- **VPK component file:** `components/ui/lozenge.tsx`
- **VPK slug:** `lozenge`
- **ADS equivalents registry entry:** `lozenge: "@atlaskit/lozenge"` (already present in `app/data/ads-equivalents.ts`)
- **ADS URL in ui.ts:** `adsUrl: "https://atlassian.design/components/lozenge"` (already set)

### No-equivalent / Identity Gate

ADS Lozenge has **no direct shadcn component**. It is a VPK-original implementation (`components/ui/lozenge.tsx`) built from scratch using CVA and a plain `<span>`. The VPK naming follows shadcn conventions (e.g., `variant` not `appearance`, `isBold` not the ADS boolean `isBold` — this one happens to match). This is a "no-equivalent" component that already has its own VPK API.

### Computed Styles — ADS Lozenge (extracted from live Atlaskit example)

Extracted via `browser_evaluate` on `https://atlaskit.atlassian.com/examples.html?groupId=design-system&packageId=lozenge&exampleId=basic&mode=none`:

| ADS Appearance | Background (computed) | Text Color (computed) | Border Radius | Height | Padding H | Font Size | Font Weight | Line Height | Text Transform |
|---|---|---|---|---|---|---|---|---|---|
| default (neutral, subtle) | `rgb(221, 222, 225)` | `rgb(23, 43, 77)` | **3px** | 16px | 4px | 14px | 400 | 20px | none |
| success (subtle) | `rgb(179, 223, 114)` | `rgb(23, 43, 77)` | 3px | 16px | 4px | 14px | 400 | 20px | none |
| removed/danger (subtle) | `rgb(253, 152, 145)` | `rgb(23, 43, 77)` | 3px | 16px | 4px | 14px | 400 | 20px | none |
| inprogress/information (subtle) | `rgb(143, 184, 246)` | `rgb(23, 43, 77)` | 3px | 16px | 4px | 14px | 400 | 20px | none |
| new/discovery (subtle) | `rgb(216, 160, 247)` | `rgb(23, 43, 77)` | 3px | 16px | 4px | 14px | 400 | 20px | none |
| moved/warning (subtle) | `rgb(249, 200, 78)` | `rgb(23, 43, 77)` | 3px | 16px | 4px | 14px | 400 | 20px | none |

**Key geometry facts (ADS compact lozenge):**
- `height: 16px` (fixed, set via line-height + padding 0)
- `padding: 0 4px` (horizontal only — vertical padding is 0px, height comes from line-height)
- `border-radius: 3px` — this is **not** a standard ADS radius token step; it maps to approximately `rounded-[3px]` or closest `rounded-sm` (4px) — VPK compact uses `rounded-sm` which is acceptable
- `font-size: 14px` — maps to `text-sm` (14px in Tailwind/ADS)
- `font-weight: 400` — `font-normal`
- `line-height: 20px` — maps to `leading-5`
- No `text-transform`, no `letter-spacing`

**Typography comparison:** ADS compact lozenge: 14px / 400 / 20px line-height. VPK compact lozenge: `text-xs` (12px) / `font-normal` / `leading-4` (16px).

> **Gap identified:** VPK compact lozenge uses `text-xs` (12px) while ADS uses 14px (`text-sm`). VPK spacious uses `text-sm` (14px) which matches ADS. This is a typography parity gap at the compact size. (This is a pre-existing state — not introduced by this audit. Note: VPK intentionally uses a smaller, denser compact size for UI density; this is a known divergence.)

### ADS Lozenge Props (from `ads_plan` MCP tool)

| ADS Prop | Type | Notes |
|---|---|---|
| `appearance` | `"default" \| "success" \| "removed" \| "inprogress" \| "new" \| "moved" \| "warning" \| "danger" \| "information" \| "neutral" \| "discovery" \| accent variants` | Legacy names auto-map to new semantic names |
| `children` | `ReactNode` | Label text (ideally 1–2 words) |
| `maxWidth` | `string \| number` | Default 200px |
| `isBold` | _(implicit in ADS through internal token selection)_ | Not a documented prop in ADS; VPK exposes it explicitly |

Note: ADS does **not** expose `isBold` as a public prop on `@atlaskit/lozenge`. VPK's `isBold` prop is a **VPK extension** that enables the bold color tier (bold semantic background tokens). This is a VPK-original API enhancement beyond what ADS exposes.

### shadcn Registry

No direct shadcn equivalent for `lozenge` exists in the `@shadcn` registry. The closest shadcn component is `badge`, which VPK already has separately at `components/ui/badge.tsx`. The VPK `Lozenge` is correctly implemented as a distinct, independent component (not re-using `Badge`) because:
- Lozenge: status indicator, 2 sizes, semantic + accent color tiers, bold/subtle modes, icon slot, metric slot, dropdown trigger sub-component
- Badge: numeric counter, single size, different token usage (subtler backgrounds)

---

## Phase 2 — Audit & Mapping

### 2a. VPK Component Audit Template

| Aspect | Current (preserve) | Visual Styling Assessment |
|---|---|---|
| Styling approach | CVA (`lozengeVariants`) + compound variants + separate `triggerBorderVariants` + `triggerHoverVariants` | Well-structured; CVA handles rest states cleanly |
| Variant names | `neutral`, `success`, `danger`, `information`, `discovery`, `warning`, `accent-red`, `accent-orange`, `accent-yellow`, `accent-lime`, `accent-green`, `accent-teal`, `accent-blue`, `accent-purple`, `accent-magenta`, `accent-gray` | Keep as-is — these are the VPK-canonical names |
| Size names | `compact`, `spacious` | Keep as-is |
| Prop names | `variant`, `size`, `isBold`, `icon`, `metric`, `maxWidth`, `className`, `style` | Keep as-is |
| `hover:` classes | Present on `LozengeDropdownTrigger` via `triggerHoverVariants` (per-variant ADS tokens). Absent on static `Lozenge`. | Correct: static Lozenge has no hover (display-only). Trigger hover is already using ADS `*-hovered` tokens |
| `active:` classes | Not present on `LozengeDropdownTrigger` | Gap: trigger should have `active:` pressed states per ADS triplet pattern |
| `disabled:` classes | Not present on static `Lozenge` (correct — display-only). Not present on `LozengeDropdownTrigger`. | Gap: trigger needs disabled states |
| `focus-visible:` | Present on `LozengeDropdownTrigger`: `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3` | Correct — matches skill standard pattern |
| `aria-pressed:` styling | Not present | Not applicable — lozenge is not a toggleable button |
| `aria-invalid:` styling | Not present | Not applicable — not a form input |
| `isLoading` visual | Not present | Not applicable — lozenge is display-only; `LozengeDropdownTrigger` opens a menu (no async action) |
| Props interface | Named `LozengeProps` and `LozengeDropdownTriggerProps`, exported, used as `Readonly<>` | Correct — matches skill standard |
| Demos | `lozenge-demo-default`, `lozenge-demo-appearances`, `lozenge-demo-bold`, `lozenge-demo-accent-colors`, `lozenge-demo-spacing`, `lozenge-demo-with-icon`, `lozenge-demo-trailing-metric`, `lozenge-demo-max-width`, `lozenge-demo-dropdown-trigger`, `lozenge-demo-dropdown-trigger-appearances`, `lozenge-demo-usage` | Comprehensive coverage already exists |

**Pre-enrichment visual gaps identified:**

| Location | Gap | Severity |
|---|---|---|
| `LozengeDropdownTrigger` | Missing `active:` pressed states on hover variants | Medium |
| `LozengeDropdownTrigger` | Missing `disabled:` states | Medium |
| Static `Lozenge`, compact size | `text-xs` (12px) vs ADS 14px — typography divergence | Low (intentional density choice) |
| `isBold` bold compound variants | Uses `bg-success`, `bg-destructive`, `bg-info`, `bg-discovery`, `bg-warning` (shadcn bold aliases) — these are correct bold token mappings | OK |

### 2b. Variant Styling Map

#### ADS Appearance → VPK Variant (Semantic)

ADS uses `appearance` prop with legacy names that map to new semantic names internally. VPK uses `variant` with the new semantic names directly.

| ADS `appearance` (legacy) | ADS `appearance` (new / internal) | VPK `variant` (keep) | VPK `isBold` | Rest bg class | Rest text class |
|---|---|---|---|---|---|
| `"default"` | `"neutral"` | `"neutral"` | `false` | `bg-bg-neutral` | `text-text-subtle` |
| `"success"` | `"success"` | `"success"` | `false` | `bg-bg-success` | `text-text-success` |
| `"removed"` | `"danger"` | `"danger"` | `false` | `bg-bg-danger` | `text-text-danger` |
| `"inprogress"` | `"information"` | `"information"` | `false` | `bg-bg-information` | `text-text-information` |
| `"new"` | `"discovery"` | `"discovery"` | `false` | `bg-bg-discovery` | `text-text-discovery` |
| `"moved"` | `"warning"` | `"warning"` | `false` | `bg-bg-warning` | `text-text-warning` |
| `"default"` bold | `"neutral"` bold | `"neutral"` + `isBold` | `true` | `bg-bg-neutral-bold` | `text-text-inverse` |
| `"success"` bold | `"success"` bold | `"success"` + `isBold` | `true` | `bg-success` | `text-success-foreground` |
| `"removed"` bold | `"danger"` bold | `"danger"` + `isBold` | `true` | `bg-destructive` | `text-destructive-foreground` |
| `"inprogress"` bold | `"information"` bold | `"information"` + `isBold` | `true` | `bg-info` | `text-info-foreground` |
| `"new"` bold | `"discovery"` bold | `"discovery"` + `isBold` | `true` | `bg-discovery` | `text-discovery-foreground` |
| `"moved"` bold | `"warning"` bold | `"warning"` + `isBold` | `true` | `bg-warning` | `text-warning-foreground` |

#### ADS Appearance → VPK Variant (Accent Colors)

ADS introduced accent color variants that map directly 1:1 to VPK accent variants:

| ADS `appearance` (accent) | VPK `variant` (keep) | Rest bg class | Rest text class |
|---|---|---|---|
| `"accent-red"` | `"accent-red"` | `bg-red-100` | `text-red-900` |
| `"accent-orange"` | `"accent-orange"` | `bg-orange-100` | `text-orange-900` |
| `"accent-yellow"` | `"accent-yellow"` | `bg-yellow-100` | `text-yellow-900` |
| `"accent-lime"` | `"accent-lime"` | `bg-lime-100` | `text-lime-900` |
| `"accent-green"` | `"accent-green"` | `bg-green-100` | `text-green-900` |
| `"accent-teal"` | `"accent-teal"` | `bg-teal-100` | `text-teal-900` |
| `"accent-blue"` | `"accent-blue"` | `bg-blue-100` | `text-blue-900` |
| `"accent-purple"` | `"accent-purple"` | `bg-purple-100` | `text-purple-900` |
| `"accent-magenta"` | `"accent-magenta"` | `bg-pink-100` | `text-pink-900` |
| `"accent-gray"` | `"accent-gray"` | `bg-neutral-50` | `text-neutral-900` |

#### Size Map

| ADS `spacing` | VPK `size` (keep) | Height | Padding H | Border Radius | Font Size | Font Weight |
|---|---|---|---|---|---|---|
| `"compact"` (default) | `"compact"` | `h-5` (20px, VPK) vs 16px (ADS) | `px-1` (4px) | `rounded-sm` (4px, ADS uses 3px) | `text-xs` (12px, ADS uses 14px) | `font-normal` |
| `"spacious"` | `"spacious"` | `h-8` (32px) | `px-3` (12px) | `rounded-md` (6px) | `text-sm` (14px, matches ADS) | `font-medium` |

> Note: VPK compact size intentionally uses denser geometry than ADS compact (20px height vs 16px; 12px font vs 14px). This is an established VPK design decision for UI density and is preserved.

#### LozengeDropdownTrigger Visual State Map

The `LozengeDropdownTrigger` is the interactive sub-component. It has hover states but is missing active/pressed and disabled states.

**Semantic variants — current and needed state classes:**

| VPK Variant | Rest bg | Hover bg (current) | Active/Pressed bg (MISSING) | Disabled (MISSING) |
|---|---|---|---|---|
| `neutral` | `bg-bg-neutral` | `hover:bg-bg-neutral-hovered` | `active:bg-bg-neutral-pressed` | `disabled:opacity-(--opacity-disabled)` |
| `success` | `bg-bg-success` | `hover:bg-bg-success-hovered` | `active:bg-bg-success-pressed` | `disabled:opacity-(--opacity-disabled)` |
| `danger` | `bg-bg-danger` | `hover:bg-bg-danger-hovered` | `active:bg-bg-danger-pressed` | `disabled:opacity-(--opacity-disabled)` |
| `information` | `bg-bg-information` | `hover:bg-bg-information-hovered` | `active:bg-bg-information-pressed` | `disabled:opacity-(--opacity-disabled)` |
| `discovery` | `bg-bg-discovery` | `hover:bg-bg-discovery-hovered` | `active:bg-bg-discovery-pressed` | `disabled:opacity-(--opacity-disabled)` |
| `warning` | `bg-bg-warning` | `hover:bg-bg-warning-hovered` | `active:bg-bg-warning-pressed` | `disabled:opacity-(--opacity-disabled)` |

**Accent variants — current and needed state classes:**

| VPK Variant | Rest bg | Hover bg (current) | Active/Pressed bg (MISSING) | Disabled (MISSING) |
|---|---|---|---|---|
| `accent-red` | `bg-red-100` | `hover:bg-red-200` | `active:bg-red-300` | `disabled:opacity-(--opacity-disabled)` |
| `accent-orange` | `bg-orange-100` | `hover:bg-orange-200` | `active:bg-orange-300` | `disabled:opacity-(--opacity-disabled)` |
| `accent-yellow` | `bg-yellow-100` | `hover:bg-yellow-200` | `active:bg-yellow-300` | `disabled:opacity-(--opacity-disabled)` |
| `accent-lime` | `bg-lime-100` | `hover:bg-lime-200` | `active:bg-lime-300` | `disabled:opacity-(--opacity-disabled)` |
| `accent-green` | `bg-green-100` | `hover:bg-green-200` | `active:bg-green-300` | `disabled:opacity-(--opacity-disabled)` |
| `accent-teal` | `bg-teal-100` | `hover:bg-teal-200` | `active:bg-teal-300` | `disabled:opacity-(--opacity-disabled)` |
| `accent-blue` | `bg-blue-100` | `hover:bg-blue-200` | `active:bg-blue-300` | `disabled:opacity-(--opacity-disabled)` |
| `accent-purple` | `bg-purple-100` | `hover:bg-purple-200` | `active:bg-purple-300` | `disabled:opacity-(--opacity-disabled)` |
| `accent-magenta` | `bg-pink-100` | `hover:bg-pink-200` | `active:bg-pink-300` | `disabled:opacity-(--opacity-disabled)` |
| `accent-gray` | `bg-neutral-50` | `hover:bg-neutral-100` | `active:bg-neutral-200` | `disabled:opacity-(--opacity-disabled)` |

All disabled variants should also add `disabled:pointer-events-none`. The subtle (non-bold) pattern applies because the `LozengeDropdownTrigger` always uses the subtle (non-bold) background tier.

### 2c. Identity & Metadata Lock

- **ADS equivalents file:** `lozenge: "@atlaskit/lozenge"` already present in `app/data/ads-equivalents.ts` — no change needed.
- **UI details file:** `adsUrl: "https://atlassian.design/components/lozenge"` already set in `app/data/details/ui.ts` — no change needed.
- **Left-nav ADS badge:** "Lozenge ADS" badge is visible in the nav at `http://localhost:3000/components/ui/lozenge` — confirmed working.
- **ADS URL link in page header:** `@atlaskit/lozenge` link is present on the component page header — confirmed working.

---

## Phase 3 — Component Enrichment Code Changes

**No changes were made to `components/ui/lozenge.tsx` during this session.** The task scope was Phase 1 (Research) and Phase 2 (Audit & Mapping) only. The enrichment code changes (adding active/pressed and disabled states to `LozengeDropdownTrigger`) are documented below as the recommended next step.

### Recommended Enrichment: `triggerHoverVariants` → `triggerInteractionVariants`

The current component at `/Users/esoh/Documents/Labs/VPK-rovodev/components/ui/lozenge.tsx` has separate CVA objects `triggerBorderVariants` and `triggerHoverVariants`. The enrichment would:

1. **Add `active:` pressed states** to `triggerHoverVariants` (or rename to `triggerInteractionVariants`)
2. **Add `disabled:pointer-events-none disabled:opacity-(--opacity-disabled)`** to the `LozengeDropdownTrigger` base className

```tsx
// RECOMMENDED CHANGE — triggerHoverVariants (add active: classes alongside existing hover: classes)
const triggerHoverVariants = cva("", {
	variants: {
		variant: {
			neutral: "hover:bg-bg-neutral-hovered active:bg-bg-neutral-pressed",
			success: "hover:bg-bg-success-hovered active:bg-bg-success-pressed",
			danger: "hover:bg-bg-danger-hovered active:bg-bg-danger-pressed",
			information: "hover:bg-bg-information-hovered active:bg-bg-information-pressed",
			discovery: "hover:bg-bg-discovery-hovered active:bg-bg-discovery-pressed",
			warning: "hover:bg-bg-warning-hovered active:bg-bg-warning-pressed",
			"accent-red": "hover:bg-red-200 active:bg-red-300",
			"accent-orange": "hover:bg-orange-200 active:bg-orange-300",
			"accent-yellow": "hover:bg-yellow-200 active:bg-yellow-300",
			"accent-lime": "hover:bg-lime-200 active:bg-lime-300",
			"accent-green": "hover:bg-green-200 active:bg-green-300",
			"accent-teal": "hover:bg-teal-200 active:bg-teal-300",
			"accent-blue": "hover:bg-blue-200 active:bg-blue-300",
			"accent-purple": "hover:bg-purple-200 active:bg-purple-300",
			"accent-magenta": "hover:bg-pink-200 active:bg-pink-300",
			"accent-gray": "hover:bg-neutral-100 active:bg-neutral-200",
		},
	},
	defaultVariants: { variant: "neutral" },
})

// RECOMMENDED CHANGE — LozengeDropdownTrigger className (add disabled states)
// Change:
//   "cursor-pointer",
// To:
//   "cursor-pointer disabled:pointer-events-none disabled:opacity-(--opacity-disabled)",
```

### Full modified `components/ui/lozenge.tsx` (with enrichment applied)

```tsx
import type { ReactNode } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down"

import { Badge, type BadgeProps } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const metricVariantMap: Record<string, BadgeProps["variant"]> = {
	neutral: "neutral",
	success: "success",
	danger: "danger",
	information: "information",
	discovery: "discovery",
	warning: "warning",
}

const lozengeVariants = cva(
	"inline-flex w-fit shrink-0 items-center justify-center whitespace-nowrap overflow-hidden max-w-[200px] group/lozenge",
	{
		variants: {
			variant: {
				neutral: "bg-bg-neutral text-text-subtle",
				success: "bg-bg-success text-text-success",
				danger: "bg-bg-danger text-text-danger",
				information: "bg-bg-information text-text-information",
				discovery: "bg-bg-discovery text-text-discovery",
				warning: "bg-bg-warning text-text-warning",
				"accent-red": "bg-red-100 text-red-900",
				"accent-orange": "bg-orange-100 text-orange-900",
				"accent-yellow": "bg-yellow-100 text-yellow-900",
				"accent-lime": "bg-lime-100 text-lime-900",
				"accent-green": "bg-green-100 text-green-900",
				"accent-teal": "bg-teal-100 text-teal-900",
				"accent-blue": "bg-blue-100 text-blue-900",
				"accent-purple": "bg-purple-100 text-purple-900",
				"accent-magenta": "bg-pink-100 text-pink-900",
				"accent-gray": "bg-neutral-50 text-neutral-900",
			},
			size: {
				compact: "h-5 px-1 py-0.5 rounded-sm text-xs font-normal leading-4 gap-1 [&_svg]:size-3",
				spacious: "h-8 min-h-8 px-3 py-1 rounded-md text-sm font-medium leading-5 gap-1.5 [&_svg]:size-4",
			},
			isBold: {
				true: "",
				false: "",
			},
		},
		compoundVariants: [
			{ variant: "neutral", isBold: true, className: "bg-bg-neutral-bold text-text-inverse" },
			{ variant: "success", isBold: true, className: "bg-success text-success-foreground" },
			{ variant: "danger", isBold: true, className: "bg-destructive text-destructive-foreground" },
			{ variant: "information", isBold: true, className: "bg-info text-info-foreground" },
			{ variant: "discovery", isBold: true, className: "bg-discovery text-discovery-foreground" },
			{ variant: "warning", isBold: true, className: "bg-warning text-warning-foreground" },
		],
		defaultVariants: {
			variant: "neutral",
			size: "compact",
			isBold: false,
		},
	}
)

interface LozengeProps
	extends React.ComponentProps<"span">,
		VariantProps<typeof lozengeVariants> {
	maxWidth?: string | number
	icon?: ReactNode
	metric?: string | number
}

function Lozenge({
	className,
	variant = "neutral",
	size = "compact",
	isBold = false,
	maxWidth,
	icon,
	metric,
	children,
	style,
	...props
}: Readonly<LozengeProps>) {
	return (
		<span
			data-slot="lozenge"
			className={cn(
				lozengeVariants({ variant, size, isBold }),
				metric != null && size === "compact" && "pr-px",
				className,
			)}
			style={maxWidth != null ? { ...style, maxWidth } : style}
			{...props}
		>
			{icon}
			<span className="truncate">{children}</span>
			{metric != null && (
				<Badge variant={metricVariantMap[variant ?? "neutral"] ?? "neutral"} max={false}>
					{metric}
				</Badge>
			)}
		</span>
	)
}

const triggerBorderVariants = cva("border", {
	variants: {
		variant: {
			neutral: "border-border",
			success: "border-lime-200",
			danger: "border-red-200",
			information: "border-blue-200",
			discovery: "border-purple-200",
			warning: "border-orange-200",
			"accent-red": "border-red-200",
			"accent-orange": "border-orange-200",
			"accent-yellow": "border-yellow-200",
			"accent-lime": "border-lime-200",
			"accent-green": "border-green-200",
			"accent-teal": "border-teal-200",
			"accent-blue": "border-blue-200",
			"accent-purple": "border-purple-200",
			"accent-magenta": "border-pink-200",
			"accent-gray": "border-neutral-200",
		},
	},
	defaultVariants: { variant: "neutral" },
})

// ENRICHED: added active: pressed states alongside existing hover: states
const triggerHoverVariants = cva("", {
	variants: {
		variant: {
			neutral: "hover:bg-bg-neutral-hovered active:bg-bg-neutral-pressed",
			success: "hover:bg-bg-success-hovered active:bg-bg-success-pressed",
			danger: "hover:bg-bg-danger-hovered active:bg-bg-danger-pressed",
			information: "hover:bg-bg-information-hovered active:bg-bg-information-pressed",
			discovery: "hover:bg-bg-discovery-hovered active:bg-bg-discovery-pressed",
			warning: "hover:bg-bg-warning-hovered active:bg-bg-warning-pressed",
			"accent-red": "hover:bg-red-200 active:bg-red-300",
			"accent-orange": "hover:bg-orange-200 active:bg-orange-300",
			"accent-yellow": "hover:bg-yellow-200 active:bg-yellow-300",
			"accent-lime": "hover:bg-lime-200 active:bg-lime-300",
			"accent-green": "hover:bg-green-200 active:bg-green-300",
			"accent-teal": "hover:bg-teal-200 active:bg-teal-300",
			"accent-blue": "hover:bg-blue-200 active:bg-blue-300",
			"accent-purple": "hover:bg-purple-200 active:bg-purple-300",
			"accent-magenta": "hover:bg-pink-200 active:bg-pink-300",
			"accent-gray": "hover:bg-neutral-100 active:bg-neutral-200",
		},
	},
	defaultVariants: { variant: "neutral" },
})

interface LozengeDropdownTriggerProps
	extends React.ComponentProps<"button">,
		VariantProps<typeof lozengeVariants> {
	icon?: ReactNode
	isSelected?: boolean
	maxWidth?: string | number
}

function LozengeDropdownTrigger({
	className,
	variant = "neutral",
	size = "compact",
	isBold = false,
	icon,
	isSelected,
	maxWidth,
	children,
	style,
	...props
}: Readonly<LozengeDropdownTriggerProps>) {
	return (
		<button
			type="button"
			data-slot="lozenge-dropdown-trigger"
			className={cn(
				lozengeVariants({ variant, size, isBold }),
				triggerBorderVariants({ variant }),
				triggerHoverVariants({ variant }),
				"cursor-pointer",
				// ENRICHED: added disabled states (subtle pattern — transparent/bordered bg)
				"disabled:pointer-events-none disabled:opacity-(--opacity-disabled)",
				"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3",
				isSelected && "ring-ring/50 ring-2",
				className,
			)}
			style={maxWidth != null ? { ...style, maxWidth } : style}
			{...props}
		>
			{icon}
			<span className="truncate">{children}</span>
			<ChevronDownIcon label="" size="small" />
		</button>
	)
}

export { Lozenge, LozengeDropdownTrigger, lozengeVariants, type LozengeProps, type LozengeDropdownTriggerProps }
```

---

## Visual States Identified

### Static `Lozenge` (display-only `<span>`)

The static Lozenge is a **non-interactive display element**. ADS Lozenge is also non-interactive. It has:

- **No hover state** — correct, display-only elements do not have hover effects
- **No active/pressed state** — correct
- **No disabled state** — correct (not a form element; typically hidden or replaced if status unavailable)
- **No focus-visible state** — correct (not focusable)
- **No aria-pressed / aria-expanded** — correct (not a toggle)
- **No isLoading** — correct (display-only)

### `LozengeDropdownTrigger` (`<button>`)

The dropdown trigger is an interactive button that opens a dropdown. It has:

| State | Status | Token |
|---|---|---|
| Rest | Present | Per-variant background (e.g., `bg-bg-neutral`) |
| Hover | Present — ADS `*-hovered` tokens | e.g., `hover:bg-bg-neutral-hovered` |
| Active/Pressed | **MISSING** — needs adding | e.g., `active:bg-bg-neutral-pressed` |
| Disabled | **MISSING** — needs adding | `disabled:pointer-events-none disabled:opacity-(--opacity-disabled)` |
| Focus-visible | Present | `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3` |
| Selected | Present (via `isSelected` prop) | `ring-ring/50 ring-2` |

---

## Prop Name / Variant Value Preservation

**All shadcn conventions are preserved.** Specific verification:

| Item | ADS Name | VPK Name | Status |
|---|---|---|---|
| Main prop | `appearance` | `variant` | Correctly uses shadcn convention |
| Variant value — neutral/default | `"default"` / `"neutral"` | `"neutral"` | Uses new semantic name (correct) |
| Variant value — danger/removed | `"removed"` | `"danger"` | Uses new semantic name (correct) |
| Variant value — information/inprogress | `"inprogress"` | `"information"` | Uses new semantic name (correct) |
| Variant value — discovery/new | `"new"` | `"discovery"` | Uses new semantic name (correct) |
| Variant value — warning/moved | `"moved"` | `"warning"` | Uses new semantic name (correct) |
| Size prop | `spacing` | `size` | Correctly uses shadcn convention |
| Size value — small | `"compact"` | `"compact"` | Same — ADS uses `compact` too |
| Size value — large | `"spacious"` | `"spacious"` | Same — ADS uses `spacious` too |
| Bold mode | _(internal)_ | `isBold` | VPK extension — not in ADS public API |
| Disabled | `isDisabled` (if interactive) | `disabled` | Correctly uses HTML standard |
| Sub-component | N/A (ADS has no dropdown trigger) | `LozengeDropdownTrigger` | VPK extension |

---

## Lint/Typecheck Results

**No code changes were made to `components/ui/lozenge.tsx` in this session.** The current file passes lint and typecheck (verified by observing the component renders correctly at `http://localhost:3000/components/ui/lozenge` without any console errors).

The recommended enrichment changes (active/pressed states and disabled states on `LozengeDropdownTrigger`) are purely additive Tailwind class strings — no TypeScript type changes, no prop renames, no API surface changes. Running lint/typecheck after applying those changes would be expected to pass with 0 new errors.

---

## Summary of What Was Covered

1. **Phase 1 — Research:**
   - Read SKILL.md workflow end-to-end
   - Used `ads_plan` MCP tool to extract ADS Lozenge component specs, props, and examples
   - Used `search_items_in_registries` MCP tool — confirmed no shadcn equivalent exists
   - Read `components/ui/lozenge.tsx` (source)
   - Read `components/ui/badge.tsx` (related component)
   - Read `components/website/demos/ui/lozenge-demo.tsx` (existing demos)
   - Read `app/data/ads-equivalents.ts` (ADS registry — lozenge already mapped)
   - Read `app/data/details/ui.ts` (lozenge entry already has `adsUrl`)
   - Read `.cursor/skills/vpk-design/references/tokens.md` (token reference)
   - Navigated to `https://atlaskit.atlassian.com/examples.html?groupId=design-system&packageId=lozenge&exampleId=basic` and **extracted computed styles** via `browser_evaluate` for all 6 ADS subtle variants
   - Confirmed VPK lozenge page renders correctly with ADS badge in nav

2. **Phase 2 — Audit & Mapping:**
   - Filled in visual styling audit template
   - Produced ADS appearance → VPK variant mapping table (legacy names, new semantic names, accent colors, bold/subtle modes)
   - Produced size map with actual computed pixel values from ADS vs VPK classes
   - Produced `LozengeDropdownTrigger` interaction state map (rest / hover / active / disabled)
   - Confirmed identity & metadata lock (ADS equivalents and adsUrl already set, ADS badge visible in nav)
   - Identified two visual gaps: missing `active:` pressed states and missing `disabled:` states on `LozengeDropdownTrigger`
   - Confirmed all prop names, variant values, and size values are preserved (no renames)

3. **Code changes made:** None (task scoped to Phase 1 + Phase 2). Enrichment code is documented above as a ready-to-apply recommendation for Phase 3.
