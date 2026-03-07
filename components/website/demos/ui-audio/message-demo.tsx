"use client";

import { Message, MessageAvatar, MessageContent } from "@/components/ui-audio/message";
import { Orb } from "@/components/ui-audio/orb";
import { Response } from "@/components/ui-audio/response";

function MessagePreview({
	flat = false,
}: Readonly<{ flat?: boolean }>) {
	return (
		<div className="mx-auto flex h-full max-h-[400px] w-full max-w-2xl flex-col overflow-hidden">
			<div className="flex flex-col gap-4 overflow-y-auto px-4 py-4">
				<Message from="user">
					<MessageContent variant={flat ? "flat" : "contained"}>
						Show me a richer assistant message layout with markdown, lists, and a voice identity treatment.
					</MessageContent>
				</Message>
				<Message from="assistant">
					<MessageAvatar className="self-start">
						<div className="size-full overflow-hidden rounded-full">
							<Orb agentState="thinking" className="size-full" />
						</div>
					</MessageAvatar>
					<MessageContent variant={flat ? "flat" : "contained"}>
						<Response className="text-sm leading-6 text-text">
							{`### Launch summary

- Conversation shell now mirrors the ElevenLabs docs surface
- Assistant messages can render richer markdown through \`Response\`
- Voice identity can be composed with Orb-based avatar content`}
						</Response>
					</MessageContent>
				</Message>
				<Message from="user">
					<MessageContent variant={flat ? "flat" : "contained"}>
						Keep the user response compact so the transcript still reads like a chat log.
					</MessageContent>
				</Message>
			</div>
		</div>
	);
}

export default function MessageDemo() {
	return <MessagePreview />;
}

export function MessageDemoFlat() {
	return <MessagePreview flat />;
}
