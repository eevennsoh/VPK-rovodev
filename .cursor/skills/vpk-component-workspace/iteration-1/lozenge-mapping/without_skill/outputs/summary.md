# Lozenge Mapping: ADS to VPK

## Overview

This document maps the Atlassian Design System (ADS) `@atlaskit/lozenge` component to the VPK `components/ui/lozenge.tsx` implementation, identifying all visual states, token usage, gaps, and observations.

Research sources:
- VPK file: `/Users/esoh/Documents/Labs/VPK-rovodev/components/ui/lozenge.tsx`
- ADS component: `@atlaskit/lozenge` (via `ads_plan` MCP tool)
- VPK token catalog: `.cursor/skills/vpk-design/references/tokens.md`
- VPK theme files: `app/shadcn-theme.css`, `app/tailwind-theme.css`
- VPK demo: `components/website/demos/ui/lozenge-demo.tsx`

---

## 1. ADS Variant → VPK Variant Mapping

### Prop name mapping

| ADS prop | VPK prop | Notes |
|---|---|---|
| `appearance` | `variant` | VPK renamed `appearance` to `variant` to align with shadcn/CVA conventions |
| `isBold` | `isBold` | Identical name, identical behavior |
| `maxWidth` | `maxWidth` | Identical name |
| `children` | `children` | Identical |
| _(none)_ | `size` | VPK extension — adds `compact` (default) and `spacious` sizes |
| _(none)_ | `icon` | VPK extension — leading icon slot |
| _(none)_ | `metric` | VPK extension — trailing Badge metric slot |

### Semantic appearance values

| ADS `appearance` value | VPK `variant` value | Status |
|---|---|---|
| `"default"` | `"neutral"` | Legacy ADS name; VPK uses the new semantic name `"neutral"` |
| `"neutral"` | `"neutral"` | Direct match |
| `"success"` | `"success"` | Direct match |
| `"removed"` | `"danger"` | Legacy ADS name; VPK uses the new semantic name `"danger"` |
| `"danger"` | `"danger"` | Direct match |
| `"inprogress"` | `"information"` | Legacy ADS name; VPK uses the new semantic name `"information"` |
| `"information"` | `"information"` | Direct match |
| `"new"` | `"discovery"` | Legacy ADS name; VPK uses the new semantic name `"discovery"` |
| `"discovery"` | `"discovery"` | Direct match |
| `"moved"` | `"warning"` | Legacy ADS name; VPK uses the new semantic name `"warning"` |
| `"warning"` | `"warning"` | Direct match |

Note: ADS internally maps the six legacy appearance values (`default`, `success`, `removed`, `inprogress`, `new`, `moved`) to the six new semantic colors. VPK only exposes the new semantic names. This is correct behavior — VPK does not need legacy aliases because VPK is a prototype kit, not a migration path.

### Accent color appearance values

| ADS `appearance` value | VPK `variant` value | Status |
|---|---|---|
| `"accent-red"` | `"accent-red"` | Direct match |
| `"accent-orange"` | `"accent-orange"` | Direct match |
| `"accent-yellow"` | `"accent-yellow"` | Direct match |
| `"accent-lime"` | `"accent-lime"` | Direct match |
| `"accent-green"` | `"accent-green"` | Direct match |
| `"accent-teal"` | `"accent-teal"` | Direct match |
| `"accent-blue"` | `"accent-blue"` | Direct match |
| `"accent-purple"` | `"accent-purple"` | Direct match |
| `"accent-magenta"` | `"accent-magenta"` | Direct match |
| `"accent-gray"` | `"accent-gray"` | Direct match |

All 10 accent colors are fully covered in VPK.

---

## 2. Visual States — Token Analysis

### Lozenge (static, non-interactive `<span>`)

ADS Lozenge is a purely static display element. It has **no interactive states** (hover, active, pressed, disabled). The `Lozenge` component in VPK faithfully reproduces this — it is a `<span>` with no cursor interactivity.

#### Default state tokens — semantic variants

| VPK `variant` | Background Tailwind class | Text Tailwind class | ADS background token | ADS text token |
|---|---|---|---|---|
| `neutral` | `bg-bg-neutral` | `text-text-subtle` | `color.background.neutral` | `color.text.subtle` |
| `success` | `bg-bg-success` | `text-text-success` | `color.background.success` | `color.text.success` |
| `danger` | `bg-bg-danger` | `text-text-danger` | `color.background.danger` | `color.text.danger` |
| `information` | `bg-bg-information` | `text-text-information` | `color.background.information` | `color.text.information` |
| `discovery` | `bg-bg-discovery` | `text-text-discovery` | `color.background.discovery` | `color.text.discovery` |
| `warning` | `bg-bg-warning` | `text-text-warning` | `color.background.warning` | `color.text.warning` |

