"use client";

import {
	OpenIn,
	OpenInTrigger,
	OpenInContent,
	OpenInChatGPT,
	OpenInClaude,
	OpenInSeparator,
	OpenInLabel,
} from "@/components/ui-ai/open-in-chat";

export default function OpenInChatDemo() {
	return (
		<OpenIn query="Explain React hooks">
			<OpenInTrigger />
			<OpenInContent>
				<OpenInLabel>Open in</OpenInLabel>
				<OpenInSeparator />
				<OpenInChatGPT />
				<OpenInClaude />
			</OpenInContent>
		</OpenIn>
	);
}
