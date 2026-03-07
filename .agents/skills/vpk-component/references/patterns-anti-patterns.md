# Patterns and Anti-Patterns

## Do

| Pattern | Example |
|---|---|
| Use ADS hovered/pressed tokens | `hover:bg-primary-hovered` |
| Use ADS opacity tokens | `disabled:opacity-(--opacity-disabled)` |
| Use `aria-busy` for loading | `aria-busy={isLoading \|\| undefined}` |
| Export named Props interface | `export { Component, type ComponentProps }` |
| Include `pointer-events-none` with disabled AND loading | Always pair with interaction prevention |
| Use `data-slot` on root element | `data-slot="button"` |
| Validate typography against ADS examples | Compare `fontSize` + `lineHeight` + visual output before finalizing |
| Use VPK `Icon` wrapper with Tailwind color classes | `<Icon render={<StatusSuccessIcon label="" />} label="Success" className="text-icon-success" />` |
| Use VPK `Link` for hover-card/popover triggers | `<HoverCardTrigger render={<Link href="#" />}>` — Link handles underline-on-hover natively |
| Consolidate thin ADS wrappers into existing VPK components | If an ADS component (e.g., inline-dialog, inline-message) is just a re-export or thin wrapper, map it to the existing VPK component (hover-card, alert) instead of maintaining a separate file |
| Include gap in CVA size variants unconditionally | `gap` only applies between siblings — safe with single children, no conditional logic needed |
| Use `border-right` for split button separators | ADS split buttons use 1px border-right on primary button (`border-r border-r-white/65` for solid, `border-r border-r-border` for outline) — not a separate div element |
| Extract inner container gap per size variant from ADS | ADS nests inner flex containers with size-dependent `gap` values (e.g., compact: 4px, spacious: 6px) |
| Use conditional padding overrides for child-dependent spacing | `cn(variants({ size }), metric != null && size === "compact" && "pr-px")` for ADS asymmetric padding |
| Delegate shape rendering to the owning component | Avatar owns `shape` (circle/square/hexagon) — consumers like Tag use `shape` prop, not manual clip-path/rounding on wrappers |
| Separate CVA shape and size concerns | Shape variants carry `after:rounded-*` / `after:[clip-path:*]`; size variants carry only dimensions (`size-*`) — no duplicate `after:` rounding in size |
| Override base component border-radius unconditionally when composing | When a component wraps another (e.g., `CalendarDayButton` wraps `Button`), the inner component's default `rounded-lg` leaks through — add an unconditional `rounded-*` base class, not just conditional `data-[selected=true]:rounded-*` overrides |
| Ensure parent background rounding matches child rounding | When a parent element (e.g., `<td>`) has a background color (`bg-muted`) and `rounded-none`, its square corners visually mask the child button's rounded corners — keep parent radius consistent with child |
| For ADS Toggle parity, lock root/thumb/icon geometry before polishing states | Validate checked + unchecked visuals after setting size classes — geometry bugs can hide icons even if token classes are correct |
| For form inputs, support both `data-invalid:` and `aria-invalid:` selectors | Base UI Field sets `data-invalid`, while HTML uses `aria-invalid` — include both for full compatibility |
| For checked border states, include border hover/active tokens alongside background | `data-checked:hover:border-primary-hovered` and `data-checked:active:border-primary-pressed` — not just `bg-*` tokens |
| Prefer pure CSS indicators over icon library imports for simple shapes | Radio dot uses `<span className="size-1.5 rounded-full bg-current" />` instead of lucide `CircleIcon` — reduces bundle size and avoids SVG stroke artifacts |
| Mirror ADS docs example structure for demos | Fetch the ADS examples page and use its titles/grouping (e.g., "Default", "Menu structure", "Density") — not generic feature-based names |

## Do Not

