---
name: vpk-tidy
description: This skill should be used when the user asks to "tidy up a component", "refactor component",
  "clean up React code", "make component reusable", "extract components", "modularize code",
  "simplify code", "improve code clarity", "refine code", "reduce complexity",
  "this component is too long", "split this component", "break this up",
  "make this cleaner", "this needs refactoring", "organize this code", "too many props",
  "how do I refactor this", or wants to improve component organization, reusability,
  and maintainability.
argument-hint: "<component-path>"
prerequisites: []
produces: []
---

# React Component Tidy

> Refactor React components for reusability, modularity, and maintainability while leveraging existing codebase patterns.

## Quick Rules

| Rule            | Threshold           | Action                             |
| --------------- | ------------------- | ---------------------------------- |
| **Max lines**   | 150                 | Split into sub-components          |
| **Logic**       | Any business logic  | Extract to custom hooks            |
| **Static data** | Lists, URLs, config | Move to `data/` files              |
| **Props**       | All components      | Use `Readonly<ComponentNameProps>` |

---

## Purpose

This skill helps tidy up React components by:

1. **Reusing existing components** - Check if functionality already exists in the codebase
2. **Extending when needed** - Modify existing components to support new use cases
3. **Extracting new primitives** - Break down code into modular, reusable pieces
4. **Following folder conventions** - Place components in the correct location

---

## Quick Start

```bash
/vpk-tidy <path>   # Refactor component with full cleanup
```

---

## Hard Gates: Wrapper Deprecation & Direct UI Migration

Use this section whenever the tidy task includes replacing local wrappers (for example `shared-ui/*`) with direct `components/ui/*` usage.

### Gate 1: Import and Usage Inventory (required)

Before edits, enumerate every reference to the wrapper(s):

```bash
rg -n "blocks/shared-ui/<wrapper-name>|shared-ui/<wrapper-name>" components app
```

If multiple wrappers are involved, run one combined search with alternation:

```bash
rg -n "blocks/shared-ui/(link|tag|lozenge|menu|inline-edit|custom-tooltip|icon-livepage)" components app
```

### Gate 2: API Delta Mapping (required)

Document old API -> new API before touching callsites. Include:

- Removed props
- Renamed props
- Type substitutions
- Behavior differences (render model, controlled/uncontrolled, styling defaults)

Template:

| Wrapper | Old API | New API | Callsite action |
| --- | --- | --- | --- |
| `shared-ui/tag` | `text`, `appearance` | `children`, `shape` | map `text` -> children, `appearance` -> `shape` |
| `shared-ui/link` | `appearance="subtle"` | `className` override | port subtle styling to classes |

### Gate 3: Migrate Callsites Before Deletion (required)

- Update all imports and callsites first.
- Delete wrapper files only after callsites compile.
- If wrapper replacement changes interaction behavior, run route-level smoke checks for each impacted route.

### Gate 4: Residual Import Exhaustiveness Check (required)

After migration and before completion:

```bash
rg -n "blocks/shared-ui/(<wrapper-1>|<wrapper-2>|...)" components app
```

Expected result: no matches for retired wrappers.

### Gate 5: Validation Under Noisy Baselines (required)

Always run:

```bash
pnpm run lint
pnpm tsc --noEmit
```

If repo-wide lint fails due unrelated pre-existing issues, you must also run targeted lint on changed files:

```bash
pnpm exec eslint <changed-file-1> <changed-file-2> ...
```

Report both outcomes clearly:

- Global baseline lint status
- Changed-file lint status
- Typecheck status

### Gate 6: Scoped Visual + Accessibility Verification (required for UI changes)

- Verify every impacted route in browser snapshots (light and dark when feasible).
- Run `ads_analyze_a11y` on changed components.
- Run `ads_analyze_localhost_a11y` on affected routes or scoped selectors.
- Classify findings into:
  - migration regressions introduced by this change
  - unrelated page-shell/tooling/pre-existing issues

---

## Architectural Rules

These rules are **mandatory** for every refactored component. For detailed examples, see `references/patterns.md`.

### 1. Modular Components

Break designs into independent files. Components exceeding 150 lines must be split.

```
components/blocks/dashboard/
├── page.tsx                    (50 lines - composes sub-components)
├── components/
│   ├── dashboard-header.tsx    (80 lines)
│   ├── stats-grid.tsx          (60 lines)
│   └── activity-feed.tsx       (90 lines)
└── hooks/
    └── use-dashboard-data.ts   (40 lines)
```

### 2. Logic Isolation

