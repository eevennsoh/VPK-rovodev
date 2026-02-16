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

These rules are **mandatory** for every refactored component:

### 1. Modular Components

Break designs into independent files. Avoid large, single-file outputs.

```
# Bad: One 500-line file
components/blocks/dashboard/page.tsx  (500 lines)

# Good: Modular structure
components/blocks/dashboard/
├── page.tsx                    (50 lines - composes sub-components)
├── components/
│   ├── dashboard-header.tsx    (80 lines)
│   ├── stats-grid.tsx          (60 lines)
│   ├── activity-feed.tsx       (90 lines)
│   └── quick-actions.tsx       (70 lines)
└── hooks/
    └── use-dashboard-data.ts   (40 lines)
```

**Rule:** Components exceeding 150 lines must be split.

### 2. Logic Isolation

Move event handlers and business logic into custom hooks.

```tsx
// Bad: Logic mixed with UI
function SearchResults() {
	const [results, setResults] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const handleSearch = async (query) => {
		setLoading(true);
		try {
			const data = await fetch(`/api/search?q=${query}`);
			setResults(await data.json());
		} catch (e) {
			setError(e.message);
		} finally {
			setLoading(false);
		}
	};

	// ... 100 more lines of UI
}

// Good: Logic extracted to hook
// hooks/use-search.ts
function useSearch() {
	const [results, setResults] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const search = useCallback(async (query) => {
		setLoading(true);
		try {
			const data = await fetch(`/api/search?q=${query}`);
			setResults(await data.json());
		} catch (e) {
			setError(e.message);
		} finally {
			setLoading(false);
		}
	}, []);

	return { results, loading, error, search };
}

// Component is now pure UI
function SearchResults() {
	const { results, loading, error, search } = useSearch();
	// Clean UI code only
}
```

### 3. Data Decoupling

Move all static text, image URLs, and lists to separate data files.

```tsx
// Bad: Hardcoded data in component
function Navigation() {
	return (
		<nav>
			<NavItem href="/home" icon={HomeIcon} label="Home" />
			<NavItem href="/projects" icon={FolderIcon} label="Projects" />
			<NavItem href="/settings" icon={SettingsIcon} label="Settings" />
		</nav>
	);
}

// Good: Data extracted
// data/navigation.ts
export const NAV_ITEMS = [
	{ href: "/home", icon: HomeIcon, label: "Home" },
	{ href: "/projects", icon: FolderIcon, label: "Projects" },
	{ href: "/settings", icon: SettingsIcon, label: "Settings" },
] as const;

// Component uses data
import { NAV_ITEMS } from "./data/navigation";

function Navigation() {
	return (
		<nav>
			{NAV_ITEMS.map((item) => (
				<NavItem key={item.href} {...item} />
			))}
		</nav>
	);
}
```

**Extract to data files:**

- Navigation items
- Menu options
- Feature lists
- Image URLs and assets
- Static content strings
- Configuration objects

### 4. Type Safety

Every component must define a TypeScript interface named `[ComponentName]Props` and use `Readonly<>` wrapper in the function parameter.

```tsx
// Required pattern for all components
interface ComponentNameProps {
	// Props definition
}

// Example
interface CardProps {
	title: string;
	description?: string;
	variant?: "default" | "elevated" | "outlined";
	children: React.ReactNode;
	onClick?: () => void;
}

export function Card({ title, description, variant = "default", children, onClick }: Readonly<CardProps>) {
	// Implementation
}
```

**Type rules:**

- Define interface as `[ComponentName]Props`, use `Readonly<>` in function parameter
- Export props interface when component is exported
- Use discriminated unions for variant props
- Avoid `any` - use `unknown` with type guards if needed

#### Single Element Wrapping

Each component should wrap exactly ONE HTML element. This ensures predictable behavior when spreading props.

```tsx
// Good: Wraps a single button element
interface ButtonProps extends React.ComponentProps<"button"> {
	variant?: "primary" | "secondary";
}

export function Button({ variant = "primary", className, ...props }: Readonly<ButtonProps>) {
	return <button className={cn(buttonStyles[variant], className)} {...props} />;
}

// Bad: Wraps multiple elements (unpredictable prop spreading)
function Button({ ...props }: ButtonProps) {
	return (
		<div>
			<button {...props} /> {/* Where do the props go? */}
			<span>Icon</span>
		</div>
	);
}
```

Always use `cn()` from `@/lib/utils` to merge className props. Never concatenate class strings manually.

#### Extending HTML Attributes