All six semantic variants correctly use VPK's `bg-bg-*` / `text-text-*` token classes which resolve to `color.background.*` / `color.text.*` ADS tokens respectively. These are the correct subtle/default tokens (not the bold variants), matching what ADS uses for the non-bold lozenge appearance.

#### Bold state tokens — semantic variants (`isBold: true`)

| VPK `variant` + `isBold` | Background Tailwind class | Text Tailwind class | ADS background token | ADS text token |
|---|---|---|---|---|
| `neutral` + bold | `bg-bg-neutral-bold` | `text-text-inverse` | `color.background.neutral.bold` | `color.text.inverse` |
| `success` + bold | `bg-success` | `text-success-foreground` | `color.background.success.bold` | `color.text.inverse` |
| `danger` + bold | `bg-destructive` | `text-destructive-foreground` | `color.background.danger.bold` | `color.text.inverse` |
| `information` + bold | `bg-info` | `text-info-foreground` | `color.background.information.bold` | `color.text.inverse` |
| `discovery` + bold | `bg-discovery` | `text-discovery-foreground` | `color.background.discovery.bold` | `color.text.inverse` |
| `warning` + bold | `bg-warning` | `text-warning-foreground` | `color.background.warning.bold` | `color.text.warning.inverse` |

Observation: The bold semantic variants use a mix of shadcn aliases (`bg-success`, `bg-destructive`, `bg-info`, `bg-discovery`, `bg-warning`) rather than the ADS semantic names (`bg-bg-neutral-bold` pattern). This is functionally equivalent since the shadcn theme maps these to the same underlying ADS tokens. However, for internal consistency within VPK feature code the ADS naming convention (`bg-bg-*-bold`) is preferred. This is a style inconsistency but not a token bug.

The warning bold case correctly uses `text-warning-foreground` which maps to `color.text.warning.inverse` (dark text on yellow bold background) — this matches the ADS spec exactly.

#### Default state tokens — accent variants

| VPK `variant` | Background Tailwind class | Text Tailwind class | Underlying ADS token | Notes |
|---|---|---|---|---|
| `accent-red` | `bg-red-100` | `text-red-900` | `color.background.accent.red.subtler` / `color.text.accent.red.bolder` | Via tailwind-theme accent palette |
| `accent-orange` | `bg-orange-100` | `text-orange-900` | `color.background.accent.orange.subtler` / `color.text.accent.orange.bolder` | Via tailwind-theme accent palette |
| `accent-yellow` | `bg-yellow-100` | `text-yellow-900` | `color.background.accent.yellow.subtler` / `color.text.accent.yellow.bolder` | Via tailwind-theme accent palette |
| `accent-lime` | `bg-lime-100` | `text-lime-900` | `color.background.accent.lime.subtler` / `color.text.accent.lime.bolder` | Via tailwind-theme accent palette |
| `accent-green` | `bg-green-100` | `text-green-900` | `color.background.accent.green.subtler` / `color.text.accent.green.bolder` | Via tailwind-theme accent palette |
| `accent-teal` | `bg-teal-100` | `text-teal-900` | `color.background.accent.teal.subtler` / `color.text.accent.teal.bolder` | Via tailwind-theme accent palette |
| `accent-blue` | `bg-blue-100` | `text-blue-900` | `color.background.accent.blue.subtler` / `color.text.accent.blue.bolder` | Via tailwind-theme accent palette |
| `accent-purple` | `bg-purple-100` | `text-purple-900` | `color.background.accent.purple.subtler` / `color.text.accent.purple.bolder` | Via tailwind-theme accent palette |
| `accent-magenta` | `bg-pink-100` | `text-pink-900` | `color.background.accent.magenta.subtler` / `color.text.accent.magenta.bolder` | Via tailwind-theme; pink = magenta |
| `accent-gray` | `bg-neutral-50` | `text-neutral-900` | `color.background.accent.gray.subtlest` / `color.text.accent.gray.bolder` | Via tailwind-theme; uses subtlest (50) not subtler (100) |

All accent colors correctly flow through the VPK tailwind-theme accent palette, which maps to the ADS `color.background.accent.*` and `color.text.accent.*` tokens. The accent variants do **not** have a bold mode — this matches ADS, which also only provides bold for the 6 semantic variants.

Note on `accent-gray`: Uses `bg-neutral-50` (the subtlest gray, `color.background.accent.gray.subtlest`) while all other accent variants use the `-100` level (subtler). This is a minor intentional distinction — gray subtlest produces a lighter, less prominent background which is visually appropriate for the gray accent.

---

## 3. LozengeDropdownTrigger — Interactive States

VPK adds a `LozengeDropdownTrigger` component (a `<button>`) that extends `Lozenge` with full interactive states. This is a VPK extension — ADS Lozenge does not have a built-in interactive trigger variant, though ADS does support using lozenges inside dropdowns.

