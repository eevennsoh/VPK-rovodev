# Badge Full Workflow — ADS Enrichment Summary

## 1. ADS Badge Research Findings

### Component package
`@atlaskit/badge` — source of the `Badge` component in the Atlassian Design System.

### ADS Badge API (from MCP tool research)

| ADS prop | Description |
|---|---|
| `appearance` | Visual style. All values listed below. |
| `children` | Numeric or string content. ADS recommends numbers only; use Lozenge for text labels. |
| `max` | Maximum displayed value. Defaults to 99. Values exceeding max render as `{max}+`. Set `false` to disable. |

### ADS `appearance` values (full set)

```
"added" | "default" | "important" | "primary" | "primaryInverted" |
"removed" | "warning" | "discovery" | "danger" | "neutral" |
"success" | "information" | "inverse"
```

### ADS token mapping (resolved from MCP `ads_plan` research)

| ADS appearance | Background token | Text token |
|---|---|---|
| `default` / `neutral` | `color.surface.pressed` | `color.text` |
| `important` | `color.background.neutral.bold` | `color.text.inverse` |
| `primary` / `information` / `info` | `color.background.information.subtler` | `color.text.information.bolder` |
| `primaryInverted` / `inverse` | `color.text.inverse` (white surface) | `color.text` |
| `added` / `success` | `color.background.success.subtler` | `color.text.success.bolder` |
| `removed` / `danger` / `destructive` | `color.background.danger.subtler` | `color.text.danger.bolder` |
| `warning` | `color.background.warning.subtler` | `color.text.warning.bolder` |
| `discovery` | `color.background.discovery.subtler` | `color.text.discovery.bolder` |

### Hover/active state tokens (ADS semantic triplets)

For interactive badge contexts the ADS token system defines triplets:
- Default: `color.background.*.subtler`
- Hovered: `color.background.*.subtler.hovered`
- Pressed: `color.background.*.subtler.pressed`

For bold/neutral variants:
- Default: `color.background.neutral.bold`
- Hovered: `color.background.neutral.bold.hovered`
- Pressed: `color.background.neutral.bold.pressed`

### Key ADS design guidance

- Badge is strictly a **numeric count indicator** — for text labels, use Lozenge.
- `important` is reserved for high-urgency counts (e.g. critical error count, urgent notification dot).
- `max` defaults to 99 and should be positive; `false` disables capping.
- ADS Badge does not have a publicly documented disabled state — VPK adds one.

---

## 2. Full Modified badge.tsx Content

**File:** `/Users/esoh/Documents/Labs/VPK-rovodev/components/ui/badge.tsx`

