import { Shimmer } from "@/components/ui-ai/shimmer";

export default function ShimmerDemo() {
	return (
		<div className="flex flex-col gap-3">
			<Shimmer className="text-sm">Thinking</Shimmer>
			<Shimmer
				baseColor="var(--color-muted-foreground)"
				baseGradientColor={["#1868db", "#bf63f3", "#fca700"]}
				duration={1.4}
				rotateYDistance={14}
				scaleDistance={1.12}
				spread={2}
				transition={{ ease: "easeInOut", repeatDelay: 0.1 }}
				wave
				xDistance={3}
				yDistance={-2}
				zDistance={12}
				className="text-sm"
			>
				Full wave configuration
			</Shimmer>
		</div>
	);
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

export function ShimmerDemoWave() {
	return (
		<div className="flex flex-col gap-3">
			<Shimmer wave className="text-sm">Wave shimmer enabled</Shimmer>
			<Shimmer wave duration={1.2} className="text-sm">Faster wave shimmer</Shimmer>
		</div>
	);
}

export function ShimmerDemoWaveColors() {
	return (
		<div className="flex flex-col gap-3">
			<Shimmer wave className="text-sm">
				Neutral wave shimmer
			</Shimmer>
			<Shimmer
				baseColor="var(--color-muted-foreground)"
				baseGradientColor={["#1868db", "#bf63f3", "#fca700"]}
				wave
				className="text-sm"
			>
				Dot-inspired gradient highlight
			</Shimmer>
		</div>
	);
}

export function ShimmerDemoWaveGeometry() {
	return (
		<div className="flex flex-col gap-3">
			<Shimmer wave xDistance={1} yDistance={-1} className="text-sm">
				Subtle geometry
			</Shimmer>
			<Shimmer wave xDistance={4} yDistance={-3} className="text-sm">
				Expressive geometry
			</Shimmer>
		</div>
	);
}

export function ShimmerDemoWaveDepth() {
	return (
		<div className="flex flex-col gap-3">
			<Shimmer wave zDistance={6} scaleDistance={1.04} rotateYDistance={6} className="text-sm">
				Soft depth
			</Shimmer>
			<Shimmer wave zDistance={16} scaleDistance={1.16} rotateYDistance={16} className="text-sm">
				Strong depth
			</Shimmer>
		</div>
	);
}

export function ShimmerDemoWaveTimingSpread() {
	return (
		<div className="flex flex-col gap-3">
			<Shimmer wave duration={0.9} spread={1} className="text-sm">
				Tight and fast
			</Shimmer>
			<Shimmer wave duration={1.8} spread={3} className="text-sm">
				Wide and relaxed
			</Shimmer>
		</div>
	);
}

export function ShimmerDemoWaveFullConfig() {
	return (
		<Shimmer
			baseColor="var(--color-muted-foreground)"
			baseGradientColor={["#1868db", "#bf63f3", "#fca700"]}
			duration={1.4}
			rotateYDistance={14}
			scaleDistance={1.12}
			spread={2}
			transition={{ ease: "easeInOut", repeatDelay: 0.1 }}
			wave
			xDistance={3}
			yDistance={-2}
			zDistance={12}
			className="text-sm"
		>
			Full wave configuration
		</Shimmer>
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