### Hover state tokens

| VPK `variant` | Hover class | ADS background token |
|---|---|---|
| `neutral` | `hover:bg-bg-neutral-hovered` | `color.background.neutral.hovered` |
| `success` | `hover:bg-bg-success-hovered` | `color.background.success.hovered` |
| `danger` | `hover:bg-bg-danger-hovered` | `color.background.danger.hovered` |
| `information` | `hover:bg-bg-information-hovered` | `color.background.information.hovered` |
| `discovery` | `hover:bg-bg-discovery-hovered` | `color.background.discovery.hovered` |
| `warning` | `hover:bg-bg-warning-hovered` | `color.background.warning.hovered` |
| `accent-red` | `hover:bg-red-200` | `color.background.accent.red.subtler.pressed` |
| `accent-orange` | `hover:bg-orange-200` | `color.background.accent.orange.subtler.pressed` |
| `accent-yellow` | `hover:bg-yellow-200` | `color.background.accent.yellow.subtle` |
| `accent-lime` | `hover:bg-lime-200` | `color.background.accent.lime.subtler.pressed` |
| `accent-green` | `hover:bg-green-200` | `color.background.accent.green.subtler.pressed` |
| `accent-teal` | `hover:bg-teal-200` | `color.background.accent.teal.subtler.pressed` |
| `accent-blue` | `hover:bg-blue-200` | `color.background.accent.blue.subtle` |
| `accent-purple` | `hover:bg-purple-200` | `color.background.accent.purple.subtler.pressed` |
| `accent-magenta` | `hover:bg-pink-200` | `color.background.accent.magenta.subtler.pressed` |
| `accent-gray` | `hover:bg-neutral-100` | `color.background.accent.gray.subtler` |

The six semantic hover tokens are correctly mapped. The accent hover states step one level darker in the palette (100 → 200) to simulate hover.

### Border state tokens (on trigger)

The `triggerBorderVariants` CVA adds a color-matched border around the trigger to visually distinguish it as interactive.

| VPK `variant` | Border class | Notes |
|---|---|---|
| `neutral` | `border-border` | Default ADS border color |
| `success` | `border-lime-200` | Accent-palette subtler pressed (not a direct ADS border semantic) |
| `danger` | `border-red-200` | Accent-palette subtler pressed |
| `information` | `border-blue-200` | Accent-palette subtle |
| `discovery` | `border-purple-200` | Accent-palette subtler pressed |
| `warning` | `border-orange-200` | Accent-palette subtler pressed |
| accent-* | Matching accent `-200` | Consistent with hover level |

Note: ADS does not define specific border tokens for semantic lozenge triggers; these are VPK design decisions that work by using the accent palette one step darker than the background.

### Focus state

```
focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3
```

Uses `color.border.focused` (via `--color-ring`) for the ring. This is correct ADS focus ring behavior.

### Active/Pressed state

VPK does **not** have an explicit `active:` pressed state on `LozengeDropdownTrigger`. This is a gap — ADS defines pressed tokens (`color.background.neutral.pressed`, `color.background.success.pressed`, etc.) that would be the correct tokens for `:active` pseudo-class styling.

### Disabled state

VPK does **not** have a disabled state for either `Lozenge` or `LozengeDropdownTrigger`. ADS Lozenge also does not define a disabled appearance (it is always a status indicator, not an interactive element). For `LozengeDropdownTrigger`, if a disabled state were needed, the correct approach would be:
- Background: `bg-bg-disabled` (`color.background.disabled`, `#17171708`)
- Text: `text-text-disabled` (`color.text.disabled`, `#080F214A`)
- No border, `cursor-not-allowed`, `pointer-events-none`

---

## 4. Gap Analysis

### Missing from VPK (not present in ADS)

- `size` prop with `"compact"` and `"spacious"` values — VPK extension, not in ADS
- `icon` leading slot — VPK extension, not in ADS
- `metric` trailing Badge slot — VPK extension, not in ADS
- `LozengeDropdownTrigger` component — VPK extension, not in ADS

These extensions are well-designed and go beyond ADS parity in a useful direction.

### Missing from VPK relative to ADS

- Legacy appearance aliases (`default`, `success`, `removed`, `inprogress`, `new`, `moved`) — intentionally omitted; VPK only uses the new semantic names
- `isBold` for accent variants — ADS also does not support this; both are consistent
- Active/pressed state on `LozengeDropdownTrigger` — pressed tokens exist in VPK theme but are not applied
- `isInteractive` styling cue — ADS Lozenge has no interactive states, but in Jira products lozenges are often clickable; `LozengeDropdownTrigger` fills this role in VPK

### Token consistency observation

