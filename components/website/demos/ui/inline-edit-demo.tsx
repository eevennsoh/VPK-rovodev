"use client"

import { useState } from "react"
import { InlineEdit } from "@/components/ui/inline-edit"

export default function InlineEditDemo() {
	const [value, setValue] = useState("Default description value")
	return (
		<div className="mx-auto w-full max-w-sm">
			<InlineEdit label="Description" value={value} onConfirm={setValue} />
		</div>
	)
}

export function InlineEditDemoDefault() {
	const [value, setValue] = useState("Editable text")
	return (
		<div className="w-full">
			<InlineEdit label="Summary" value={value} onConfirm={setValue} />
		</div>
	)
}

export function InlineEditDemoWithPlaceholder() {
	const [value, setValue] = useState("")
	return (
		<div className="w-full">
			<InlineEdit
				label="Description"
				value={value}
				onConfirm={setValue}
				placeholder="Add a description..."
				isRequired
			/>
		</div>
	)
}

export function InlineEditDemoMultiple() {
	const [title, setTitle] = useState("Project alpha")
	const [description, setDescription] = useState("A prototype project")
	return (
		<div className="flex w-full flex-col gap-3">
			<InlineEdit label="Title" value={title} onConfirm={setTitle} />
			<InlineEdit label="Description" value={description} onConfirm={setDescription} />
		</div>
	)
}

export function InlineEditDemoWithCancel() {
	const [value, setValue] = useState("Try editing and cancelling")
	return (
		<div className="w-full">
			<InlineEdit
				label="Description"
				value={value}
				onConfirm={setValue}
				onCancel={() => {
					// onCancel fires when user clicks Cancel
				}}
			/>
		</div>
	)
}

export function InlineEditDemoValidation() {
	const [value, setValue] = useState("")
	return (
		<div className="w-full">
			<InlineEdit
				label="Team name"
				value={value}
				placeholder="Add a name..."
				onConfirm={setValue}
				isRequired
				validate={(nextValue) => {
					if (nextValue.length > 25) {
						return "Keep this under 25 characters."
					}
					return undefined
				}}
			/>
		</div>
	)
}