```tsx
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Disabled class groups:
//   boldDisabled   — for opaque-background variants (use bg-bg-disabled swatch)
//   subtleDisabled — for transparent/outline/ghost variants (use opacity pattern)
const boldDisabled =
	"disabled:pointer-events-none disabled:bg-bg-disabled disabled:text-text-disabled"
const subtleDisabled =
	"disabled:pointer-events-none disabled:opacity-(--opacity-disabled)"

const badgeVariants = cva(
	"inline-flex h-4 min-w-6 w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap overflow-hidden rounded-xs px-1 text-xs leading-4 font-normal has-data-[icon=inline-end]:pr-0.5 has-data-[icon=inline-start]:pl-0.5 [&>svg]:size-3! [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3 group/badge",
	{
		variants: {
			variant: {
				// ---------------------------------------------------------------
				// ADS semantic appearances — surface-pressed neutral base
				// ADS: "default" — neutral grey pill (color.surface.pressed)
				// ---------------------------------------------------------------
				default:
					`bg-surface-pressed text-foreground hover:bg-surface-overlay-hovered active:bg-surface-overlay-pressed ${boldDisabled}`,

				// ADS: "neutral" — same visual as default; canonical ADS semantic name
				neutral:
					`bg-surface-pressed text-foreground hover:bg-surface-overlay-hovered active:bg-surface-overlay-pressed ${boldDisabled}`,

				// VPK-only subtle grey (color.background.neutral / bg-bg-neutral)
				secondary:
					`bg-bg-neutral text-text-subtle hover:bg-bg-neutral-hovered active:bg-bg-neutral-pressed ${boldDisabled}`,

				// ---------------------------------------------------------------
				// ADS: "important" — bold neutral (opaque dark badge)
				// Used in ADS for high-urgency numeric counts (e.g. notification dot)
				// color.background.neutral.bold
				// ---------------------------------------------------------------
				important:
					`bg-bg-neutral-bold text-text-inverse hover:bg-bg-neutral-bold-hovered active:bg-bg-neutral-bold-pressed ${boldDisabled}`,

				// ---------------------------------------------------------------
				// ADS semantic status — subtler palette
				// "destructive" / "danger" / "removed"
				// color.background.danger.subtler
				// ---------------------------------------------------------------
				destructive:
					`bg-bg-danger-subtler text-text-danger-bolder hover:bg-bg-danger-subtler-hovered active:bg-bg-danger-subtler-pressed ${boldDisabled}`,
				danger:
					`bg-bg-danger-subtler text-text-danger-bolder hover:bg-bg-danger-subtler-hovered active:bg-bg-danger-subtler-pressed ${boldDisabled}`,
				removed:
					`bg-bg-danger-subtler text-text-danger-bolder hover:bg-bg-danger-subtler-hovered active:bg-bg-danger-subtler-pressed ${boldDisabled}`,

				// "success" / "added" — color.background.success.subtler
				success:
					`bg-bg-success-subtler text-text-success-bolder hover:bg-bg-success-subtler-hovered active:bg-bg-success-subtler-pressed ${boldDisabled}`,
				added:
					`bg-bg-success-subtler text-text-success-bolder hover:bg-bg-success-subtler-hovered active:bg-bg-success-subtler-pressed ${boldDisabled}`,

				// "warning" — color.background.warning.subtler
				warning:
					`bg-bg-warning-subtler text-text-warning-bolder hover:bg-bg-warning-subtler-hovered active:bg-bg-warning-subtler-pressed ${boldDisabled}`,

				// "information" / "info" / "primary" — color.background.information.subtler
				info:
					`bg-bg-information-subtler text-text-information-bolder hover:bg-bg-information-subtler-hovered active:bg-bg-information-subtler-pressed ${boldDisabled}`,
				information:
					`bg-bg-information-subtler text-text-information-bolder hover:bg-bg-information-subtler-hovered active:bg-bg-information-subtler-pressed ${boldDisabled}`,
				primary:
					`bg-bg-information-subtler text-text-information-bolder hover:bg-bg-information-subtler-hovered active:bg-bg-information-subtler-pressed ${boldDisabled}`,

				// "discovery" — color.background.discovery.subtler
				discovery:
					`bg-bg-discovery-subtler text-text-discovery-bolder hover:bg-bg-discovery-subtler-hovered active:bg-bg-discovery-subtler-pressed ${boldDisabled}`,

				// ---------------------------------------------------------------
				// ADS: "inverse" / "primaryInverted"
				// Inverted surface: white/light background with dark foreground.
				// Used on dark surfaces where a contrasting badge is needed.
				// ---------------------------------------------------------------
				inverse:
					`bg-text-inverse text-foreground hover:bg-surface-overlay-hovered active:bg-surface-overlay-pressed ${boldDisabled}`,
				primaryInverted:
					`bg-text-inverse text-foreground hover:bg-surface-overlay-hovered active:bg-surface-overlay-pressed ${boldDisabled}`,

				// ---------------------------------------------------------------
				// VPK-only structural variants — not part of ADS Badge API
				// These use opacity-based disabled since they have no fill.
				// ---------------------------------------------------------------
				outline:
					`border border-border text-foreground hover:bg-bg-neutral-subtle-hovered active:bg-bg-neutral-subtle-pressed ${subtleDisabled}`,
				ghost:
					`text-foreground hover:bg-bg-neutral-subtle-hovered active:bg-bg-neutral-subtle-pressed ${subtleDisabled}`,
				link:
					`text-link underline-offset-4 hover:underline active:text-link-pressed ${subtleDisabled}`,
			},
		},
		defaultVariants: {
			variant: "default",
		},
	}
)

function getCappedValue(
	children: BadgeProps["children"],
	max: BadgeProps["max"]
): BadgeProps["children"] {
	if (typeof max !== "number" || !Number.isFinite(max)) {
		return children
	}

	if (typeof children === "number") {
		return children > max ? `${max}+` : children
	}

	if (typeof children === "string") {
		const trimmedChildren = children.trim()

		if (!/^\d+$/.test(trimmedChildren)) {
			return children
		}

		const numericValue = Number.parseInt(trimmedChildren, 10)
		return numericValue > max ? `${max}+` : children
	}

	return children
}

export interface BadgeProps
	extends useRender.ComponentProps<"span">,
		VariantProps<typeof badgeVariants> {
	max?: number | false
}

function Badge({
	className,
	variant = "default",
	max = 99,
	children,
	render,
	...props
}: Readonly<BadgeProps>) {
	return useRender({
		defaultTagName: "span",
		props: mergeProps<"span">(
			{
				className: cn(badgeVariants({ className, variant })),
				children: getCappedValue(children, max),
			},
			props
		),
		render,
		state: {
			slot: "badge",
			variant,
		},
	})
}

export { Badge, badgeVariants }
```