Move event handlers and business logic into custom hooks. Components should be pure UI; hooks own state and async logic. See `references/patterns.md` § "Custom Hooks for Logic".

### 3. Data Decoupling

Move static text, image URLs, navigation items, menu options, feature lists, and configuration objects to `data/` files. Components iterate over imported data rather than hardcoding values inline.

### 4. Type Safety

Every component must define a TypeScript interface named `[ComponentName]Props` and use `Readonly<>` wrapper in the function parameter.

```tsx
interface CardProps {
	title: string;
	variant?: "default" | "elevated" | "outlined";
	children: React.ReactNode;
}

export function Card({ title, variant = "default", children }: Readonly<CardProps>) {
	// Implementation
}
```

**Type rules:**

- Define interface as `[ComponentName]Props`, use `Readonly<>` in function parameter
- Export props interface when component is exported
- Use discriminated unions for variant props
- Extend `React.ComponentProps<'element'>` for DOM compatibility
- Single element wrapping — one component wraps one HTML element
- Props spread last so user overrides take precedence
- Use `cn()` from `@/lib/utils` to merge className props
- Use `cva()` from `class-variance-authority` for variant styling in UI primitives

---

## Code Simplification Rules

Apply these during refactoring. For detailed examples, see `references/patterns.md` § "Code Simplification Patterns".

| Rule | Guidance |
| --- | --- |
| **Clarity over brevity** | No nested ternaries; use if/else or switch |
| **Flatten nesting** | Async/await over nested `.then()` chains |
| **Named conditions** | Extract complex boolean expressions to named variables |
| **React 19 patterns** | `use(Ctx)` not `useContext()`, `<Ctx value={}>` not `<Ctx.Provider>`, `ref` as prop (no `forwardRef`) |
| **Derive during render** | Compute from state/props inline or `useMemo`; never sync derived state via `useEffect` |
| **Functional setState** | `setState(prev => !prev)` not `setState(!value)` |
| **Safe conditional rendering** | `cond ? <X /> : null` not `count && <X />` (avoids rendering `0`) |
| **Project standards** | `function` keyword for top-level, explicit return types for exports |

**What to simplify:** nested ternaries, callback pyramids, redundant wrappers, inconsistent patterns, stale-closure setState, event logic in effects.

**What to preserve:** helpful abstractions, type safety, readable structure, comments that explain "why".

---

## Composition Patterns

For detailed examples with full code, see `references/patterns.md`.

| Pattern | When to Use |
| --- | --- |
| **Variant props** | Replace related boolean props with a single discriminated union |
| **Compound components** | Multiple related parts sharing implicit state (Root, Trigger, Content, etc.) |
| **Lift state up** | Multiple components need the same state — lift to nearest common ancestor |
| **Controlled + uncontrolled** | Support both patterns for maximum flexibility |
| **Data attributes** | Use `data-state`, `data-slot` for styling and testing |
| **Compose internals** | Build complex components from private sub-components |
| **asChild / polymorphic** | Delegate rendering to consumer-provided element |

**Anti-patterns:** boolean prop proliferation (max 2-3 booleans), prop drilling (use context), god components (split), inline object/array props (extract).

---

## Accessibility

For detailed patterns and focus management examples, see `references/accessibility.md`.

| If You Find...             | Add...                                      |
| -------------------------- | ------------------------------------------- |
| `<div onClick>`            | Replace with `<button>`                     |
| Icon-only button           | `aria-label` describing action              |
| Form field without label   | Associated `<label>` element                |
| Modal/dialog               | Focus trap, Escape handler, `role="dialog"` |
| Dynamic content updates    | `aria-live="polite"` region                 |
| Custom interactive element | Keyboard handlers, proper roles             |

---

## Workflow

### Step 1: Analyze the Target Component

Read the component file to understand:

- What it renders and its responsibilities
- What sub-components or patterns it uses
- What could be extracted as reusable pieces
- What violates the architectural rules

### Step 2: Audit Existing Components

Before creating anything new, search for existing components.

**Search locations:**

```
components/
├── blocks/          # Feature-specific components
│   └── [feature]/
│       ├── page.tsx           # Main feature view
│       └── components/        # Feature-specific sub-components
├── ui/              # Shared UI primitives
└── utils/           # Utility components
```

### Step 2.5: Run Migration Hard Gates (when wrappers are being retired)

If the refactor includes replacing wrapper components with direct primitives:

1. Run import/usage inventory (`rg`)
2. Produce API delta mapping table
3. Migrate callsites first
4. Run residual import check before deleting wrappers

