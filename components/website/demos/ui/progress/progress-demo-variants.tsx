"use client";

import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";

export default function ProgressDemoVariants() {
	return (
		<div className="flex w-full flex-col gap-6">
			<Progress value={40} variant="default">
				<ProgressLabel>Default</ProgressLabel>
				<ProgressValue />
			</Progress>
			<Progress value={100} variant="success">
				<ProgressLabel>Success</ProgressLabel>
				<ProgressValue />
			</Progress>
			<Progress value={60} variant="inverse">
				<ProgressLabel>Inverse</ProgressLabel>
				<ProgressValue />
			</Progress>
			<Progress value={50} variant="transparent">
				<ProgressLabel>Transparent</ProgressLabel>
				<ProgressValue />
			</Progress>
		</div>
	);
}
