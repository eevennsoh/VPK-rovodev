"use client";

import { ConversationBar } from "@/components/ui-audio/conversation-bar";

function ConversationBarPreview() {
	return (
		<div className="flex min-h-[200px] w-full items-center justify-center">
			<div className="w-full max-w-md">
				<ConversationBar
					agentId="demo-agent"
					className="p-4"
					waveformClassName="bg-bg-neutral"
				/>
			</div>
		</div>
	);
}

export default function ConversationBarDemo() {
	return <ConversationBarPreview />;
}

export function ConversationBarDemoDefault() {
	return <ConversationBarPreview />;
}
