"use client";

import { ProgressIndicator } from "@/components/ui/progress-indicator";

export default function ProgressIndicatorDemo() {
	return (
		<div className="flex flex-col gap-4">
			<ProgressIndicator steps={5} currentStep={2} />
		</div>
	);
}

export function ProgressIndicatorDemoDefault() {
	return <ProgressIndicator steps={5} currentStep={2} />;
}

export function ProgressIndicatorDemoStart() {
	return <ProgressIndicator steps={4} currentStep={0} />;
}

export function ProgressIndicatorDemoComplete() {
	return <ProgressIndicator steps={4} currentStep={4} />;
}

export function ProgressIndicatorDemoThreeSteps() {
	return <ProgressIndicator steps={3} currentStep={1} />;
}
