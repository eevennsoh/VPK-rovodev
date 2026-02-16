export default function AudioPlayerDemo() {
	return (
		<div className="flex w-full items-center gap-2 rounded border p-2 text-xs text-muted-foreground">
			<button type="button" className="rounded border p-1">▶</button>
			<div className="h-1 flex-1 rounded-full bg-muted">
				<div className="h-full w-1/3 rounded-full bg-primary" />
			</div>
			<span>0:42</span>
		</div>
	);
}
