# Plan: Tidy Up Registry Naming Convention

## Context

The `components/website/registry.ts` file has inconsistent naming that doesn't match project conventions:
- `AI_DEMOS` doesn't reflect the `ui-ai/` folder or the "UI AI" label used on the website
- The word "example" is used throughout but the project convention is "demo"
- Overview and variant consts (`UI_DEMOS` vs `UI_EXAMPLE_DEMOS`) have confusing naming that doesn't communicate intent

## Naming Changes Summary

| Current | New | Reason |
|---|---|---|
| `UI_DEMOS` (overview) | `UI_DEMO` | One overview per component |
| `AI_DEMOS` (overview) | `UI_AI_DEMO` | Match `ui-ai/` folder; one overview |
| `UI_EXAMPLE_DEMOS` (variants) | `UI_VARIANT_DEMOS` | Drop "example"; explicit "variants" |
| `AI_EXAMPLE_DEMOS` (variants) | `UI_AI_VARIANT_DEMOS` | Match `ui-ai/` folder; drop "example" |
| `getExampleDemoComponent` | `getVariantDemoComponent` | Match `get[Qualifier]DemoComponent` pattern |
| `button-example-default` (slug keys) | `button-demo-default` | "demo" not "example" |
| `ButtonExampleDefault` (exports) | `ButtonDemoDefault` | Match slug convention |

No changes to `BLOCK_DEMOS`, `TEMPLATE_DEMOS`, `CHART_DEMOS`, `UTILITY_DEMOS`, `getDemoComponent`, or `getChartDemoComponent` — those are already correct.

## Files to Modify

### 1. `components/website/registry.ts` (~1073 lines)
- Rename 4 const declarations + their references in `getDemoComponent` and the variant lookup function
- Rename `getExampleDemoComponent` → `getVariantDemoComponent`
- ~763 slug keys: `-example-` → `-demo-`
- ~763 export references: `mod.XExampleY` → `mod.XDemoY`

### 2. 85 demo files in `components/website/demos/ui/` and `demos/ui-ai/`
- 679 named export functions: `Example` → `Demo` (e.g., `ButtonExampleDefault` → `ButtonDemoDefault`)

### 3. `app/data/details/ui.ts` (~2988 lines)
- ~668 demoSlug values: `-example-` → `-demo-`

### 4. `app/data/details/ui-ai.ts` (~351 lines)
- ~12 demoSlug values: `-example-` → `-demo-`

### 5. `components/website/component-doc/components/doc-examples.tsx`
- Update import: `getExampleDemoComponent` → `getVariantDemoComponent`

### 6. `.cursor/skills/vpk-component/SKILL.md`
- Update const names, slug patterns, export naming conventions in documentation

### 7. `.cursor/skills/vpk-component-ai/SKILL.md`
- Update `AI_EXAMPLE_DEMOS` → `UI_AI_VARIANT_DEMOS`

## Execution Strategy

Mechanical rename using `replace_all` and systematic find-replace. Order matters in `registry.ts` to avoid name collisions:

**Step 1 — Const renames in `registry.ts`** (sequential)
1. `AI_DEMOS` → `UI_AI_DEMO`
2. `UI_DEMOS` → `UI_DEMO`
3. `UI_EXAMPLE_DEMOS` → `UI_VARIANT_DEMOS`
4. `AI_EXAMPLE_DEMOS` → `UI_AI_VARIANT_DEMOS`

**Step 2 — Function rename in `registry.ts` + consumer**
- `getExampleDemoComponent` → `getVariantDemoComponent` in `registry.ts` and `doc-examples.tsx`

**Step 3 — Slug keys + export refs in `registry.ts`**
- `-example-` → `-demo-` in all slug keys
- `Example` → `Demo` in all `mod.XExampleY` references

**Step 4 — Export renames across 85 demo files**
- `export function XExampleY` → `export function XDemoY`
- Use `replace_all` with `Example` → `Demo` in each file (scoped to function names)

**Step 5 — demoSlug values in data files**
- `-example-` → `-demo-` in `app/data/details/ui.ts` and `app/data/details/ui-ai.ts`

**Step 6 — Skill docs**
- Update `.cursor/skills/vpk-component/SKILL.md` and `vpk-component-ai/SKILL.md`

## Verification

1. `pnpm run lint`
2. `pnpm tsc --noEmit`
3. Grep for zero remaining `-example-` slugs in `registry.ts` and `app/data/details/`
4. Grep for zero remaining `Example` exports in `components/website/demos/`
5. Grep for zero remaining old const names (`UI_EXAMPLE_DEMOS`, `AI_EXAMPLE_DEMOS`, standalone `AI_DEMOS`)
