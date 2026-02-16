"use client";

import { ProgressTracker } from "@/components/ui/progress-tracker";

const STEPS = [
	{ id: "1", label: "Create project", state: "done" as const },
	{ id: "2", label: "Configure settings", state: "current" as const },
	{ id: "3", label: "Invite team", state: "todo" as const },
	{ id: "4", label: "Launch", state: "todo" as const },
];

export default function ProgressTrackerDemo() {
	return <ProgressTracker steps={STEPS} />;
}

export function ProgressTrackerDemoDefault() {
	return <ProgressTracker steps={STEPS} />;
}

export function ProgressTrackerDemoAllDone() {
	const steps = [
		{ id: "1", label: "Step 1", state: "done" as const },
		{ id: "2", label: "Step 2", state: "done" as const },
		{ id: "3", label: "Step 3", state: "done" as const },
	];
	return <ProgressTracker steps={steps} />;
}

export function ProgressTrackerDemoAllTodo() {
	const steps = [
		{ id: "1", label: "Select plan", state: "todo" as const },
		{ id: "2", label: "Payment", state: "todo" as const },
		{ id: "3", label: "Confirmation", state: "todo" as const },
	];
	return <ProgressTracker steps={steps} />;
}
