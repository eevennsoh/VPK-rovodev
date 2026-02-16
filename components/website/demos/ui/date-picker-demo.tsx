"use client"

import { useState } from "react"
import { DatePicker } from "@/components/ui/date-picker"

export default function DatePickerDemo() {
	const [date, setDate] = useState<Date | undefined>()

	return <DatePicker value={date} onChange={setDate} />
}

export function DatePickerDemoDefault() {
	const [date, setDate] = useState<Date | undefined>()

	return <DatePicker value={date} onChange={setDate} />
}

export function DatePickerDemoWithValue() {
	const [date, setDate] = useState<Date | undefined>(new Date())

	return <DatePicker value={date} onChange={setDate} />
}

export function DatePickerDemoPlaceholder() {
	const [date, setDate] = useState<Date | undefined>()

	return (
		<DatePicker
			value={date}
			onChange={setDate}
			placeholder="Choose a date..."
		/>
	)
}

export function DatePickerDemoDisabled() {
	return <DatePicker disabled placeholder="Disabled" />
}
