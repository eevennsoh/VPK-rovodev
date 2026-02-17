"use client";

import { Progress, ProgressLabel } from "@/components/ui/progress";

export default function ProgressDemoIndeterminate() {
	return (
		<div className="flex w-full flex-col gap-6">
			<Progress isIndeterminate>
				<ProgressLabel>Loading…</ProgressLabel>
			</Progress>
			<Progress isIndeterminate variant="success">
				<ProgressLabel>Processing…</ProgressLabel>
			</Progress>
		</div>
	);
}
