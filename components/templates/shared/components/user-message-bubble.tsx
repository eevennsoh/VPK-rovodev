import { Message as UiMessage, MessageContent } from "@/components/ui-ai/message";

interface UserMessageBubbleProps {
	surface: "sidebar" | "fullscreen";
	messageText: string;
}

export function UserMessageBubble({
	surface,
	messageText,
}: Readonly<UserMessageBubbleProps>): React.ReactElement {
	return (
		<UiMessage from="user" className={surface === "sidebar" ? "pl-6" : undefined}>
			<MessageContent
				className={surface === "fullscreen" ? "group-[.is-user]:px-4 group-[.is-user]:py-3" : undefined}
			>
				{messageText}
			</MessageContent>
		</UiMessage>
	);
}
