import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function TextareaDemo() {
	return <Textarea placeholder="Write a message..." className="w-48 min-h-[60px]" />;
}

export function TextareaDemoBasic() {
	return <Textarea placeholder="Type your message here." />;
}

export function TextareaDemoDefault() {
	return <Textarea placeholder="Type your message here..." />;
}

export function TextareaDemoDisabled() {
	return (
		<Field>
			<FieldLabel htmlFor="textarea-demo-disabled">Message</FieldLabel>
			<Textarea
				id="textarea-demo-disabled"
				placeholder="Type your message here."
				disabled
			/>
		</Field>
	);
}

export function TextareaDemoInvalid() {
	return <Textarea placeholder="Type your message here." aria-invalid="true" />;
}

export function TextareaDemoWithDescription() {
	return (
		<Field>
			<FieldLabel htmlFor="textarea-demo-message-2">Message</FieldLabel>
			<Textarea
				id="textarea-demo-message-2"
				placeholder="Type your message here."
				rows={6}
			/>
			<FieldDescription>
				Type your message and press enter to send.
			</FieldDescription>
		</Field>
	);
}

export function TextareaDemoWithLabel() {
	return (
		<Field>
			<FieldLabel htmlFor="textarea-demo-message">Message</FieldLabel>
			<Textarea
				id="textarea-demo-message"
				placeholder="Type your message here."
				rows={6}
			/>
		</Field>
	);
}