| Anti-Pattern | Correct Alternative |
|---|---|
| Renaming shadcn props to ADS names (`variant` → `appearance`) | **Keep existing shadcn prop names** |
| Renaming shadcn variant values (`destructive` → `danger`) | **Keep existing shadcn variant values** |
| Renaming shadcn size values (`sm` → `small`) | **Keep existing shadcn size values** |
| Renaming sub-components (`DialogHeader` → `ModalHeader`) | **Keep existing shadcn sub-component names** |
| `hover:bg-primary/80` | `hover:bg-primary-hovered` |
| `disabled:opacity-50` | `disabled:opacity-(--opacity-disabled)` or bold pattern |
| `[a]:hover:bg-primary/80` | `hover:bg-primary-hovered` (on the component itself) |
| Inline type: `(props: Primitive.Props & ...)` | Named: `interface ComponentProps extends ...` |
| `hover:bg-muted` for ghost/subtle variants | `hover:bg-bg-neutral-subtle-hovered` |
| Adding `isLoading` to static components | Only for action-triggering components |
| `rounded-[2px]` | `rounded-xs` (maps to `var(--ds-radius-xsmall)`) |
| `rounded-[4px]` | `rounded-sm` (maps to `var(--ds-radius-small)`) |
| `rounded-[Npx]` when N matches an ADS token | Use semantic class: `rounded-xs`/`-sm`/`-md`/`-lg`/`-xl`/`-2xl` |
| `rounded-lg` on Tile/IconTile | `rounded-tile` (maps to `--ds-radius-tile: 25%`) |
| `rounded-[25%]` on tiles | `rounded-tile` (semantic token class) |
| Missing `overflow-hidden` on tiles | Always add `overflow-hidden` to clip content to the rounded shape |
| Using `atlaskit.atlassian.com` for visual specs | Use `atlassian.design/components/[name]/examples` (Atlaskit examples are outdated) |
| Assuming typography from token/utility names without checking examples | Use computed styles from `atlassian.design` and confirm visual parity locally |
| Keeping local text larger when ADS appears smaller | Adjust to the closest matching class (for example `text-xs` / `leading-4`) to match ADS |
| Abbreviated size names (`sm`, `md`, `lg`) | **Keep as-is** — preserve existing shadcn size conventions; do not rename to ADS equivalents (`small`, `medium`, `large`) |
| Using ADS prop names on no-equivalent components (`appearance`, `spacing`, `isDisabled`) | Normalize to shadcn naming via canonical mapping (`variant`, `size`, `disabled`) |
| Duplicate/redundant demo sections | Consolidate demos that show the same concept — e.g., merge "Inset" and "Custom SVG" into one example with multiple rows |
| Mapping ADS Toggle to VPK `Toggle` | Map ADS Toggle to VPK `Switch`; keep VPK `Toggle` as toolbar pressed-button component |
| Styling toggle-on state with `data-[state=on]` | Use primitive-specific selectors (`data-pressed` for `Toggle`, `data-checked` for `Switch`) |
| Using custom inline SVG paths for ADS Toggle icons | Use `@atlaskit/icon/core/check-mark` and `@atlaskit/icon/core/cross` in VPK `<Icon>` wrapper |
| Oversizing the default Switch thumb (e.g., `size-5` / 20px) for ADS Toggle parity | Keep ADS default thumb at 12px with matching track geometry so icons stay visible |
| Implementing ADS Toggle with a plain `w-10 h-6` root and no content-box border/padding parity | Match ADS geometry model: content-box track + explicit border + inner padding + 3px icon inset |
| Sizing atlaskit icons via wrapper `className="size-*"` | Pass `size="small"` or `size="medium"` directly to the atlaskit icon component |
| `<Icon render={<SearchIcon label="" />} className="size-3" />` | `<Icon render={<SearchIcon label="" size="small" />} />` — atlaskit SVGs have fixed internal dimensions |
| Using raw atlaskit icon `color` prop (`color="var(--ds-icon-success)"`) | Wrap in VPK `<Icon>` with Tailwind class: `<Icon render={<StatusSuccessIcon label="" />} className="text-icon-success" />` |
| Adding static `underline` class to link triggers | VPK `<Link>` handles underline-on-hover natively — never add `underline` or `underline-offset-*` classes |
| Using `LEGACY_size` prop on atlaskit icons | `LEGACY_size` does not exist on `NewCoreIconProps` — use `size="small"` or `size="medium"` |
| Maintaining thin ADS wrapper components (re-exports / single-element wrappers) | Consolidate into the existing VPK component that covers the same use case |
| Conditional `gap-0.5` applied only when icon/metric children present | Include gap in CVA size variants — `gap` is harmless with single children |
| Using separate div elements for visual separators | Use `border-right` on the adjacent element instead (e.g., split button separator is `border-r border-r-white/65` on primary button, not a `<div className="w-px bg-white/65">`) |
| Guessing inner gap values without extracting from ADS | Extract `gap` from the inner flex container per size variant via computed styles |
| Hardcoded `gap-0.5` (2px) for all sizes | Extract per-size gap from ADS: e.g., compact `gap-1` (4px), spacious `gap-1.5` (6px) |
| Using a simple 6-point flat-top hexagon for agent avatars | ADS hexagon is **pointy-top** (vertex at top/bottom) with 42-point rounded-corner polygon — always extract the clip-path from `atlassian.design` via computed styles |
| Duplicating shape classes (`rounded-full`, `clip-path`) in consumer wrappers around Avatar | Delegate to Avatar's `shape` prop — Avatar owns all shape rendering (circle, square, hexagon) |
| Putting `after:rounded-*` in CVA `size` variants alongside `shape` variants | Keep `after:` pseudo-element styling only in `shape` variants to avoid conflicts with non-circle shapes |
| Rendering atlaskit icons without VPK `<Icon>` wrapper | Always wrap atlaskit icons: `<Icon render={<SearchIcon label="" />} label="Search" />` — provides `data-slot`, accessibility, and styling hooks |
| Using plain `<span>` to wrap atlaskit icons | Use VPK `<Icon>` component instead of `<span className="size-4"><IconName /></span>` |
| Only overriding composed component border-radius conditionally (`data-[selected=true]:rounded-*`) | Apply an unconditional `rounded-*` base class so all states (selected and unselected) use the correct radius — otherwise the inner component's default `rounded-lg` leaks through for non-selected states |
| Parent element `rounded-none` with background color masking child radius | A `<td>` with `bg-muted rounded-none` fills square corners behind a child button's rounded corners, making the button appear unrounded — ensure parent rounding matches or remove conflicting `rounded-none` (e.g., `data-[selected=true]:rounded-none` on today cell only needed for range mode, not single selection) |
| Guessing `border-radius` from ADS token name lookups | Token names (`radius.small`, `radius.medium`) don't map reliably to computed values — e.g., ADS Button computes `6px` (`rounded-md`), not `rounded-sm` (4px). **Always use `getComputedStyle()` on the live ADS examples page.** |
| Skipping computed style extraction for "obvious" properties | Even for properties like `border-radius` that seem predictable, always extract via Playwright — ADS CSS-in-JS compilation can produce unexpected values |
| Using lucide icons for simple geometric indicators (dots, circles) | Use pure CSS: `<span className="size-1.5 rounded-full bg-current" />` — avoids SVG stroke artifacts and reduces bundle size |
| Only supporting `aria-invalid:` without `data-invalid:` on form inputs | Support both: Base UI Field sets `data-invalid` while HTML uses `aria-invalid` — add both selector sets for full compatibility |
| Missing border hover/active tokens on checked state | When checked state changes both bg and border to `primary`, include `data-checked:hover:border-primary-hovered` and `data-checked:active:border-primary-pressed` alongside `bg-*` tokens |
| Using `border` (1px) on radio inputs | ADS Radio uses 2px border — use `border-2` for visual parity |
| Inventing generic feature-based demo names ("With icons", "With descriptions", "Compact spacing") | Mirror ADS docs example structure — use the same titles/grouping from the ADS examples page (e.g., "Default", "Menu structure", "Button item", "Density", "Loading") |
