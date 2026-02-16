"use client"

import * as React from "react"

import { DatePicker } from "@/components/ui/date-picker"
import { TimePicker } from "@/components/ui/time-picker"
import { cn } from "@/lib/utils"

export interface DateTimePickerValue {
	date?: Date
	time?: string
}

export interface DateTimePickerProps {
	value?: DateTimePickerValue
	onChange?: (value: DateTimePickerValue) => void
	className?: string
	disabled?: boolean
}

function DateTimePicker({ value, onChange, className, disabled }: Readonly<DateTimePickerProps>) {
	return (
		<div data-slot="date-time-picker" className={cn("flex flex-wrap items-center gap-2", className)}>
			<DatePicker
				value={value?.date}
				onChange={(date) => onChange?.({ date, time: value?.time })}
				disabled={disabled}
			/>
			<TimePicker
				value={value?.time}
				onChange={(time) => onChange?.({ date: value?.date, time })}
				disabled={disabled}
			/>
		</div>
	)
}

export { DateTimePicker }
