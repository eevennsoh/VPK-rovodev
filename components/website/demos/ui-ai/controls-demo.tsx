export default function ControlsDemo() {
	return (
		<div className="flex flex-col gap-1 rounded border bg-background p-1 shadow-sm">
			<button type="button" className="rounded p-1 hover:bg-muted text-xs">+</button>
			<button type="button" className="rounded p-1 hover:bg-muted text-xs">−</button>
			<button type="button" className="rounded p-1 hover:bg-muted text-xs">⟲</button>
		</div>
	);
}
