# Accessibility Patterns for Component Refactoring

> Guidelines for building accessible components during the tidy workflow.

## Core Principles

| Principle         | Description                                                              |
| ----------------- | ------------------------------------------------------------------------ |
| **Semantic HTML** | Use correct elements (`button`, `nav`, `main`, not `div` for everything) |
| **Keyboard**      | All interactive elements reachable and operable via keyboard             |
| **Screen Reader** | Proper labels, roles, and live regions                                   |
| **Visual**        | Sufficient contrast, focus indicators, motion preferences                |

## Quick Checklist

| Element              | Required                                                 |
| -------------------- | -------------------------------------------------------- |
| Interactive elements | `<button>`, `<a>`, `<input>` (not `<div onClick>`)       |
| Icon-only buttons    | `aria-label="Description"`                               |
| Form fields          | Associated `<label>` or `aria-label`                     |
| Images               | Meaningful `alt` text (or empty `alt=""` for decorative) |
| Modals               | Focus trap, Escape to close, restore focus on close      |
| Dynamic content      | `aria-live` regions for updates                          |

## When to Add Accessibility During Refactoring

| If You Find...             | Add...                                      |
| -------------------------- | ------------------------------------------- |
| `<div onClick>`            | Replace with `<button>`                     |
| Icon-only button           | `aria-label` describing action              |
| Form field without label   | Associated `<label>` element                |
| Modal/dialog               | Focus trap, Escape handler, `role="dialog"` |
| Dynamic content updates    | `aria-live="polite"` region                 |
| Custom interactive element | Keyboard handlers, proper roles             |

## Focus Management

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

## Data Attributes for State

Use data attributes to expose component state for styling and testing:

### `data-state` for Visual States

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

### `data-slot` for Component Identification

```tsx
function Card({ children }: Readonly<CardProps>) {
	return <div data-slot="card">{children}</div>;
}

function CardHeader({ children }: Readonly<CardHeaderProps>) {
	return <div data-slot="card-header">{children}</div>;
}
```

### Common Data Attribute Patterns

| Attribute       | Values                                 | Purpose                 |
| --------------- | -------------------------------------- | ----------------------- |
| `data-state`    | `open`, `closed`, `active`, `inactive` | Visual/behavioral state |
| `data-slot`     | Component name                         | Enable parent styling   |
| `data-disabled` | `true`, `false`                        | Disabled state          |
| `data-selected` | `true`, `false`                        | Selection state         |
