export default function WebPreviewDemo() {
	return (
		<div className="w-full rounded-md border">
			<div className="flex items-center gap-2 border-b px-3 py-1.5">
				<div className="flex gap-1">
					<div className="size-2 rounded-full bg-red-400" />
					<div className="size-2 rounded-full bg-yellow-400" />
					<div className="size-2 rounded-full bg-green-400" />
				</div>
				<span className="text-xs text-muted-foreground">localhost:3000</span>
			</div>
			<div className="flex h-16 items-center justify-center text-xs text-muted-foreground">
				Web preview
			</div>
		</div>
	);
}
