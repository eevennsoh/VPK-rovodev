import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select";

export default function NativeSelectDemo() {
	return (
		<NativeSelect defaultValue="react">
			<NativeSelectOption value="react">React</NativeSelectOption>
			<NativeSelectOption value="vue">Vue</NativeSelectOption>
			<NativeSelectOption value="svelte">Svelte</NativeSelectOption>
		</NativeSelect>
	);
}

export function NativeSelectDemoBasic() {
	return (
		<NativeSelect>
			<NativeSelectOption value="">Select a fruit</NativeSelectOption>
			<NativeSelectOption value="apple">Apple</NativeSelectOption>
			<NativeSelectOption value="banana">Banana</NativeSelectOption>
			<NativeSelectOption value="blueberry">Blueberry</NativeSelectOption>
			<NativeSelectOption value="grapes" disabled>
				Grapes
			</NativeSelectOption>
			<NativeSelectOption value="pineapple">Pineapple</NativeSelectOption>
		</NativeSelect>
	);
}

export function NativeSelectDemoDefault() {
	return (
		<NativeSelect>
			<NativeSelectOption value="1">Option 1</NativeSelectOption>
			<NativeSelectOption value="2">Option 2</NativeSelectOption>
			<NativeSelectOption value="3">Option 3</NativeSelectOption>
		</NativeSelect>
	);
}

export function NativeSelectDemoDisabled() {
	return (
		<NativeSelect disabled>
			<NativeSelectOption value="">Disabled</NativeSelectOption>
			<NativeSelectOption value="apple">Apple</NativeSelectOption>
			<NativeSelectOption value="banana">Banana</NativeSelectOption>
			<NativeSelectOption value="blueberry">Blueberry</NativeSelectOption>
		</NativeSelect>
	);
}

export function NativeSelectDemoInvalid() {
	return (
		<NativeSelect aria-invalid="true">
			<NativeSelectOption value="">Error state</NativeSelectOption>
			<NativeSelectOption value="apple">Apple</NativeSelectOption>
			<NativeSelectOption value="banana">Banana</NativeSelectOption>
			<NativeSelectOption value="blueberry">Blueberry</NativeSelectOption>
		</NativeSelect>
	);
}

export function NativeSelectDemoSizes() {
	return (
		<div className="flex flex-col gap-4">
			<NativeSelect size="sm">
				<NativeSelectOption value="">Select a fruit</NativeSelectOption>
				<NativeSelectOption value="apple">Apple</NativeSelectOption>
				<NativeSelectOption value="banana">Banana</NativeSelectOption>
				<NativeSelectOption value="blueberry">Blueberry</NativeSelectOption>
			</NativeSelect>
			<NativeSelect size="default">
				<NativeSelectOption value="">Select a fruit</NativeSelectOption>
				<NativeSelectOption value="apple">Apple</NativeSelectOption>
				<NativeSelectOption value="banana">Banana</NativeSelectOption>
				<NativeSelectOption value="blueberry">Blueberry</NativeSelectOption>
			</NativeSelect>
		</div>
	);
}

export function NativeSelectDemoSmall() {
	return (
		<NativeSelect size="sm">
			<NativeSelectOption value="1">Option 1</NativeSelectOption>
			<NativeSelectOption value="2">Option 2</NativeSelectOption>
			<NativeSelectOption value="3">Option 3</NativeSelectOption>
		</NativeSelect>
	);
}

export function NativeSelectDemoWithField() {
	return (
		<Field>
			<FieldLabel htmlFor="native-select-country">Country</FieldLabel>
			<NativeSelect id="native-select-country">
				<NativeSelectOption value="">Select a country</NativeSelectOption>
				<NativeSelectOption value="us">United States</NativeSelectOption>
				<NativeSelectOption value="uk">United Kingdom</NativeSelectOption>
				<NativeSelectOption value="ca">Canada</NativeSelectOption>
				<NativeSelectOption value="au">Australia</NativeSelectOption>
			</NativeSelect>
			<FieldDescription>Select your country of residence.</FieldDescription>
		</Field>
	);
}

export function NativeSelectDemoWithGroups() {
	return (
		<NativeSelect>
			<NativeSelectOption value="">Select a food</NativeSelectOption>
			<NativeSelectOptGroup label="Fruits">
				<NativeSelectOption value="apple">Apple</NativeSelectOption>
				<NativeSelectOption value="banana">Banana</NativeSelectOption>
				<NativeSelectOption value="blueberry">Blueberry</NativeSelectOption>
			</NativeSelectOptGroup>
			<NativeSelectOptGroup label="Vegetables">
				<NativeSelectOption value="carrot">Carrot</NativeSelectOption>
				<NativeSelectOption value="broccoli">Broccoli</NativeSelectOption>
				<NativeSelectOption value="spinach">Spinach</NativeSelectOption>
			</NativeSelectOptGroup>
		</NativeSelect>
	);
}
