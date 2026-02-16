"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function InputDemo() {
	return <Input placeholder="Type something..." className="w-48" />;
}

export function InputDemoBasic() {
	return <Input type="email" placeholder="Email" />;
}

export function InputDemoDefault() {
	return <Input placeholder="Enter text..." />;
}

export function InputDemoDisabled() {
	return (
		<Field>
			<FieldLabel htmlFor="input-demo-disabled">Email</FieldLabel>
			<Input
				id="input-demo-disabled"
				type="email"
				placeholder="Email"
				disabled
			/>
		</Field>
	);
}

export function InputDemoEmail() {
	return <Input type="email" placeholder="Enter your email" />;
}

export function InputDemoFile() {
	return <Input type="file" />;
}

export function InputDemoForm() {
	return (
		<form className="w-full">
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="form-name">Name</FieldLabel>
					<Input id="form-name" type="text" placeholder="John Doe" />
				</Field>
				<Field>
					<FieldLabel htmlFor="form-email">Email</FieldLabel>
					<Input
						id="form-email"
						type="email"
						placeholder="john@example.com"
					/>
					<FieldDescription>
						We&apos;ll never share your email with anyone.
					</FieldDescription>
				</Field>
				<div className="grid grid-cols-2 gap-4">
					<Field>
						<FieldLabel htmlFor="form-phone">Phone</FieldLabel>
						<Input
							id="form-phone"
							type="tel"
							placeholder="+1 (555) 123-4567"
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="form-country">Country</FieldLabel>
						<Select defaultValue="us">
							<SelectTrigger id="form-country">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectItem value="us">United States</SelectItem>
									<SelectItem value="uk">United Kingdom</SelectItem>
									<SelectItem value="ca">Canada</SelectItem>
								</SelectGroup>
							</SelectContent>
						</Select>
					</Field>
				</div>
				<Field>
					<FieldLabel htmlFor="form-address">Address</FieldLabel>
					<Input id="form-address" type="text" placeholder="123 Main St" />
				</Field>
				<Field orientation="horizontal">
					<Button type="button" variant="outline">
						Cancel
					</Button>
					<Button type="submit">Submit</Button>
				</Field>
			</FieldGroup>
		</form>
	);
}

export function InputDemoInputTypes() {
	return (
		<div className="flex w-full flex-col gap-6">
			<Field>
				<FieldLabel htmlFor="input-demo-password">Password</FieldLabel>
				<Input
					id="input-demo-password"
					type="password"
					placeholder="Password"
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="input-demo-tel">Phone</FieldLabel>
				<Input
					id="input-demo-tel"
					type="tel"
					placeholder="+1 (555) 123-4567"
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="input-demo-url">URL</FieldLabel>
				<Input
					id="input-demo-url"
					type="url"
					placeholder="https://example.com"
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="input-demo-search">Search</FieldLabel>
				<Input id="input-demo-search" type="search" placeholder="Search" />
			</Field>
			<Field>
				<FieldLabel htmlFor="input-demo-number">Number</FieldLabel>
				<Input id="input-demo-number" type="number" placeholder="123" />
			</Field>
			<Field>
				<FieldLabel htmlFor="input-demo-date">Date</FieldLabel>
				<Input id="input-demo-date" type="date" />
			</Field>
			<Field>
				<FieldLabel htmlFor="input-demo-time">Time</FieldLabel>
				<Input id="input-demo-time" type="time" />
			</Field>
			<Field>
				<FieldLabel htmlFor="input-demo-file">File</FieldLabel>
				<Input id="input-demo-file" type="file" />
			</Field>
		</div>
	);
}

export function InputDemoInvalid() {
	return <Input type="text" placeholder="Error" aria-invalid="true" />;
}

export function InputDemoWithButton() {
	return (
		<div className="flex w-full gap-2">
			<Input type="search" placeholder="Search..." className="flex-1" />
			<Button>Search</Button>
		</div>
	);
}

export function InputDemoWithDescription() {
	return (
		<Field>
			<FieldLabel htmlFor="input-demo-username">Username</FieldLabel>
			<Input
				id="input-demo-username"
				type="text"
				placeholder="Enter your username"
			/>
			<FieldDescription>
				Choose a unique username for your account.
			</FieldDescription>
		</Field>
	);
}

export function InputDemoWithLabel() {
	return (
		<Field>
			<FieldLabel htmlFor="input-demo-email">Email</FieldLabel>
			<Input
				id="input-demo-email"
				type="email"
				placeholder="name@example.com"
			/>
		</Field>
	);
}

export function InputDemoWithNativeSelect() {
	return (
		<div className="flex w-full gap-2">
			<Input type="tel" placeholder="(555) 123-4567" className="flex-1" />
			<NativeSelect defaultValue="+1">
				<NativeSelectOption value="+1">+1</NativeSelectOption>
				<NativeSelectOption value="+44">+44</NativeSelectOption>
				<NativeSelectOption value="+46">+46</NativeSelectOption>
			</NativeSelect>
		</div>
	);
}

export function InputDemoWithSelect() {
	return (
		<div className="flex w-full gap-2">
			<Input type="text" placeholder="Enter amount" className="flex-1" />
			<Select defaultValue="usd">
				<SelectTrigger className="w-32">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						<SelectItem value="usd">USD</SelectItem>
						<SelectItem value="eur">EUR</SelectItem>
						<SelectItem value="gbp">GBP</SelectItem>
					</SelectGroup>
				</SelectContent>
			</Select>
		</div>
	);
}
