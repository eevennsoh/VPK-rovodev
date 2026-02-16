export default function CanvasDemo() {
	return (
		<div className="flex h-24 w-full items-center justify-center rounded border bg-muted/30 text-xs text-muted-foreground">
			<div className="flex items-center gap-4">
				<div className="rounded border bg-background px-2 py-1 shadow-sm">A</div>
				<span>→</span>
				<div className="rounded border bg-background px-2 py-1 shadow-sm">B</div>
			</div>
		</div>
	);
}