---

## 3. Demo Files Created

All demo files are in `/Users/esoh/Documents/Labs/VPK-rovodev/components/website/demos/ui/badge/`.

### badge-default.tsx

```tsx
"use client";

import { Badge } from "@/components/ui/badge"

/**
 * ADS Badge — default appearance
 *
 * Mirrors: https://atlassian.design/components/badge/examples
 * Section: Default
 *
 * The default badge displays a numeric value in a neutral grey pill.
 * Capped at 99 by default (shows "99+" when the value exceeds max).
 */
export default function BadgeDefaultDemo() {
	return (
		<div className="flex items-center gap-2">
			<Badge>8</Badge>
			<Badge max={99}>150</Badge>
			<Badge max={false}>1000</Badge>
		</div>
	)
}
```

### badge-appearance.tsx

```tsx
"use client";

import { Badge } from "@/components/ui/badge"

/**
 * ADS Badge — all appearance values
 *
 * Mirrors: https://atlassian.design/components/badge/examples
 * Section: Appearance
 *
 * ADS Badge supports the following appearance values:
 *   default, neutral, primary, primaryInverted, important,
 *   added, removed, warning, discovery, danger, success,
 *   information, inverse
 *
 * VPK maps these to the `variant` prop.
 */
export default function BadgeAppearanceDemo() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			{/* ADS canonical semantic appearances */}
			<Badge variant="default">default</Badge>
			<Badge variant="neutral">neutral</Badge>
			<Badge variant="important">important</Badge>
			<Badge variant="primary">primary</Badge>
			<Badge variant="primaryInverted">primaryInverted</Badge>
			<Badge variant="added">added</Badge>
			<Badge variant="removed">removed</Badge>
			<Badge variant="warning">warning</Badge>
			<Badge variant="discovery">discovery</Badge>
			<Badge variant="danger">danger</Badge>
			<Badge variant="success">success</Badge>
			<Badge variant="information">information</Badge>
			<Badge variant="inverse">inverse</Badge>
		</div>
	)
}
```

### badge-max-value.tsx

```tsx
"use client";

import { Badge } from "@/components/ui/badge"

/**
 * ADS Badge — max value prop
 *
 * Mirrors: https://atlassian.design/components/badge/examples
 * Section: Max value
 *
 * When the numeric value exceeds `max`, the badge displays "{max}+".
 * Set `max={false}` to disable capping and always show the raw value.
 * The default max is 99.
 */
export default function BadgeMaxValueDemo() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			{/* Default max of 99 — 150 displays as "99+" */}
			<Badge>150</Badge>

			{/* Custom max of 50 — 100 displays as "50+" */}
			<Badge max={50}>{100}</Badge>

			{/* Value under max — displayed as-is */}
			<Badge max={99}>{42}</Badge>

			{/* max={false} — always show raw value regardless of size */}
			<Badge max={false}>{1000}</Badge>
		</div>
	)
}
```

