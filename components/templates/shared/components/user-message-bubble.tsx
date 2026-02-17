import { Message as UiMessage, MessageContent } from "@/components/ui-ai/message";
import { Button } from "@/components/ui/button";
import DeleteIcon from "@atlaskit/icon/core/delete";

interface UserMessageBubbleProps {
	surface: "sidebar" | "fullscreen";
	messageText: string;
	onDelete?: () => void;
}

export function UserMessageBubble({
	surface,
	messageText,
	onDelete,
}: Readonly<UserMessageBubbleProps>): React.ReactElement {
	return (
		<div className="group/user-msg relative">
			{onDelete ? (
				<span className="absolute -left-8 top-1/2 hidden -translate-y-1/2 group-hover/user-msg:block">
					<Button
						aria-label="Delete message"
						variant="ghost"
						size="icon-sm"
						className="cursor-pointer rounded-full text-icon-subtle [&_svg]:size-3"
						onClick={onDelete}
					>
						<DeleteIcon size="small" label="" />
					</Button>
				</span>
			) : null}
			<UiMessage from="user" className={surface === "sidebar" ? "pl-6" : undefined}>
				<MessageContent
					className={surface === "fullscreen" ? "group-[.is-user]:px-4 group-[.is-user]:py-3" : undefined}
				>
					{messageText}
				</MessageContent>
			</UiMessage>
		</div>
	);
}
