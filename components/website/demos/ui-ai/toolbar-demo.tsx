export default function ToolbarDemo() {
	return (
		<div className="flex items-center gap-1 rounded border bg-background px-2 py-1 text-xs text-muted-foreground shadow-sm">
			<button type="button" className="rounded px-2 py-0.5 hover:bg-muted">Edit</button>
			<button type="button" className="rounded px-2 py-0.5 hover:bg-muted">Copy</button>
			<button type="button" className="rounded px-2 py-0.5 hover:bg-muted">Delete</button>
		</div>
	);
}