The bold compound variants use shadcn aliases (`bg-success`, `bg-destructive`, etc.) instead of the ADS-preferred VPK patterns (`bg-bg-*-bold`). The tokens resolve identically, but future implementers may be confused by the naming inconsistency within the same file. For example:

- `neutral` bold correctly uses: `bg-bg-neutral-bold` (ADS semantic name)
- `success` bold uses: `bg-success` (shadcn alias)

Both resolve to `color.background.success.bold`/`color.background.neutral.bold`, so there is no functional bug — only a style inconsistency.

---

## 5. Component Changes Made

No changes were made to the VPK lozenge component. The component was analyzed for mapping and gap identification only. The existing implementation is correct and well-structured.

The file content at the time of review is reproduced below for reference:

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
			{
				variant: "neutral",
				isBold: true,
				className: "bg-bg-neutral-bold text-text-inverse",
			},
			{
				variant: "success",
				isBold: true,
				className: "bg-success text-success-foreground",
			},
			{
				variant: "danger",
				isBold: true,
				className: "bg-destructive text-destructive-foreground",
			},
			{
				variant: "information",
				isBold: true,
				className: "bg-info text-info-foreground",
			},
			{
				variant: "discovery",
				isBold: true,
				className: "bg-discovery text-discovery-foreground",
			},
			{
				variant: "warning",
				isBold: true,
				className: "bg-warning text-warning-foreground",
			},
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

const triggerHoverVariants = cva("", {
	variants: {
		variant: {
			neutral: "hover:bg-bg-neutral-hovered",
			success: "hover:bg-bg-success-hovered",
			danger: "hover:bg-bg-danger-hovered",
			information: "hover:bg-bg-information-hovered",
			discovery: "hover:bg-bg-discovery-hovered",
			warning: "hover:bg-bg-warning-hovered",
			"accent-red": "hover:bg-red-200",
			"accent-orange": "hover:bg-orange-200",
			"accent-yellow": "hover:bg-yellow-200",
			"accent-lime": "hover:bg-lime-200",
			"accent-green": "hover:bg-green-200",
			"accent-teal": "hover:bg-teal-200",
			"accent-blue": "hover:bg-blue-200",
			"accent-purple": "hover:bg-purple-200",
			"accent-magenta": "hover:bg-pink-200",
			"accent-gray": "hover:bg-neutral-100",
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

## 6. Prop Names and Variant Values — Preserved or Changed

| Item | Decision | Rationale |
|---|---|---|
| `appearance` → `variant` | **Changed** — VPK uses `variant` | Aligns with CVA and shadcn convention; all VPK UI primitives use `variant` |
| `isBold` | **Preserved** — identical name | 1:1 match with ADS; intuitive and descriptive |
| `maxWidth` | **Preserved** — identical name | 1:1 match with ADS |
| Semantic variant names (`neutral`, `success`, `danger`, `information`, `discovery`, `warning`) | **Preserved** — using new ADS semantic names | Legacy ADS names (`default`, `inprogress`, `new`, `moved`, `removed`) intentionally dropped |
| Accent variant names (`accent-red`, `accent-orange`, etc.) | **Preserved** — identical names | 1:1 match with ADS |
| `size` | **Added** — VPK extension | Not in ADS; adds `compact` (ADS default geometry) and `spacious` (larger, medium-text variant) |
| `icon` | **Added** — VPK extension | Leading icon slot; accepts any ReactNode |
| `metric` | **Added** — VPK extension | Trailing Badge for numeric/text metric display |
| `LozengeDropdownTrigger` | **Added** — VPK extension | Interactive lozenge button with border, hover, focus, and selected states |

---

## 7. Lint and Typecheck Results

No code was modified, so no lint or typecheck run was performed. The existing component was analyzed only.

If modifications were made, the validation commands would be:
```
pnpm run lint
pnpm tsc --noEmit
```

---

## Summary

VPK's `Lozenge` component provides **complete ADS parity** for all 16 appearance values (6 semantic + 10 accent) using the correct ADS token hierarchy routed through VPK's Tailwind theme. Key design decisions:

1. The prop was renamed from `appearance` (ADS) to `variant` (VPK/CVA convention) — this is the only prop name change.
2. All new ADS semantic names are present. Legacy ADS names are intentionally absent.
3. VPK adds three meaningful extensions not in ADS: `size`, `icon`, and `metric`.
4. VPK adds a full `LozengeDropdownTrigger` interactive variant with hover, focus, and selected states.
5. One token naming inconsistency exists in bold compound variants (mixing shadcn aliases with ADS semantic aliases) — this is functionally correct but stylistically inconsistent.
6. One gap exists: no `:active`/pressed state on `LozengeDropdownTrigger`. Tokens for this exist in the theme (`bg-bg-*-pressed`) but are not applied.
