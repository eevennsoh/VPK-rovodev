import { YoloColorBlocks } from "./index";

export default function YoloColorBlocksDemo() {
	return (
		<div className="space-y-8 p-8">
			<div className="space-y-2">
				<h1 className="text-text text-2xl font-semibold">YOLO Color Blocks</h1>
				<p className="text-text-subtle text-sm">
					A simple component demonstrating Figma-to-VPK conversion with grid and absolute positioning variants.
				</p>
			</div>

			<div className="space-y-6">
				<section className="space-y-3">
					<h2 className="text-text text-lg font-medium">Grid Variant (Responsive)</h2>
					<div className="rounded-lg border border-border bg-surface p-4">
						<YoloColorBlocks variant="grid" blockSize="md" />
					</div>
				</section>

				<section className="space-y-3">
					<h2 className="text-text text-lg font-medium">Absolute Variant (Original Design)</h2>
					<div className="rounded-lg border border-border bg-surface p-4">
						<div className="h-[286px] w-[501px]">
							<YoloColorBlocks variant="absolute" />
						</div>
					</div>
				</section>

				<section className="space-y-3">
					<h2 className="text-text text-lg font-medium">Size Variants</h2>
					<div className="grid gap-4 md:grid-cols-3">
						<div className="rounded-lg border border-border bg-surface p-4">
							<p className="mb-2 text-text-subtle text-sm">Small</p>
							<YoloColorBlocks variant="grid" blockSize="sm" />
						</div>
						<div className="rounded-lg border border-border bg-surface p-4">
							<p className="mb-2 text-text-subtle text-sm">Medium</p>
							<YoloColorBlocks variant="grid" blockSize="md" />
						</div>
						<div className="rounded-lg border border-border bg-surface p-4">
							<p className="mb-2 text-text-subtle text-sm">Large</p>
							<YoloColorBlocks variant="grid" blockSize="lg" />
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}