Extend native element props for full DOM compatibility:

```tsx
// Pattern: Extend React.ComponentProps<'element'>
interface InputProps extends React.ComponentProps<"input"> {
	label?: string;
	error?: string;
}

export function Input({ label, error, className, ...props }: Readonly<InputProps>) {
	return (
		<div>
			{label && <label>{label}</label>}
			<input className={cn(inputStyles, className)} {...props} />
			{error && <span className={errorStyles}>{error}</span>}
		</div>
	);
}
```

#### Variant Styling with CVA

Use `cva()` from `class-variance-authority` for declarative variant management in UI primitives:

```tsx
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva("inline-flex items-center justify-center", {
	variants: {
		variant: { default: "bg-surface-raised", destructive: "bg-bg-danger" },
		size: { sm: "h-8 px-3 text-sm", md: "h-10 px-4" },
	},
	defaultVariants: { variant: "default", size: "md" },
});

interface ButtonProps extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {}

export function Button({ variant, size, className, ...props }: Readonly<ButtonProps>) {
	return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
```

#### Props Spread Last

Always spread props last so user overrides take precedence:

```tsx
// Good: User can override className, aria-label, etc.
<button
  className={cn(baseStyles, className)}
  aria-label={label}
  {...props}
/>

// Bad: Component styles override user props
<button {...props} className={baseStyles} />
```

---

## Code Simplification Rules

Apply these refinements to improve code clarity while preserving functionality:

### 1. Clarity Over Brevity

Prefer explicit, readable code over compact solutions. Avoid nested ternary operators.

```tsx
// Bad: Nested ternary
const status = isLoading ? 'loading' : isError ? 'error' : isSuccess ? 'success' : 'idle';

// Good: Explicit conditions
function getStatus() {
  if (isLoading) return 'loading';
  if (isError) return 'error';
  if (isSuccess) return 'success';
  return 'idle';
}
````

### 2. Reduce Unnecessary Complexity

Eliminate redundant nesting and simplify conditionals.

```tsx
// Bad: Deeply nested callbacks
useEffect(() => {
	fetchData().then((data) => {
		processData(data).then((result) => {
			saveResult(result).then(() => {
				notifyUser();
			});
		});
	});
}, []);

// Good: Flat async/await
useEffect(() => {
	async function loadAndProcess() {
		const data = await fetchData();
		const result = await processData(data);
		await saveResult(result);
		notifyUser();
	}
	loadAndProcess();
}, []);
```

### 3. Extract Complex Conditions

Move complex boolean expressions to named variables.

```tsx
// Bad: Inline complex condition
if (user && user.permissions && user.permissions.includes("admin") && !user.suspended) {
	showAdminPanel();
}

// Good: Named condition
const canAccessAdmin = user?.permissions?.includes("admin") && !user?.suspended;
if (canAccessAdmin) {
	showAdminPanel();
}
```

### 4. React 19 Patterns

When refactoring, update legacy React patterns:

| Legacy | Modern (React 19) |
|--------|-------------------|
| `useContext(Ctx)` | `use(Ctx)` (import from `react`) |
| `<Ctx.Provider value={...}>` | `<Ctx value={...}>` |
| `forwardRef((props, ref) => ...)` | Regular component with `ref` prop |
| `setState(!value)` | `setState(prev => !prev)` |

```tsx
// Before
import { useContext, forwardRef } from "react";
const value = useContext(MyContext);
const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => (
	<input ref={ref} {...props} />
));

// After
import { use } from "react";
const value = use(MyContext);
function Input({ ref, ...props }: Readonly<InputProps>) {
	return <input ref={ref} {...props} />;
}
```

### 5. Derive During Render

If a value can be computed from existing state or props, compute it inline or with `useMemo`. Do not store in state + sync with useEffect.

```tsx
// Bad: unnecessary state + effect
const [fullName, setFullName] = useState('');
useEffect(() => setFullName(`${first} ${last}`), [first, last]);

// Good: derive during render
const fullName = `${first} ${last}`;

