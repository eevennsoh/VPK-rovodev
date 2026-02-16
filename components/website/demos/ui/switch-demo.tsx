"use client";

import { useState } from "react";
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function SwitchDemo() {
	const [checked, setChecked] = useState(true);

	return (
		<div className="flex items-center gap-3">
			<Switch checked={checked} onCheckedChange={setChecked} label="Notifications" />
			<span className="text-sm text-muted-foreground">{checked ? "On" : "Off"}</span>
		</div>
	);
}

export function SwitchDemoBasic() {
	return (
		<Field orientation="horizontal">
			<Switch id="switch-basic" />
			<FieldLabel htmlFor="switch-basic">Airplane Mode</FieldLabel>
		</Field>
	);
}

export function SwitchDemoChecked() {
	return (
		<div className="flex items-center gap-2">
			<Label htmlFor="switch-checked">Enabled by default</Label>
			<Switch id="switch-checked" defaultChecked label="Enabled by default" />
		</div>
	);
}

export function SwitchDemoDefault() {
	return (
		<div className="flex items-center gap-2">
			<Label htmlFor="switch-demo">Toggle feature</Label>
			<Switch id="switch-demo" label="Toggle feature" />
		</div>
	);
}

export function SwitchDemoDisabled() {
	return (
		<div className="flex flex-col gap-12">
			<div className="flex items-center gap-2">
				<Switch id="switch-disabled-unchecked" disabled />
				<Label htmlFor="switch-disabled-unchecked">
					Disabled (Unchecked)
				</Label>
			</div>
			<div className="flex items-center gap-2">
				<Switch id="switch-disabled-checked" defaultChecked disabled />
				<Label htmlFor="switch-disabled-checked">Disabled (Checked)</Label>
			</div>
		</div>
	);
}

export function SwitchDemoSizes() {
	return (
		<div className="flex flex-col gap-12">
			<div className="flex items-center gap-2">
				<Switch id="switch-size-sm" size="sm" />
				<Label htmlFor="switch-size-sm">Small</Label>
			</div>
			<div className="flex items-center gap-2">
				<Switch id="switch-size-default" size="default" />
				<Label htmlFor="switch-size-default">Default</Label>
			</div>
			<div className="flex items-center gap-2">
				<Switch id="switch-size-lg" size="lg" />
				<Label htmlFor="switch-size-lg">Large</Label>
			</div>
		</div>
	);
}

export function SwitchDemoSmall() {
	return (
		<div className="flex items-center gap-2">
			<Label htmlFor="switch-sm">Small switch</Label>
			<Switch id="switch-sm" size="sm" label="Small switch" />
		</div>
	);
}

export function SwitchDemoWithDescription() {
	return (
		<FieldLabel htmlFor="switch-focus-mode">
			<Field orientation="horizontal">
				<FieldContent>
					<FieldTitle>Share across devices</FieldTitle>
					<FieldDescription>
						Focus is shared across devices, and turns off when you leave the
						app.
					</FieldDescription>
				</FieldContent>
				<Switch id="switch-focus-mode" />
			</Field>
		</FieldLabel>
	);
}
