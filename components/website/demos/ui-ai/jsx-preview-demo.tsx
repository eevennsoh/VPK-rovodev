export default function JsxPreviewDemo() {
	return (
		<div className="w-full rounded-md border">
			<div className="border-b px-3 py-1.5 text-xs text-muted-foreground">Preview</div>
			<div className="flex items-center justify-center p-4">
				<button type="button" className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground">
					Click me
				</button>
			</div>
		</div>
	);
}