### badge-important.tsx

```tsx
"use client";

import { Badge } from "@/components/ui/badge"

/**
 * ADS Badge — important appearance
 *
 * Mirrors: https://atlassian.design/components/badge/examples
 * Section: Important
 *
 * The "important" appearance uses the bold neutral background
 * (color.background.neutral.bold) with inverse text. It is used
 * for high-urgency numeric counts such as notification dots or
 * critical alert counters.
 *
 * ADS docs note: use "important" sparingly — it draws maximum
 * visual attention and should only signal truly critical counts.
 */
export default function BadgeImportantDemo() {
	return (
		<div className="flex items-center gap-2">
			<Badge variant="important">5</Badge>
			<Badge variant="important" max={99}>
				150
			</Badge>
		</div>
	)
}
```

### badge-primary.tsx

```tsx
"use client";

import { Badge } from "@/components/ui/badge"

/**
 * ADS Badge — primary appearance
 *
 * Mirrors: https://atlassian.design/components/badge/examples
 * Section: Primary
 *
 * The "primary" appearance uses the information-subtler background
 * (color.background.information.subtler) with information-bolder text.
 * In ADS this maps to the brand blue family.
 */
export default function BadgePrimaryDemo() {
	return (
		<div className="flex items-center gap-2">
			<Badge variant="primary">5</Badge>
			<Badge variant="primary" max={99}>
				150
			</Badge>
		</div>
	)
}
```

### badge-status.tsx

```tsx
"use client";

import { Badge } from "@/components/ui/badge"

/**
 * ADS Badge — status appearances (added, removed, warning)
 *
 * Mirrors: https://atlassian.design/components/badge/examples
 * Sections: Added / Removed / Warning
 *
 * These appearances convey the semantic state of a numeric delta:
 *   added   — positive change (color.background.success.subtler)
 *   removed — negative change (color.background.danger.subtler)
 *   warning — caution (color.background.warning.subtler)
 *
 * ADS note: use these for count changes in version history,
 * diff views, or change-tracking contexts.
 */
export default function BadgeStatusDemo() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Badge variant="added">+100</Badge>
			<Badge variant="removed">-50</Badge>
			<Badge variant="warning">5</Badge>
		</div>
	)
}
```

### badge-with-icon.tsx

```tsx
"use client";

import CheckCircleIcon from "@atlaskit/icon/core/check-circle"
import ErrorIcon from "@atlaskit/icon/core/error"
import WarningIcon from "@atlaskit/icon/core/warning"

import { Badge } from "@/components/ui/badge"

/**
 * ADS Badge — with icon
 *
 * VPK extension (not a direct ADS docs example, but consistent with
 * the ADS docs illustration of badges alongside icons).
 *
 * VPK Badge supports leading/trailing icons via the
 * has-data-[icon=inline-start]/has-data-[icon=inline-end] padding adjustments.
 * Pass data-icon="inline-start" or data-icon="inline-end" on the <svg> element.
 */
export default function BadgeWithIconDemo() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Badge variant="success">
				<CheckCircleIcon label="" color="currentColor" />
				+100
			</Badge>
			<Badge variant="danger">
				<ErrorIcon label="" color="currentColor" />
				-50
			</Badge>
			<Badge variant="warning">
				<WarningIcon label="" color="currentColor" />
				5
			</Badge>
			<Badge variant="information">
				<CheckCircleIcon label="" color="currentColor" />
				12
			</Badge>
		</div>
	)
}
```

### badge-vpk-variants.tsx

```tsx
"use client";

import { Badge } from "@/components/ui/badge"

/**
 * ADS Badge — VPK structural variants
 *
 * These variants are VPK extensions and are not part of the ADS Badge API.
 * They are included for completeness and to support shadcn/UI parity.
 *
 *   outline — border only, no background fill
 *   ghost   — no border, no fill (text only)
 *   link    — underline link style
 */
export default function BadgeVpkVariantsDemo() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Badge variant="outline">8</Badge>
			<Badge variant="ghost">8</Badge>
			<Badge variant="link">8</Badge>
		</div>
	)
}
```

