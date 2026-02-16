import { Shimmer } from "@/components/ui-ai/shimmer";

export default function ShimmerDemo() {
	return <Shimmer className="text-sm">Thinking...</Shimmer>;
}

export function ShimmerDemoCustomDuration() {
	return (
		<div className="flex flex-col gap-3">
			<Shimmer duration={1} className="text-sm">Fast shimmer (1s)</Shimmer>
			<Shimmer duration={3} className="text-sm">Slow shimmer (3s)</Shimmer>
			<Shimmer duration={5} className="text-sm">Very slow shimmer (5s)</Shimmer>
		</div>
	);
}

export function ShimmerDemoCustomSpread() {
	return (
		<div className="flex flex-col gap-3">
			<Shimmer spread={1} className="text-sm">Narrow spread</Shimmer>
			<Shimmer spread={4} className="text-sm">Wide spread</Shimmer>
			<Shimmer spread={8} className="text-sm">Extra wide spread</Shimmer>
		</div>
	);
}

export function ShimmerDemoHeading() {
	return (
		<div className="flex flex-col gap-3">
			<Shimmer as="h2" className="text-2xl font-bold">Generating response</Shimmer>
			<Shimmer as="span" className="text-xs text-muted-foreground">Processing your request...</Shimmer>
		</div>
	);
}
