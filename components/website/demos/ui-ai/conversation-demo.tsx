import { Conversation, ConversationContent } from "@/components/ui-ai/conversation";
import { Message, MessageContent } from "@/components/ui-ai/message";

export default function ConversationDemo() {
	return (
		<Conversation className="w-full">
			<ConversationContent className="max-h-32">
				<Message from="user">
					<MessageContent>Hello</MessageContent>
				</Message>
				<Message from="assistant">
					<MessageContent>Hi! How can I help?</MessageContent>
				</Message>
			</ConversationContent>
		</Conversation>
	);
}
