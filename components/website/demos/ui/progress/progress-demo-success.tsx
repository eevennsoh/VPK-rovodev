"use client";

import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";

export default function ProgressDemoSuccess() {
	return (
		<div className="flex w-full flex-col gap-6">
			<Progress value={100} variant="success">
				<ProgressLabel>Complete</ProgressLabel>
				<ProgressValue />
			</Progress>
			<Progress value={60} variant="success">
				<ProgressLabel>Uploading…</ProgressLabel>
				<ProgressValue />
			</Progress>
		</div>
	);
}
