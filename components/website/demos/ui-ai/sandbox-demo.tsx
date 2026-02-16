export default function SandboxDemo() {
	return (
		<div className="w-full rounded-md border">
			<div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs text-muted-foreground">
				<span className="size-2 rounded-full bg-green-500" />
				Sandbox running
			</div>
			<div className="p-3 font-mono text-xs text-muted-foreground">
				&gt; Ready
			</div>
		</div>
	);
}
