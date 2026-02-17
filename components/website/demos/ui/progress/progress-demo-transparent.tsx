"use client";

import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";

export default function ProgressDemoTransparent() {
	return (
		<div className="flex w-full flex-col gap-6">
			<Progress value={40} variant="transparent">
				<ProgressLabel>Processing…</ProgressLabel>
				<ProgressValue />
			</Progress>
			<Progress value={80} variant="transparent" />
		</div>
	);
}
