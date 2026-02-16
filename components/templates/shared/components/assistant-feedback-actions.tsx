import {
	MessageAction,
	MessageActions,
} from "@/components/ui-ai/message";
import { token } from "@/lib/tokens";
import CopyIcon from "@atlaskit/icon/core/copy";
import ThumbsDownIcon from "@atlaskit/icon/core/thumbs-down";
import ThumbsUpIcon from "@atlaskit/icon/core/thumbs-up";

interface AssistantFeedbackActionsProps {
	messageText: string;
}

export function AssistantFeedbackActions({
	messageText,
}: Readonly<AssistantFeedbackActionsProps>): React.ReactElement {
	const iconColor = token("color.icon.subtlest");

	return (
		<MessageActions className="pl-3">
			<MessageAction tooltip="Like">
				<ThumbsUpIcon label="" color={iconColor} size="small" />
			</MessageAction>
			<MessageAction tooltip="Dislike">
				<ThumbsDownIcon label="" color={iconColor} size="small" />
			</MessageAction>
			<MessageAction
				tooltip="Copy"
				onClick={() => {
					void navigator.clipboard.writeText(messageText);
				}}
			>
				<CopyIcon label="" color={iconColor} size="small" />
			</MessageAction>
		</MessageActions>
	);
}
