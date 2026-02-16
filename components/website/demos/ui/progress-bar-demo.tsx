"use client";

import { ProgressBar, ProgressBarTrack, ProgressBarIndicator, ProgressBarLabel, ProgressBarValue } from "@/components/ui/progress-bar";

export default function ProgressBarDemo() {
	return (
		<ProgressBar value={60}>
			<div className="flex justify-between text-sm">
				<ProgressBarLabel>Loading…</ProgressBarLabel>
				<ProgressBarValue />
			</div>
			<ProgressBarTrack>
				<ProgressBarIndicator />
			</ProgressBarTrack>
		</ProgressBar>
	);
}

export function ProgressBarDemoDefault() {
	return (
		<ProgressBar value={60}>
			<ProgressBarTrack>
				<ProgressBarIndicator />
			</ProgressBarTrack>
		</ProgressBar>
	);
}

export function ProgressBarDemoWithLabel() {
	return (
		<ProgressBar value={75}>
			<div className="flex justify-between text-sm">
				<ProgressBarLabel>Uploading…</ProgressBarLabel>
				<ProgressBarValue />
			</div>
			<ProgressBarTrack>
				<ProgressBarIndicator />
			</ProgressBarTrack>
		</ProgressBar>
	);
}

export function ProgressBarDemoZero() {
	return (
		<ProgressBar value={0}>
			<ProgressBarTrack>
				<ProgressBarIndicator />
			</ProgressBarTrack>
		</ProgressBar>
	);
}

export function ProgressBarDemoComplete() {
	return (
		<ProgressBar value={100}>
			<div className="flex justify-between text-sm">
				<ProgressBarLabel>Complete</ProgressBarLabel>
				<ProgressBarValue />
			</div>
			<ProgressBarTrack>
				<ProgressBarIndicator />
			</ProgressBarTrack>
		</ProgressBar>
	);
}
