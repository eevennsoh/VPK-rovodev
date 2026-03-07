"use client";

import { useState } from "react";
import {
	ScrubBarContainer,
	ScrubBarProgress,
	ScrubBarThumb,
	ScrubBarTimeLabel,
	ScrubBarTrack,
} from "@/components/ui-audio/scrub-bar";

function ScrubBarPreview() {
	const duration = 100;
	const [time, setTime] = useState(30);

	return (
		<div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 p-4">
			<ScrubBarContainer duration={duration} onScrub={setTime} value={time}>
				<ScrubBarTimeLabel
					className="w-10 text-center text-text-subtle"
					time={time}
				/>
				<ScrubBarTrack className="mx-2">
					<ScrubBarProgress />
					<ScrubBarThumb />
				</ScrubBarTrack>
				<ScrubBarTimeLabel
					className="w-10 text-center text-text-subtle"
					time={duration}
				/>
			</ScrubBarContainer>
		</div>
	);
}

export default function ScrubBarDemo() {
	return <ScrubBarPreview />;
}

export function ScrubBarDemoDefault() {
	return <ScrubBarPreview />;
}
