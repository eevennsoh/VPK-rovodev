"use client"

import { useState } from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

type RsvpFormProps = React.ComponentProps<"div">

interface RsvpFormData {
	name: string
	email: string
	attendance: "yes" | "no" | "maybe"
	guests: string
	dietaryRestrictions: string[]
	message: string
}

const DIETARY_OPTIONS = [
	{ id: "vegetarian", label: "Vegetarian" },
	{ id: "vegan", label: "Vegan" },
	{ id: "gluten-free", label: "Gluten-free" },
	{ id: "nut-allergy", label: "Nut allergy" },
	{ id: "dairy-free", label: "Dairy-free" },
	{ id: "halal", label: "Halal" },
	{ id: "kosher", label: "Kosher" },
] as const

export function RsvpForm({ className, ...props }: Readonly<RsvpFormProps>) {
	const [submitted, setSubmitted] = useState(false)
	const [formData, setFormData] = useState<RsvpFormData>({
		name: "",
		email: "",
		attendance: "yes",
		guests: "0",
		dietaryRestrictions: [],
		message: "",
	})

	function handleDietaryChange(id: string, checked: boolean) {
		setFormData((prev) => ({
			...prev,
			dietaryRestrictions: checked
				? [...prev.dietaryRestrictions, id]
				: prev.dietaryRestrictions.filter((item) => item !== id),
		}))
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setSubmitted(true)
	}

	if (submitted) {
		return (
			<div className={cn("flex flex-col gap-6", className)} {...props}>
				<Card>
					<CardHeader className="text-center">
						<div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-bg-success">
							<span className="text-lg">🎉</span>
						</div>
						<CardTitle className="text-2xl">Thank you!</CardTitle>
						<CardDescription>
							{formData.attendance === "yes"
								? "We can't wait to celebrate with you!"
								: formData.attendance === "maybe"
									? "We hope to see you there! We'll keep a spot for you."
									: "We're sorry you can't make it. You'll be missed!"}
						</CardDescription>
					</CardHeader>
					<CardContent className="flex justify-center">
						<Button
							variant="outline"
							onClick={() => {
								setSubmitted(false)
								setFormData({
									name: "",
									email: "",
									attendance: "yes",
									guests: "0",
									dietaryRestrictions: [],
									message: "",
								})
							}}
						>
							Submit another response
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card>
				<CardHeader>
					<CardTitle className="text-2xl">You&apos;re Invited! 🎂</CardTitle>
					<CardDescription>
						Please let us know if you can make it to the birthday celebration.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit}>
						<div className="flex flex-col gap-6">
							{/* Name */}
							<div className="grid gap-2">
								<Label htmlFor="rsvp-name">Full name</Label>
								<Input
									id="rsvp-name"
									type="text"
									placeholder="Jane Doe"
									required
									value={formData.name}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											name: e.target.value,
										}))
									}
								/>
							</div>

							{/* Email */}
							<div className="grid gap-2">
								<Label htmlFor="rsvp-email">Email</Label>
								<Input
									id="rsvp-email"
									type="email"
									placeholder="jane@example.com"
									required
									value={formData.email}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											email: e.target.value,
										}))
									}
								/>
							</div>

							{/* Attendance */}
							<div className="grid gap-2">
								<Label>Will you be attending?</Label>
								<RadioGroup
									value={formData.attendance}
									onValueChange={(value) =>
										setFormData((prev) => ({
											...prev,
											attendance: value as RsvpFormData["attendance"],
										}))
									}
								>
									<div className="flex items-center gap-2">
										<RadioGroupItem value="yes" id="rsvp-yes" />
										<Label htmlFor="rsvp-yes" className="font-normal">
											Yes, I&apos;ll be there!
										</Label>
									</div>
									<div className="flex items-center gap-2">
										<RadioGroupItem value="maybe" id="rsvp-maybe" />
										<Label htmlFor="rsvp-maybe" className="font-normal">
											Maybe, I&apos;m not sure yet
										</Label>
									</div>
									<div className="flex items-center gap-2">
										<RadioGroupItem value="no" id="rsvp-no" />
										<Label htmlFor="rsvp-no" className="font-normal">
											Sorry, I can&apos;t make it
										</Label>
									</div>
								</RadioGroup>
							</div>

							{/* Additional guests — only shown when attending */}
							{formData.attendance !== "no" ? (
								<div className="grid gap-2">
									<Label htmlFor="rsvp-guests">
										Number of additional guests
									</Label>
									<Select
										value={formData.guests}
										onValueChange={(value) => {
											if (value !== null) {
												setFormData((prev) => ({
													...prev,
													guests: value,
												}))
											}
										}}
									>
										<SelectTrigger id="rsvp-guests" className="w-full">
											<SelectValue placeholder="Select" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="0">Just me</SelectItem>
											<SelectItem value="1">+1 guest</SelectItem>
											<SelectItem value="2">+2 guests</SelectItem>
											<SelectItem value="3">+3 guests</SelectItem>
											<SelectItem value="4">+4 guests</SelectItem>
										</SelectContent>
									</Select>
								</div>
							) : null}

							{/* Dietary restrictions — only shown when attending */}
							{formData.attendance !== "no" ? (
								<div className="grid gap-2">
									<Label>Dietary restrictions</Label>
									<div className="grid grid-cols-2 gap-x-4 gap-y-2">
										{DIETARY_OPTIONS.map((option) => (
											<div
												key={option.id}
												className="flex items-center gap-2"
											>
												<Checkbox
													id={`diet-${option.id}`}
													checked={formData.dietaryRestrictions.includes(
														option.id
													)}
													onCheckedChange={(checked) =>
														handleDietaryChange(
															option.id,
															checked === true
														)
													}
												/>
												<Label
													htmlFor={`diet-${option.id}`}
													className="font-normal"
												>
													{option.label}
												</Label>
											</div>
										))}
									</div>
								</div>
							) : null}

							{/* Message */}
							<div className="grid gap-2">
								<Label htmlFor="rsvp-message">
									Message for the birthday person{" "}
									<span className="text-text-subtlest">(optional)</span>
								</Label>
								<Textarea
									id="rsvp-message"
									placeholder="Happy birthday! Can't wait to celebrate with you..."
									value={formData.message}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											message: e.target.value,
										}))
									}
								/>
							</div>

							{/* Submit */}
							<Button type="submit" className="w-full">
								{formData.attendance === "yes"
									? "Count me in!"
									: formData.attendance === "maybe"
										? "Save my spot"
										: "Send my regrets"}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}
