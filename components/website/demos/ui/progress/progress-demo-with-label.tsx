"use client";

import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";

export default function ProgressDemoWithLabel() {
	return (
		<Progress value={56}>
			<ProgressLabel>Upload progress</ProgressLabel>
			<ProgressValue />
		</Progress>
	);
}