### Step 3: Apply Architectural Rules

For the target component, ensure compliance with all four rules:

1. **Modular** - Split if >150 lines
2. **Logic isolated** - Extract hooks for business logic
3. **Data decoupled** - Move static data to data files
4. **Type safe** - Add `Readonly<ComponentNameProps>` interface

### Step 4: Apply Composition Patterns

Refactor the component structure:

1. Replace boolean props with variants or compound components
2. Lift shared state to common ancestors
3. Compose complex UIs from internal sub-components

### Step 5: Apply Simplification Rules

After structural refactoring, apply code clarity improvements:

1. Replace nested ternaries with if/else or switch
2. Flatten nested callbacks with async/await
3. Extract complex conditions to named variables
4. Align with project coding standards

### Step 6: Validate With Baseline-Aware Reporting

1. Run `pnpm run lint` and `pnpm tsc --noEmit`
2. If global lint is noisy, run targeted changed-file eslint
3. For UI refactors, run route smoke checks + scoped accessibility analysis
4. Report regression vs. pre-existing findings explicitly

---

## Component Placement Guidelines

| Location                                  | When to Use                           | Examples                |
| ----------------------------------------- | ------------------------------------- | ----------------------- |
| `components/ui/`                          | Used by 2+ features, no feature logic | `footer.tsx` |
| `components/blocks/[feature]/components/` | Feature-specific sub-components       | `kanban-card.tsx`       |
| `components/blocks/[feature]/hooks/`      | Feature-specific logic hooks          | `use-board-state.ts`    |
| `components/blocks/[feature]/data/`       | Feature-specific static data          | `board-columns.ts`      |
| `components/utils/`                       | Utility/wrapper components            | `theme-wrapper.tsx`     |

---

## Refactoring Checklist

### Wrapper Deprecation Hard Gates (when applicable)

- [ ] Import/usage inventory completed with `rg`
- [ ] API delta mapping table written (old props/types -> new props/types)
- [ ] All callsites migrated before wrapper deletion
- [ ] Residual import check confirms no references to retired wrappers
- [ ] Global lint + typecheck run, with targeted eslint fallback if baseline is noisy
- [ ] UI route smoke checks completed for each impacted route
- [ ] Accessibility findings classified into regression vs. pre-existing/tooling issues

### Architectural Rules

- [ ] Component is <150 lines (or split into sub-components)
- [ ] Business logic extracted to custom hooks
- [ ] Static data moved to data files
- [ ] Props interface defined as `ComponentNameProps`, used as `Readonly<ComponentNameProps>` in function

### Component API

- [ ] Single Element Wrapping — component wraps one HTML element
- [ ] Props extend `React.ComponentProps<'element'>` for DOM compatibility
- [ ] Prop types exported for consumer use
- [ ] Props spread last (user overrides take precedence)
- [ ] Data attributes used for state-based styling (`data-state`, `data-slot`)
- [ ] Naming conventions followed for compound components (Root, Trigger, Content, etc.)

### Code Simplification

- [ ] No nested ternary operators
- [ ] No unnecessary nesting (max 3 levels)
- [ ] Complex conditions extracted to named variables
- [ ] Consistent function declaration style
- [ ] Helpful abstractions preserved
- [ ] Code is readable without being overly compact
- [ ] No derived state synced via useEffect (compute inline or useMemo)
- [ ] Functional setState for values depending on previous state
- [ ] Explicit conditional rendering (no `&&` with numeric values)

### Composition Patterns

- [ ] No boolean prop proliferation (max 2-3 boolean props)
- [ ] Compound pattern used for related parts
- [ ] State lifted to appropriate level
- [ ] Complex UI composed from internal components

### Accessibility

- [ ] Semantic HTML for interactive elements (`<button>`, not `<div onClick>`)
- [ ] `aria-label` for icon-only buttons
- [ ] Focus management for modals (trap focus, restore on close)
- [ ] Keyboard handlers for custom interactive elements
- [ ] Form fields connected to labels

### Best Practices

- [ ] Each component has single responsibility
- [ ] No deeply nested JSX (>4 levels)
- [ ] Props have sensible defaults
- [ ] No prop drilling (use context for deep state)
- [ ] React 19 patterns (`use()` not `useContext`, no `forwardRef`, no `.Provider`)

---

## References

For detailed guidance with full code examples, see:

- **`references/patterns.md`** — Advanced composition patterns, code simplification, hooks, anti-patterns (1000+ lines)
- **`references/accessibility.md`** — Accessibility patterns, focus management, data attributes
