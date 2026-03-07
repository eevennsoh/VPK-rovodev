"use client";

import { VoiceButton } from "@/components/ui-audio/voice-button";
import { DemoCard } from "./demo-data";

function VoiceButtonPreview({
	state = "idle",
}: Readonly<{ state?: "idle" | "recording" | "processing" | "success" | "error" }>) {
	return (
		<DemoCard
			description="Single action button with waveform and shortcut affordances for voice capture."
			title="Voice Button"
		>
			<div className="flex min-h-[120px] items-center justify-center">
				<VoiceButton
					className="min-w-[180px]"
					label="Voice"
					state={state}
					trailing="⌥Space"
					variant="outline"
				/>
			</div>
		</DemoCard>
	);
}

export default function VoiceButtonDemo() {
	return <VoiceButtonPreview />;
}

export function VoiceButtonDemoRecording() {
	return <VoiceButtonPreview state="recording" />;
}
