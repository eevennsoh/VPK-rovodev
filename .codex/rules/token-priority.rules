# Token Selection Priority

When styling VPK components, follow this hierarchy:

## Priority Order

1. **shadcn-theme semantic classes** — `bg-surface-raised`, `text-text-subtle`, `border-border-bold`, `bg-bg-neutral`, etc.
2. **tailwind-theme accent colors** — Decorative hue-based colors only: `bg-blue-400`, `text-purple-500`, `bg-red-50`
3. **Raw `var(--ds-…)` / `token()`** — Only for dynamic values or tokens without any Tailwind mapping

## Tailwind v4 Naming Convention

CSS variables in `shadcn-theme.css` use `--color-*` which Tailwind v4 maps as:

- `--color-text-subtle` → `text-text-subtle` (text utility + token name)
- `--color-icon-danger` → `text-icon-danger` (icons use text utility for color)
- `--color-bg-danger` → `bg-bg-danger` (bg utility + token name)
- `--color-surface-raised` → `bg-surface-raised`
- `--color-border-bold` → `border-border-bold`

The double-prefix (e.g., `bg-bg-*`, `text-text-*`) is correct Tailwind v4 behavior.

## Common Mistakes

| Wrong | Correct |
|---|---|
| `bg-[var(--ds-background-neutral)]` | `bg-bg-neutral` |
| `text-[var(--ds-text-danger)]` | `text-text-danger` |
| `bg-[var(--ds-surface-raised)]` | `bg-surface-raised` |
| `border-[var(--ds-border-bold)]` | `border-border-bold` |
| `bg-white` / `bg-black` | `bg-surface` / `bg-bg-neutral-bold` |

## When tailwind-theme Is Still Needed

Use tailwind-theme accent colors for decorative purposes where no semantic meaning applies:

- `bg-blue-400`, `bg-purple-200` — Decorative accent backgrounds
- `text-blue-600`, `text-teal-500` — Decorative accent text

## When shadcn Aliases Are Appropriate

Inside shadcn/ui primitive components (`components/ui/*`), use shadcn naming (`bg-card`, `text-foreground`). In custom VPK components, prefer ADS semantic names (`bg-surface-raised`, `text-text`).

## Full Token Reference

See `.cursor/skills/vpk-design/references/tokens.md` for the complete mapping of all 200+ semantic tokens.
