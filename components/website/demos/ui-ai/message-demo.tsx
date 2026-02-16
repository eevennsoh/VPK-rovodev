import { Message, MessageContent } from "@/components/ui-ai/message";

export default function MessageDemo() {
	return (
		<div className="flex w-full flex-col gap-3">
			<Message from="user">
				<MessageContent>Hello!</MessageContent>
			</Message>
			<Message from="assistant">
				<MessageContent>Hi there! How can I help?</MessageContent>
			</Message>
		</div>
	);
}
