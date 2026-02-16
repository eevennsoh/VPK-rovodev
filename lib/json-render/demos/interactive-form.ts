import type { Spec } from "@json-render/react";

export const interactiveFormSpec: Spec = {
	root: "root",
	state: {
		formData: {
			name: "",
			email: "",
			role: "",
			experience: "",
			submitted: false,
		},
	},
	elements: {
		root: {
			type: "Stack",
			props: { direction: "vertical", gap: "lg" },
			children: ["heading", "description", "formCard", "submittedAlert"],
		},
		heading: {
			type: "Heading",
			props: { level: "h2", text: "Interactive Form" },
		},
		description: {
			type: "Text",
			props: {
				content: "A form with two-way data bindings. Fill out the fields and click Submit to see conditional visibility in action.",
			},
		},
		formCard: {
			type: "Card",
			props: { title: "Team Member Registration" },
			children: ["formFields"],
		},
		formFields: {
			type: "Stack",
			props: { direction: "vertical", gap: "md" },
			children: ["nameInput", "emailInput", "roleRadio", "experienceSelect", "submitButton"],
		},
		nameInput: {
			type: "TextInput",
			props: {
				label: "Full Name",
				placeholder: "Enter your name",
				value: { $bindState: "/formData/name" } as unknown as string,
			},
		},
		emailInput: {
			type: "TextInput",
			props: {
				label: "Email Address",
				placeholder: "you@company.com",
				type: "email",
				value: { $bindState: "/formData/email" } as unknown as string,
			},
		},
		roleRadio: {
			type: "RadioGroup",
			props: {
				label: "Role",
				options: [
					{ label: "Developer", value: "developer" },
					{ label: "Designer", value: "designer" },
					{ label: "Product Manager", value: "pm" },
					{ label: "Other", value: "other" },
				],
				value: { $bindState: "/formData/role" } as unknown as string,
			},
		},
		experienceSelect: {
			type: "SelectInput",
			props: {
				label: "Experience Level",
				placeholder: "Select experience",
				options: [
					{ label: "Junior (0–2 years)", value: "junior" },
					{ label: "Mid-level (3–5 years)", value: "mid" },
					{ label: "Senior (6–10 years)", value: "senior" },
					{ label: "Staff+ (10+ years)", value: "staff" },
				],
				value: { $bindState: "/formData/experience" } as unknown as string,
			},
		},
		submitButton: {
			type: "Button",
			props: { label: "Submit Registration", variant: "default" },
			on: {
				press: {
					action: "setState",
					params: { statePath: "/formData/submitted", value: true },
				},
			},
		},
		submittedAlert: {
			type: "Alert",
			props: {
				title: "Registration Submitted",
				description: "Thank you for registering! Your details have been recorded.",
				variant: "default",
			},
			visible: {
				$state: "/formData/submitted",
				eq: true,
			},
		},
	},
};