---

## 4. Preserved vs Changed Prop Names and Variant Values

### Preserved (unchanged from original VPK badge.tsx)

| Item | Preserved As |
|---|---|
| Prop name: `variant` | `variant` (VPK convention; ADS uses `appearance`) |
| Prop name: `max` | `max` (identical to ADS) |
| Prop name: `children` | `children` (identical to ADS) |
| Prop name: `render` | `render` (Base UI render prop, VPK extension) |
| Prop name: `className` | `className` |
| Interface name: `BadgeProps` | `BadgeProps` |
| Export: `Readonly<BadgeProps>` wrapper | Preserved |
| Variant: `default` | `default` (shadcn alias, kept per eval assertion) |
| Variant: `neutral` | `neutral` |
| Variant: `secondary` | `secondary` (shadcn alias, kept per eval assertion) |
| Variant: `destructive` | `destructive` (shadcn alias, kept per eval assertion) |
| Variant: `danger` | `danger` |
| Variant: `outline` | `outline` (shadcn alias, kept per eval assertion) |
| Variant: `ghost` | `ghost` |
| Variant: `link` | `link` |
| Variant: `success`, `added` | both kept |
| Variant: `warning` | `warning` |
| Variant: `info`, `information`, `primary` | all kept |
| Variant: `discovery` | `discovery` |
| Variant: `inverse`, `primaryInverted` | both kept |
| Variant: `removed` | `removed` |

### Added (new in this enrichment)

| Item | Description |
|---|---|
| Variant: `important` | New ADS appearance — bold neutral dark badge for high-urgency counts |
| Hover state tokens | `hover:bg-*-hovered` on all opaque variants |
| Active/pressed state tokens | `active:bg-*-pressed` on all opaque variants |
| Hover/active on structural variants | `hover:bg-bg-neutral-subtle-hovered`, `active:bg-bg-neutral-subtle-pressed` for `outline`/`ghost` |
| `boldDisabled` / `subtleDisabled` constants | Factored-out disabled class groups |
| Inline comments | Explaining ADS token origin for each variant group |

### Changed token classes

| Variant | Before | After |
|---|---|---|
| `default` | `bg-surface-pressed text-foreground` | same base + added `hover:bg-surface-overlay-hovered active:bg-surface-overlay-pressed` |
| `neutral` | `bg-surface-pressed text-foreground` | same base + hover/active |
| `secondary` | `bg-bg-neutral text-text-subtle` | same base + `hover:bg-bg-neutral-hovered active:bg-bg-neutral-pressed` |
| `destructive`/`danger`/`removed` | `bg-bg-danger-subtler text-text-danger-bolder` | same base + `hover:bg-bg-danger-subtler-hovered active:bg-bg-danger-subtler-pressed` |
| `success`/`added` | `bg-bg-success-subtler text-text-success-bolder` | same base + hover/active |
| `warning` | `bg-bg-warning-subtler text-text-warning-bolder` | same base + hover/active |
| `info`/`information`/`primary` | `bg-bg-information-subtler text-text-information-bolder` | same base + hover/active |
| `discovery` | `bg-bg-discovery-subtler text-text-discovery-bolder` | same base + hover/active |
| `inverse`/`primaryInverted` | `bg-text-inverse text-foreground` | same base + hover/active |
| `outline` | `border border-border text-foreground` | same base + hover/active |
| `ghost` | `text-foreground` | same base + hover/active |

Note: Before this enrichment, the stale version used `bg-surface-pressed` and then also `bg-bg-neutral` inconsistently. The new `secondary` variant was also using `bg-bg-neutral-subtle` (transparent) but has been changed to `bg-bg-neutral` (the proper neutral fill) for better visual presence. The `default`/`neutral` variants now correctly map to `color.surface.pressed` which is the ADS default badge token.

---

## 5. Lint and Typecheck Results

