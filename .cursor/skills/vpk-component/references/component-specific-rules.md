# Component-Specific Enrichment Rules

> Detailed rules for specific component types during ADS enrichment.

## ADS Toggle Geometry Lock (Required for `switch`)

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

## Sonner/ADS Flag Mapping Guardrails (Required for `sonner`)

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

## Tile Shape

Tile and IconTile components use `rounded-tile` (maps to `--ds-radius-tile: 25%`) for their proportional rounded-square shape. Do not use fixed radius classes like `rounded-lg` on tiles.

## Size-Dependent Child Constraints

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

## Inner Gap Per Size Variant

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
