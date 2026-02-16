"use client";

import { useState } from "react";
import { TimePicker } from "@/components/ui/time-picker";

export default function TimePickerDemo() {
	const [time, setTime] = useState<string | undefined>();
	return <TimePicker value={time} onChange={setTime} />;
}

export function TimePickerDemoDefault() {
	const [time, setTime] = useState<string | undefined>();
	return <TimePicker value={time} onChange={setTime} />;
}

export function TimePickerDemoWithValue() {
	const [time, setTime] = useState<string | undefined>("14:30");
	return <TimePicker value={time} onChange={setTime} />;
}

export function TimePickerDemo15Min() {
	const [time, setTime] = useState<string | undefined>();
	return <TimePicker value={time} onChange={setTime} stepMinutes={15} />;
}

export function TimePickerDemoDisabled() {
	return <TimePicker value="09:00" disabled />;
}