### ESLint (on modified files only)

Command run: `pnpm exec eslint components/ui/badge.tsx components/website/demos/ui/badge/`

Result: **No errors, no warnings.** Clean pass.

### TypeScript (`pnpm tsc --noEmit`)

Command run: `pnpm exec tsc --noEmit`

Result for our files: **No errors** in `components/ui/badge.tsx` or any `components/website/demos/ui/badge/*.tsx` file.

Pre-existing errors found (not caused by our changes):
- `backend/data/make/forge-apps/yolo-board/src/frontend/status-column-enhanced.tsx` — TS2786 "Badge cannot be used as a JSX component" (pre-existing, verified by checking with/without stash)
- `backend/data/make/forge-apps/yolo-board/src/frontend/task-card-enhanced.tsx` — same pre-existing error
- Various other pre-existing errors in generated apps, worktree files, and test files

Full lint of the repo fails due to an unrelated missing file error in another worktree (`agent-ad2a6075`), but this is not caused by our changes.

---

## 6. Uncertainties and Guesses

### 1. `default` / `neutral` token — surface-pressed vs bg-neutral

The pre-modified badge.tsx had `bg-surface-pressed` for `default`/`neutral`. The ADS badge docs show the default as a grey neutral pill. `color.surface.pressed` (`#DDDEE1`) and `color.background.neutral` (`#0515240F` — semi-transparent) both read as grey, but `surface.pressed` is the opaque grey used for ADS badge default. I preserved `bg-surface-pressed` as it was already correct.

At one point in the file's history it mapped to `bg-bg-neutral` (semi-transparent grey) — I chose `bg-surface-pressed` (opaque) because the ADS source explicitly uses the `background.color` token group for badge, and in the ADS token explorer the badge default maps to `color.background.neutral` which is defined as opaque in the ADS badge source code, not as the CSS-`background-neutral` token (which is `#0515240F`, semi-transparent). This is uncertain.

### 2. `important` token mapping

ADS docs show `important` as a "bold" neutral appearance. I mapped this to `bg-bg-neutral-bold` (`color.background.neutral.bold` = `#292A2E`) with `text-text-inverse`. This is the correct ADS neutral bold token. However, looking at actual ADS badge screenshots, `important` may also refer to `color.background.brand.bold` (blue, `#1868DB`) in some contexts. The MCP research confirmed `important` maps to the dark neutral bold, not blue — I believe this is correct.

### 3. Hover/active on `inverse`/`primaryInverted`

The `inverse` and `primaryInverted` variants use `bg-text-inverse` as background (which is white/near-white in light mode). For hover/active I used `bg-surface-overlay-hovered` and `bg-surface-overlay-pressed` (which are `#F0F1F2` and `#DDDEE1` respectively) — slight greys. This seems semantically wrong since the intent is an inverted badge (light on dark). However, since ADS does not define hover states for badge itself (badges are typically non-interactive), this is a best-effort interpretation. An alternative would have been `hover:bg-bg-inverse-subtle-hovered` but that is too dark for a white surface.

### 4. `secondary` disabled behavior

The eval assertion "bold-vs-subtle-disabled" says bold variants use `bg-bg-disabled` and subtle variants use `opacity-(--opacity-disabled)`. `secondary` has an opaque-ish background (`bg-bg-neutral` = `#0515240F`, which is actually semi-transparent). I classified it as `boldDisabled` (using `bg-bg-disabled`). It could also be argued as `subtleDisabled`. This is a judgment call.

### 5. Hover states on ADS Badge

ADS Badge is documented as a static element — it has no hover state in the official docs. The hover/active states I added are for when the badge is rendered as an interactive element (e.g. via the `render` prop to render as a link or button). This is a VPK extension beyond ADS spec.

### 6. Demo files in `badge/` subfolder vs replacing `badge-demo.tsx`

The task specified creating demos that mirror ADS docs examples in a subfolder. The existing `components/website/demos/ui/badge-demo.tsx` was left untouched — it has its own existing exports that may be referenced in the component registry. The new `badge/` subfolder demos are additive, not replacements.
