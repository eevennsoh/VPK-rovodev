# Advanced React Composition Patterns

> Detailed patterns for building flexible, maintainable React components.

## Table of Contents

1. [Boolean Prop Alternatives](#boolean-prop-alternatives)
2. [Compound Components](#compound-components)
3. [State Lifting Patterns](#state-lifting-patterns)
4. [Internal Composition](#internal-composition)
5. [Custom Hooks for Logic](#custom-hooks-for-logic)
6. [Controlled vs Uncontrolled](#controlled-vs-uncontrolled)
7. [Polymorphic Components](#polymorphic-components)
8. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
9. [Code Simplification Patterns](#code-simplification-patterns)

---

## Boolean Prop Alternatives

Boolean props seem convenient but quickly become unmanageable. Here are better alternatives:

### Problem: Boolean Prop Explosion

```tsx
// Bad: Accumulating boolean props
<Card isElevated isBordered isClickable isSelected isCompact isLoading hasHeader hasFooter />
```

### Solution 1: Variant Props

Replace related booleans with a single discriminated union:

```tsx
// Good: Single variant prop
interface Readonly<CardProps> {
	variant?: "default" | "elevated" | "outlined";
	size?: "compact" | "default" | "large";
	state?: "idle" | "loading" | "selected";
	children: React.ReactNode;
}

<Card variant="elevated" size="compact" state="loading">
	Content
</Card>;
```

### Solution 2: Compound Components

Replace structural booleans with compositional children:

```tsx
// Instead of hasHeader, hasFooter, hasActions
<Card>
	<Card.Header>Title</Card.Header>
	<Card.Body>Content</Card.Body>
	<Card.Footer>
		<Card.Actions>
			<Button>Save</Button>
		</Card.Actions>
	</Card.Footer>
</Card>
```

### Solution 3: Slot Props

For simpler cases, use slot props instead of booleans:

```tsx
// Instead of hasHeader boolean
interface Readonly<CardProps> {
	header?: React.ReactNode;
	footer?: React.ReactNode;
	actions?: React.ReactNode;
	children: React.ReactNode;
}

<Card header={<Heading>Title</Heading>} footer={<Text>Updated today</Text>} actions={<Button>Save</Button>}>
	Content
</Card>;
```

### Decision Tree: Which Boolean Alternative?

```
Is the boolean about appearance/state?
├─ Yes → Use variant prop with union type
└─ No, it's about structure/content
   ├─ Simple (1-2 slots) → Use slot props
   └─ Complex (3+ related parts) → Use compound components
```

---

## Compound Components

Use when a component has multiple related parts that share implicit state.

### Implementation Pattern

```tsx
// 1. Create shared context
interface TabsContextValue {
	activeTab: string;
	setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
	const context = use(TabsContext);
	if (!context) {
		throw new Error("Tabs compound components must be used within Tabs");
	}
	return context;
}

// 2. Create parent component
interface Readonly<TabsProps> {
	defaultValue: string;
	children: React.ReactNode;
	onChange?: (value: string) => void;
}

function Tabs({ defaultValue, children, onChange }: Readonly<TabsProps>) {
	const [activeTab, setActiveTab] = useState(defaultValue);

	const handleChange = useCallback(
		(value: string) => {
			setActiveTab(value);
			onChange?.(value);
		},
		[onChange]
	);

	return <TabsContext value={{ activeTab, setActiveTab: handleChange }}>{children}</TabsContext>;
}

// 3. Create child components
interface Readonly<TabProps> {
	value: string;
	children: React.ReactNode;
}

function Tab({ value, children }: Readonly<TabProps>) {
	const { activeTab, setActiveTab } = useTabsContext();
	const isActive = activeTab === value;

	return (
		<Pressable onClick={() => setActiveTab(value)} backgroundColor={isActive ? "color.background.selected" : undefined}>
			{children}
		</Pressable>
	);
}

function TabPanel({ value, children }: Readonly<TabProps>) {
	const { activeTab } = useTabsContext();

	if (activeTab !== value) return null;
	return <Box>{children}</Box>;
}

// 4. Attach to parent
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;
Tabs.List = TabList;

// Usage
<Tabs defaultValue="details" onChange={handleTabChange}>
	<Tabs.List>
		<Tabs.Tab value="details">Details</Tabs.Tab>
		<Tabs.Tab value="activity">Activity</Tabs.Tab>
		<Tabs.Tab value="comments">Comments</Tabs.Tab>
	</Tabs.List>

	<Tabs.Panel value="details">
		<DetailsContent />
	</Tabs.Panel>
	<Tabs.Panel value="activity">
		<ActivityFeed />
	</Tabs.Panel>
	<Tabs.Panel value="comments">
		<CommentsList />
	</Tabs.Panel>
</Tabs>;
```

### When to Use Compound Components

- Multiple related sub-components
- Implicit shared state between parts
- Flexible arrangement of children
- Complex component with many optional parts

---

## State Lifting Patterns

### Pattern 1: Lift to Common Ancestor

When siblings need the same state:

```tsx
// Before: Each component manages its own state
function Sidebar() {
	const [isCollapsed, setIsCollapsed] = useState(false);
}

function MainContent() {
	// Needs to know if sidebar is collapsed for layout
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Duplicated!
}

// After: Lift to parent
function AppLayout() {
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

	return (
		<Flex>
			<Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} />
			<MainContent sidebarCollapsed={sidebarCollapsed} />
		</Flex>
	);
}
```

### Pattern 2: Context for Deep State

When state is needed many levels deep:

```tsx
// Create context
interface Readonly<WorkItemModalContextValue> {
	isOpen: boolean;
	workItem: WorkItem | null;
	open: (item: WorkItem) => void;
	close: () => void;
}

const WorkItemModalContext = createContext<WorkItemModalContextValue | null>(null);

// Provider component
function WorkItemModalProvider({ children }: { children: React.ReactNode }) {
	const [workItem, setWorkItem] = useState<WorkItem | null>(null);

	const open = useCallback((item: WorkItem) => setWorkItem(item), []);
	const close = useCallback(() => setWorkItem(null), []);

	return (
		<WorkItemModalContext value={{ isOpen: !!workItem, workItem, open, close }}>
			{children}
			{workItem && <WorkItemModal item={workItem} onClose={close} />}
		</WorkItemModalContext>
	);
}

// Hook for consumers
function useWorkItemModal() {
	const context = use(WorkItemModalContext);
	if (!context) throw new Error("useWorkItemModal must be used within WorkItemModalProvider");
	return context;
}

// Usage anywhere in tree
function KanbanCard({ item }: Readonly<KanbanCardProps>) {
	const { open } = useWorkItemModal();

	return (
		<Pressable onClick={() => open(item)}>
			<Text>{item.title}</Text>
		</Pressable>
	);
}
```

### When to Lift State

| Situation                  | Action                                       |
| -------------------------- | -------------------------------------------- |
| 2 siblings need same state | Lift to parent                               |
| 3+ levels of prop drilling | Use Context                                  |
| Global app state           | Use Context at app root                      |
| Server state               | Use data fetching library (SWR, React Query) |

---

## Internal Composition

Build complex public APIs from simple internal components.

### Pattern: Private Sub-components

```tsx
// Internal components - not exported
function ModalHeader({ title, onClose }: Readonly<ModalHeaderProps>) {
	return (
		<Flex justifyContent="space-between" alignItems="center" padding="space.200">
			<Heading size="medium">{title}</Heading>
			<IconButton icon={CloseIcon} label="Close" onClick={onClose} appearance="subtle" />
		</Flex>
	);
}

function ModalBody({ children }: Readonly<ModalBodyProps>) {
	return (
		<Box padding="space.200" paddingBlockStart="space.0">
			{children}
		</Box>
	);
}

function ModalFooter({ children }: Readonly<ModalFooterProps>) {
	return (
		<Flex justifyContent="flex-end" gap="space.100" padding="space.200" borderTop={`1px solid ${token("color.border")}`}>
			{children}
		</Flex>
	);
}

// Public API - clean and simple
interface Readonly<ModalProps> {
	title: string;
	isOpen: boolean;
	onClose: () => void;
	children: React.ReactNode;
	footer?: React.ReactNode;
	size?: "small" | "medium" | "large";
}

export function Modal({ title, isOpen, onClose, children, footer, size = "medium" }: Readonly<ModalProps>) {
	if (!isOpen) return null;

	return (
		<ModalBackdrop onClick={onClose}>
			<ModalContainer size={size} onClick={(e) => e.stopPropagation()}>
				<ModalHeader title={title} onClose={onClose} />
				<ModalBody>{children}</ModalBody>
				{footer && <ModalFooter>{footer}</ModalFooter>}
			</ModalContainer>
		</ModalBackdrop>
	);
}

// Usage
<Modal
	title="Confirm deletion"
	isOpen={showConfirm}
	onClose={() => setShowConfirm(false)}
	footer={
		<>
			<Button appearance="subtle" onClick={() => setShowConfirm(false)}>
				Cancel
			</Button>
			<Button appearance="danger" onClick={handleDelete}>
				Delete
			</Button>
		</>
	}
>
	<Text>Are you sure you want to delete this item?</Text>
</Modal>;
```

---

## Custom Hooks for Logic

### Pattern: Extract All Business Logic

```tsx
// hooks/use-search.ts
interface UseSearchOptions {
	initialQuery?: string;
	debounceMs?: number;
}

interface UseSearchReturn {
	query: string;
	setQuery: (query: string) => void;
	results: SearchResult[];
	isLoading: boolean;
	error: Error | null;
	search: () => void;
	clear: () => void;
}

function useSearch({ initialQuery = "", debounceMs = 300 }: UseSearchOptions = {}): UseSearchReturn {
	const [query, setQuery] = useState(initialQuery);
	const [results, setResults] = useState<SearchResult[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const debouncedQuery = useDebounce(query, debounceMs);

	const search = useCallback(async () => {
		if (!debouncedQuery.trim()) {
			setResults([]);
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
			if (!response.ok) throw new Error("Search failed");
			const data = await response.json();
			setResults(data.results);
		} catch (e) {
			setError(e instanceof Error ? e : new Error("Unknown error"));
		} finally {
			setIsLoading(false);
		}
	}, [debouncedQuery]);

	const clear = useCallback(() => {
		setQuery("");
		setResults([]);
		setError(null);
	}, []);

	// Auto-search on query change
	useEffect(() => {
		search();
	}, [search]);

	return { query, setQuery, results, isLoading, error, search, clear };
}

// Component is now pure UI
function SearchPanel() {
	const { query, setQuery, results, isLoading, error, clear } = useSearch({ debounceMs: 500 });

	return (
		<Stack space="space.200">
			<TextField value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." elemAfterInput={query && <IconButton icon={CloseIcon} label="Clear" onClick={clear} />} />

			{isLoading && <Spinner />}
			{error && <ErrorMessage message={error.message} />}
			{results.map((result) => (
				<SearchResultCard key={result.id} result={result} />
			))}
		</Stack>
	);
}
```

### What to Extract to Hooks

| Extract                   | Keep in Component               |
| ------------------------- | ------------------------------- |
| API calls                 | JSX rendering                   |
| State management          | Event binding (`onClick`, etc.) |
| Side effects              | Conditional rendering           |
| Computed values           | Styling decisions               |
| Event handlers with logic | Simple pass-through handlers    |

---

## Controlled vs Uncontrolled

Support both patterns for maximum flexibility.

```tsx
interface Readonly<ToggleProps> {
  // Controlled mode
  isChecked?: boolean;
  onChange?: (isChecked: boolean) => void;
  // Uncontrolled mode
  defaultChecked?: boolean;
  // Common props
  label: string;
  isDisabled?: boolean;
}

function Toggle({
  isChecked: controlledChecked,
  onChange,
  defaultChecked = false,
  label,
  isDisabled = false,
}: Readonly<ToggleProps>) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);

  const isControlled = controlledChecked !== undefined;
  const checked = isControlled ? controlledChecked : internalChecked;

  const handleChange = () => {
    const newValue = !checked;

    if (!isControlled) {
      setInternalChecked(newValue);
    }

    onChange?.(newValue);
  };

  return (
    <Inline space="space.100" alignBlock="center">
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={isDisabled}
      />
      <Text>{label}</Text>
    </Inline>
  );
}

// Controlled usage - parent owns state
const [darkMode, setDarkMode] = useState(false);
<Toggle label="Dark mode" isChecked={darkMode} onChange={setDarkMode} />

// Uncontrolled usage - component owns state
<Toggle label="Remember me" defaultChecked onChange={console.log} />
```

---

## Polymorphic Components

Allow the rendered element to be customized for semantic HTML.

```tsx
type PolymorphicProps<E extends React.ElementType> = {
  as?: E;
  children: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<E>, 'as' | 'children'>;

function Text<E extends React.ElementType = 'span'>({
  as,
  children,
  ...props
}: PolymorphicProps<E>) {
  const Component = as || 'span';
  return <Component {...props}>{children}</Component>;
}

// Usage
<Text>Default span</Text>
<Text as="p">Paragraph</Text>
<Text as="label" htmlFor="input">Label</Text>
<Text as={Link} href="/home">Next.js Link</Text>
```

---

## asChild Pattern

The `asChild` pattern lets consumers replace the default rendered element with their own component while preserving all behavior.

### When to Use asChild

- When consumers need to use their own component (e.g., Next.js `Link`, React Router `NavLink`)
- When wrapping elements would break styling or semantics
- When you need to merge behaviors (onClick, className, etc.) with consumer components

### Implementation

```tsx
import { Slot } from '@radix-ui/react-slot';

interface ButtonProps extends React.ComponentProps<'button'> {
  asChild?: boolean;
  variant?: 'primary' | 'secondary';
}

export function Button({
  asChild = false,
  variant = 'primary',
  className,
  ...props
}: Readonly<ButtonProps>) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      className={cn(buttonStyles[variant], className)}
      {...props}
    />
  );
}
```

### Usage Examples

```tsx
// Default: renders as <button>
<Button variant="primary">Click me</Button>

// asChild: renders as Next.js Link with Button styling/behavior
<Button asChild variant="primary">
  <Link href="/dashboard">Go to Dashboard</Link>
</Button>

// asChild: renders as React Router NavLink
<Button asChild>
  <NavLink to="/settings">Settings</NavLink>
</Button>
```

### Event Merging with Slot

Slot automatically merges event handlers:

```tsx
<Button asChild onClick={() => console.log('Button clicked')}>
  <Link href="/page" onClick={() => console.log('Link clicked')}>
    Both handlers fire
  </Link>
</Button>
// Clicking logs: "Link clicked" then "Button clicked"
```

### Manual Implementation (without Radix)

If not using Radix, implement Slot manually:

```tsx
import { cloneElement, isValidElement, Children } from 'react';

function Slot({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) {
  if (!isValidElement(children)) {
    console.warn('Slot requires a single valid React element as children');
    return null;
  }

  return cloneElement(children, {
    ...props,
    ...children.props,
    className: cn(props.className, children.props.className),
    onClick: composeEventHandlers(props.onClick, children.props.onClick),
    // ... merge other handlers as needed
  });
}

function composeEventHandlers<E>(
  ourHandler?: (event: E) => void,
  theirHandler?: (event: E) => void
) {
  return (event: E) => {
    theirHandler?.(event);
    ourHandler?.(event);
  };
}
```

### asChild vs Polymorphic `as`

| Feature | `asChild` | `as` prop |
|---------|-----------|-----------|
| Consumer passes component as... | Child element | Prop value |
| TypeScript experience | Better (child provides types) | Complex generics |
| Merges props/events | Yes (via Slot) | Manual |
| Works with styled components | Yes | Sometimes problematic |
| SSR compatibility | Full | Full |

**Recommendation:** Prefer `asChild` for new components. It provides better TypeScript inference and cleaner prop merging.

---

## Anti-Patterns to Avoid

### 1. Prop Drilling

```tsx
// Bad
<App user={user}>
  <Layout user={user}>
    <Header user={user}>
      <UserMenu user={user} />

// Good: Use context
<UserProvider user={user}>
  <App>
    <Layout>
      <Header>
        <UserMenu /> {/* Gets user from context */}
```

### 2. Logic in JSX

```tsx
// Bad
{
	items
		.filter((i) => i.active && i.date > startDate)
		.sort((a, b) => b.priority - a.priority)
		.slice(0, 10)
		.map((item) => <Item key={item.id} {...item} />);
}

// Good: Compute outside JSX
const displayItems = useMemo(
	() =>
		items
			.filter((i) => i.active && i.date > startDate)
			.sort((a, b) => b.priority - a.priority)
			.slice(0, 10),
	[items, startDate]
);

{
	displayItems.map((item) => <Item key={item.id} {...item} />);
}
```

### 3. Inline Object/Array Props

```tsx
// Bad: Creates new reference every render
<Component style={{ padding: 16 }} items={[1, 2, 3]} />;

// Good: Stable references
const style = useMemo(() => ({ padding: 16 }), []);
const items = useMemo(() => [1, 2, 3], []);
<Component style={style} items={items} />;

// Or extract to module scope if truly static
const STYLE = { padding: 16 };
const ITEMS = [1, 2, 3];
```

### 4. God Components

```tsx
// Bad: One component doing everything
function Dashboard() {
	// 50 lines of state
	// 100 lines of effects
	// 200 lines of handlers
	// 500 lines of JSX
}

// Good: Composed from focused components
function Dashboard() {
	return (
		<DashboardLayout>
			<DashboardHeader />
			<DashboardStats />
			<DashboardActivityFeed />
			<DashboardQuickActions />
		</DashboardLayout>
	);
}
```

---

## Code Simplification Patterns

Patterns for improving code clarity while preserving functionality. The goal is readable, maintainable code—not the shortest possible code.

### Avoid Nested Ternaries

Nested ternary operators are hard to read and maintain. Replace with explicit conditionals.

```tsx
// Bad: Nested ternary chain
const message = isLoading ? "Loading..." : isError ? error.message : data ? `Found ${data.length} items` : "No results";

// Good: Explicit function
function getMessage(): string {
	if (isLoading) return "Loading...";
	if (isError) return error.message;
	if (data) return `Found ${data.length} items`;
	return "No results";
}

// Also good: Switch for enum-like values
function getStatusMessage(status: Status): string {
	switch (status) {
		case "loading":
			return "Loading...";
		case "error":
			return "Something went wrong";
		case "success":
			return "Complete!";
		case "idle":
			return "Ready";
	}
}
```

### Simplify Deeply Nested Callbacks

Replace callback chains with async/await for better readability.

```tsx
// Bad: Callback pyramid
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
	async function loadAndProcess(): Promise<void> {
		const data = await fetchData();
		const result = await processData(data);
		await saveResult(result);
		notifyUser();
	}
	loadAndProcess();
}, []);

// Also good: Extract to custom hook
function useDataPipeline() {
	const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

	const process = useCallback(async () => {
		setStatus("loading");
		const data = await fetchData();
		const result = await processData(data);
		await saveResult(result);
		setStatus("done");
		notifyUser();
	}, []);

	return { status, process };
}
```

### Extract Complex Conditions

Move complex boolean expressions to named variables or functions.

```tsx
// Bad: Inline complex condition
if (user && user.permissions && user.permissions.includes("admin") && !user.suspended && user.verified) {
	showAdminPanel();
}

// Good: Named condition
const canAccessAdmin = user?.permissions?.includes("admin") && !user?.suspended && user?.verified;
if (canAccessAdmin) {
	showAdminPanel();
}

// Better: Function for reusable logic
function canUserAccessAdmin(user: User | null): boolean {
	if (!user) return false;
	return user.permissions?.includes("admin") && !user.suspended && user.verified;
}

if (canUserAccessAdmin(user)) {
	showAdminPanel();
}
```

### Flatten Nested Conditionals

Use early returns to reduce nesting depth.

```tsx
// Bad: Deeply nested
function processOrder(order: Order | null): Result {
	if (order) {
		if (order.items.length > 0) {
			if (order.status === "pending") {
				if (order.paymentVerified) {
					return submitOrder(order);
				} else {
					return { error: "Payment not verified" };
				}
			} else {
				return { error: "Order not pending" };
			}
		} else {
			return { error: "No items in order" };
		}
	} else {
		return { error: "No order provided" };
	}
}

// Good: Early returns (guard clauses)
function processOrder(order: Order | null): Result {
	if (!order) return { error: "No order provided" };
	if (order.items.length === 0) return { error: "No items in order" };
	if (order.status !== "pending") return { error: "Order not pending" };
	if (!order.paymentVerified) return { error: "Payment not verified" };

	return submitOrder(order);
}
```

### Use Consistent Function Declarations

Prefer `function` keyword for top-level functions for consistency and hoisting.

```tsx
// Inconsistent: Mixed styles
const fetchUser = async (id: string) => {
	// ...
};

const processUser = (user: User) => {
	// ...
};

function renderUser(user: User) {
	// ...
}

// Good: Consistent function declarations
async function fetchUser(id: string): Promise<User> {
	// ...
}

function processUser(user: User): ProcessedUser {
	// ...
}

function renderUser(user: User): JSX.Element {
	// ...
}

// Arrow functions are fine for:
// - Callbacks: items.map(item => item.name)
// - Event handlers in JSX: onClick={() => setOpen(true)}
// - Short inline functions
```

### Simplify Object/Array Operations

Extract complex transformations to named steps.

```tsx
// Bad: Dense chained operations
const result = items
	.filter((i) => i.active && i.date > startDate && categories.includes(i.category))
	.sort((a, b) => b.priority - a.priority || new Date(b.date).getTime() - new Date(a.date).getTime())
	.slice(0, limit)
	.map((i) => ({ ...i, displayName: `${i.category}: ${i.name}` }));

// Good: Named intermediate steps
const activeItems = items.filter((item) => item.active && item.date > startDate && categories.includes(item.category));

const sortedItems = activeItems.sort((a, b) => {
	// Primary sort: by priority (descending)
	if (b.priority !== a.priority) return b.priority - a.priority;
	// Secondary sort: by date (descending)
	return new Date(b.date).getTime() - new Date(a.date).getTime();
});

const topItems = sortedItems.slice(0, limit);

const result = topItems.map((item) => ({
	...item,
	displayName: `${item.category}: ${item.name}`,
}));
```

### Avoid Over-Simplification

Don't sacrifice clarity for brevity.

```tsx
// Over-simplified: Clever but confusing
const x = ((a && b) || c) ?? d;
const y = +!!value;
const z = ~arr.indexOf(item);

// Better: Explicit intent
const x = a && b ? b : c ?? d;
const y = value ? 1 : 0;
const z = arr.includes(item);

// Over-simplified: One-liner that's hard to debug
const process = (data) =>
	data?.items
		?.filter(Boolean)
		.map((x) => x.value * 2)
		.reduce((a, b) => a + b, 0) ?? 0;

// Better: Readable steps
function processData(data: Data | null): number {
	if (!data?.items) return 0;

	const values = data.items.filter(Boolean).map((item) => item.value * 2);

	return values.reduce((sum, value) => sum + value, 0);
}
```

### When to Simplify vs. When to Preserve

| Simplify                     | Preserve                       |
| ---------------------------- | ------------------------------ |
| Nested ternaries (>1 level)  | Simple ternaries (`x ? a : b`) |
| Callback pyramids            | Single callback chains         |
| Complex inline conditions    | Simple boolean checks          |
| Inconsistent function styles | Established patterns           |
| Redundant wrappers           | Useful abstractions            |
| Dense one-liners             | Readable chains                |

**Key principle:** Code should be readable by someone unfamiliar with it. If you have to think hard to understand what code does, it needs simplification.
