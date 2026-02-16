export default function ArtifactDemo() {
	return (
		<div className="w-full rounded-md border">
			<div className="flex items-center justify-between border-b px-3 py-2 text-xs text-muted-foreground">
				<span>Artifact</span>
				<span className="rounded bg-muted px-1.5 py-0.5">React</span>
			</div>
			<div className="p-3 text-xs text-muted-foreground">
				Generated component preview
			</div>
		</div>
	);
}
