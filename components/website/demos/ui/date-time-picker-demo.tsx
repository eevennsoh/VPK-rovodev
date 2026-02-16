"use client";

import { useState } from "react";
import { DateTimePicker, type DateTimePickerValue } from "@/components/ui/date-time-picker";

export default function DateTimePickerDemo() {
	const [value, setValue] = useState<DateTimePickerValue>({});
	return <DateTimePicker value={value} onChange={setValue} />;
}

export function DateTimePickerDemoDefault() {
	const [value, setValue] = useState<DateTimePickerValue>({});
	return <DateTimePicker value={value} onChange={setValue} />;
}

export function DateTimePickerDemoWithValue() {
	const [value, setValue] = useState<DateTimePickerValue>({
		date: new Date(),
		time: "14:30",
	});
	return <DateTimePicker value={value} onChange={setValue} />;
}

export function DateTimePickerDemoDisabled() {
	return (
		<DateTimePicker
			value={{ date: new Date(), time: "09:00" }}
			disabled
		/>
	);
}
