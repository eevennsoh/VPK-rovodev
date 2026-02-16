import { Message as UiMessage } from "@/components/ui-ai/message";

interface UserMessageBubbleProps {
	surface: "sidebar" | "fullscreen";
	messageText: string;
}

export function UserMessageBubble({
	surface,
	messageText,
}: Readonly<UserMessageBubbleProps>): React.ReactElement {
	if (surface === "sidebar") {
		return (
			<UiMessage from="user" className="pl-6">
				<div className="ml-auto max-w-[85%] rounded-xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
					{messageText}
				</div>
			</UiMessage>
		);
	}

	return (
		<UiMessage from="user">
			<div className="ml-auto max-w-[85%] rounded-xl rounded-bl-xl rounded-br-sm rounded-tl-xl bg-primary px-4 py-3 text-sm text-primary-foreground">
				{messageText}
			</div>
		</UiMessage>
	);
}
