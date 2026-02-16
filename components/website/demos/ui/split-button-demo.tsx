"use client";

import { SplitButton } from "@/components/ui/split-button";

const ITEMS = [
	{ label: "Save as draft", onClick: () => {} },
	{ label: "Save and publish", onClick: () => {} },
	{ label: "Schedule", onClick: () => {} },
];

export default function SplitButtonDemo() {
	return <SplitButton label="Save" items={ITEMS} />;
}

export function SplitButtonDemoDefault() {
	return <SplitButton label="Save" items={ITEMS} />;
}

export function SplitButtonDemoOutline() {
	return <SplitButton label="Actions" variant="outline" items={ITEMS} />;
}

export function SplitButtonDemoDestructive() {
	const items = [
		{ label: "Move to trash", onClick: () => {} },
		{ label: "Delete permanently", onClick: () => {} },
	];
	return <SplitButton label="Delete" variant="destructive" items={items} />;
}

export function SplitButtonDemoDisabled() {
	return <SplitButton label="Save" items={ITEMS} disabled />;
}

export function SplitButtonDemoVariants() {
	return (
		<div className="flex flex-wrap items-center gap-4">
			<SplitButton label="Default" items={ITEMS} />
			<SplitButton label="Outline" variant="outline" items={ITEMS} />
			<SplitButton label="Secondary" variant="secondary" items={ITEMS} />
			<SplitButton label="Ghost" variant="ghost" items={ITEMS} />
		</div>
	);
}