// Good: derive with memoization for expensive computations
const sortedItems = useMemo(() => items.toSorted((a, b) => a.name.localeCompare(b.name)), [items]);
```

### 6. Project Standards

- Use `function` keyword over arrow functions for top-level functions
- Use explicit return type annotations for exported functions
- Follow proper import sorting (ES modules)
- Maintain consistent naming conventions

### 7. Preserve Helpful Abstractions

Don't remove abstractions that improve organization - only eliminate truly redundant ones.

**What to simplify:**

- Nested ternary operators → switch/if-else chains
- Deeply nested callbacks → named async functions
- Redundant wrappers → inline when clearer
- Inconsistent patterns → align with project standards
- Stale-closure setState → functional updates (`setState(prev => ...)`)
- Falsy `&&` rendering → ternary to avoid rendering `0` (`count > 0 ? <Foo /> : null`)
- Event logic in effects → move interaction-triggered logic to event handlers

**What to preserve:**

- Helpful abstractions that improve organization
- Type safety (don't weaken types for brevity)
- Readable structure (don't over-compress)
- Useful comments that explain "why"

---

## Composition Patterns

### Avoid Boolean Prop Proliferation

Never accumulate boolean props. Use compound components, lifting state, or composing internals.

```tsx
// Bad: Boolean prop explosion
<Button
  isLoading
  isDisabled
  isCompact
  isFullWidth
  isPrimary
  hasIcon
  hasDropdown
/>

// Good: Compound components
<Button appearance="primary" size="compact" width="full">
  <Button.Icon><AddIcon /></Button.Icon>
  <Button.Label>Create</Button.Label>
  <Button.Dropdown>
    <DropdownItem>Option 1</DropdownItem>
  </Button.Dropdown>
</Button>
```

### Compound Component Pattern

Use when components have multiple related parts sharing implicit state.

#### Standard Naming Conventions

| Name          | Purpose                                               |
| ------------- | ----------------------------------------------------- |
| `Root`        | Top-level container providing context                 |
| `Trigger`     | Element that activates something (opens menu, dialog) |
| `Content`     | Main content area that appears/changes                |
| `Header`      | Top section of a container                            |
| `Body`        | Main content section                                  |
| `Footer`      | Bottom section of a container                         |
| `Title`       | Primary heading text                                  |
| `Description` | Secondary descriptive text                            |
| `Item`        | Individual item in a list/collection                  |
| `List`        | Container for multiple items                          |

#### Implementation Example

```tsx
// Implementation
const TabsContext = createContext<TabsContextValue | null>(null);

function Tabs({ children, defaultValue }: Readonly<TabsProps>) {
	const [activeTab, setActiveTab] = useState(defaultValue);

	return <TabsContext.Provider value={{ activeTab, setActiveTab }}>{children}</TabsContext.Provider>;
}

Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

// Usage
<Tabs defaultValue="tab1">
	<Tabs.List>
		<Tabs.Tab value="tab1">First</Tabs.Tab>
		<Tabs.Tab value="tab2">Second</Tabs.Tab>
	</Tabs.List>
	<Tabs.Panel value="tab1">Content 1</Tabs.Panel>
	<Tabs.Panel value="tab2">Content 2</Tabs.Panel>
</Tabs>;
```

### Lift State Up

When multiple components need the same state, lift it to the nearest common ancestor.

```tsx
// Bad: Duplicated state
function FilterPanel() {
	const [filters, setFilters] = useState({});
	// ...
}

function ResultsList() {
	const [filters, setFilters] = useState({}); // Duplicated!
	// ...
}

// Good: Lifted state
function SearchPage() {
	const [filters, setFilters] = useState({});

	return (
		<>
			<FilterPanel filters={filters} onChange={setFilters} />
			<ResultsList filters={filters} />
		</>
	);
}
```

### Controlled vs Uncontrolled

Support both patterns for maximum flexibility. See `references/patterns.md` for full examples.

```tsx
interface ToggleProps {
  // Controlled mode
  isChecked?: boolean;
  onChange?: (isChecked: boolean) => void;
  // Uncontrolled mode
  defaultChecked?: boolean;
  // Common
  label: string;
}

function Toggle({
  isChecked: controlledChecked,
  onChange,
  defaultChecked = false,
  label,
}: Readonly<ToggleProps>) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);

  const isControlled = controlledChecked !== undefined;
  const checked = isControlled ? controlledChecked : internalChecked;

  const handleChange = () => {
    const newValue = !checked;
    if (!isControlled) setInternalChecked(newValue);
    onChange?.(newValue);
  };

  return (
    <label>
      <input type="checkbox" checked={checked} onChange={handleChange} />
      {label}
    </label>
  );
}

// Controlled: parent owns state
<Toggle label="Dark mode" isChecked={darkMode} onChange={setDarkMode} />

// Uncontrolled: component owns state
<Toggle label="Remember me" defaultChecked />
```

### Data Attributes

Use data attributes to expose component state for styling and testing.

#### `data-state` for Visual States

Expose component states to enable CSS-based styling:

```tsx
function Accordion({ open, children }: Readonly<AccordionProps>) {
  return (
    <div data-state={open ? 'open' : 'closed'}>
      {children}
    </div>
  );
}

