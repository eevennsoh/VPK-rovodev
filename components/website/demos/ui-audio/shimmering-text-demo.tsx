"use client";

import { ShimmeringText } from "@/components/ui-audio/shimmering-text";
import { DemoCard } from "./demo-data";

function ShimmeringTextPreview({
	shimmerColor,
}: Readonly<{ shimmerColor?: string }>) {
	return (
		<DemoCard
			description="Animated gradient text with automatic cycling"
			title="Text Shimmer Effect"
		>
			<div className="bg-bg-neutral/10 flex items-center justify-center rounded-lg py-8">
				<ShimmeringText
					className="text-2xl font-semibold"
					shimmerColor={shimmerColor}
					text="Agent is thinking..."
				/>
			</div>
		</DemoCard>
	);
}

export default function ShimmeringTextDemo() {
	return <ShimmeringTextPreview />;
}

export function ShimmeringTextDemoAccent() {
	return <ShimmeringTextPreview shimmerColor="var(--color-discovery)" />;
}
