import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function LabelDemo() {
	return <Label htmlFor="demo">Email address</Label>;
}

export function LabelDemoDefault() {
	return <Label>Email address</Label>;
}

export function LabelDemoDisabled() {
	return (
		<Field data-disabled={true}>
			<Label htmlFor="label-demo-disabled">Disabled</Label>
			<Input id="label-demo-disabled" placeholder="Disabled" disabled />
		</Field>
	);
}

export function LabelDemoWithCheckbox() {
	return (
		<Field orientation="horizontal">
			<Checkbox id="label-demo-terms" />
			<Label htmlFor="label-demo-terms">Accept terms and conditions</Label>
		</Field>
	);
}

export function LabelDemoWithInput() {
	return (
		<Field>
			<Label htmlFor="label-demo-username">Username</Label>
			<Input id="label-demo-username" placeholder="Username" />
		</Field>
	);
}

export function LabelDemoWithTextarea() {
	return (
		<Field>
			<Label htmlFor="label-demo-message">Message</Label>
			<Textarea id="label-demo-message" placeholder="Message" />
		</Field>
	);
}