// Tailwind styling
<div className="data-[state=open]:bg-blue-100 data-[state=closed]:opacity-50">
```

#### `data-slot` for Component Identification

Mark component parts for parent-aware styling:

```tsx
function Card({ children }: Readonly<CardProps>) {
  return <div data-slot="card">{children}</div>;
}

function CardHeader({ children }: Readonly<CardHeaderProps>) {
  return <div data-slot="card-header">{children}</div>;
}

// Parent can style child slots
.card-container [data-slot="card-header"] {
  border-bottom: 1px solid var(--border);
}
```

#### Common Data Attribute Patterns

| Attribute       | Values                                 | Purpose                 |
| --------------- | -------------------------------------- | ----------------------- |
| `data-state`    | `open`, `closed`, `active`, `inactive` | Visual/behavioral state |
| `data-slot`     | Component name                         | Enable parent styling   |
| `data-disabled` | `true`, `false`                        | Disabled state          |
| `data-selected` | `true`, `false`                        | Selection state         |

### Compose Internals

Build complex components by composing simpler internal components.

```tsx
// Internal components (not exported)
function CardHeader({ title, actions }: Readonly<CardHeaderProps>) {
	return (
		<Flex justifyContent="space-between" alignItems="center">
			<Heading size="small">{title}</Heading>
			{actions}
		</Flex>
	);
}

function CardBody({ children }: Readonly<CardBodyProps>) {
	return <Box paddingBlock="space.200">{children}</Box>;
}

function CardFooter({ children }: Readonly<CardFooterProps>) {
	return (
		<Inline space="space.100" alignInline="end">
			{children}
		</Inline>
	);
}

// Public API uses slots
interface CardProps {
	title: string;
	actions?: React.ReactNode;
	children: React.ReactNode;
	footer?: React.ReactNode;
}

export function Card({ title, actions, children, footer }: Readonly<CardProps>) {
	return (
		<Box backgroundColor="elevation.surface.raised" padding="space.200">
			<CardHeader title={title} actions={actions} />
			<CardBody>{children}</CardBody>
			{footer && <CardFooter>{footer}</CardFooter>}
		</Box>
	);
}
```

---

## Accessibility

Build accessible components from the start. These patterns ensure usability for all users.

### Core Principles

| Principle         | Description                                                              |
| ----------------- | ------------------------------------------------------------------------ |
| **Semantic HTML** | Use correct elements (`button`, `nav`, `main`, not `div` for everything) |
| **Keyboard**      | All interactive elements reachable and operable via keyboard             |
| **Screen Reader** | Proper labels, roles, and live regions                                   |
| **Visual**        | Sufficient contrast, focus indicators, motion preferences                |

### Quick Accessibility Checklist

| Element              | Required                                                 |
| -------------------- | -------------------------------------------------------- |
| Interactive elements | `<button>`, `<a>`, `<input>` (not `<div onClick>`)       |
| Icon-only buttons    | `aria-label="Description"`                               |
| Form fields          | Associated `<label>` or `aria-label`                     |
| Images               | Meaningful `alt` text (or empty `alt=""` for decorative) |
| Modals               | Focus trap, Escape to close, restore focus on close      |
| Dynamic content      | `aria-live` regions for updates                          |

### Focus Management

For modals and overlays, manage focus programmatically:

```tsx
function Modal({ isOpen, onClose, children }: Readonly<ModalProps>) {
	const closeButtonRef = useRef<HTMLButtonElement>(null);
	const previousFocusRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (isOpen) {
			// Save current focus
			previousFocusRef.current = document.activeElement as HTMLElement;
			// Move focus into modal
			closeButtonRef.current?.focus();
		} else if (previousFocusRef.current) {
			// Restore focus when closing
			previousFocusRef.current.focus();
		}
	}, [isOpen]);

	// Handle Escape key
	useEffect(() => {
		if (!isOpen) return;

		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return (
		<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
			<button ref={closeButtonRef} onClick={onClose} aria-label="Close">
				<CloseIcon />
			</button>
			{children}
		</div>
	);
}
```

### When to Add Accessibility During Refactoring

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
| `components/ui/`                          | Used by 2+ features, no feature logic | `footer-disclaimer.tsx` |
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

For detailed guidance, see:

- **`references/patterns.md`** - Advanced composition patterns with full examples
