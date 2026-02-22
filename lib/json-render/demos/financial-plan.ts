import type { Spec } from "@json-render/react";

/**
 * Q4 Demo: "Help me plan my first-year finances with salary, leave, and benefits assumptions."
 *
 * Accordion sections expand/collapse with mixed input fields.
 * Uses AccordionForm (children-based) for interactive accordion sections,
 * plus standard form controls and a computed summary section.
 */
export const financialPlanSpec: Spec = {
	root: "root",
	state: {
		plan: {
			baseSalary: 130000,
			bonusTarget: 20,
			signingBonus: 15000,
			equityGrant: 40000,
			vestingYears: 4,
			federalTaxRate: 24,
			stateTaxRate: 6,
			retirement401k: 10,
			hsaContribution: 3000,
			rentMortgage: 2200,
			utilities: 300,
			groceries: 600,
			transportation: 400,
			insurance: 250,
			otherExpenses: 500,
			ptodays: 20,
			sickDays: 10,
			parentalLeave: 0,
			emergencyFund: 6,
		},
	},
	elements: {
		root: {
			type: "Stack",
			props: { direction: "vertical", gap: "lg" },
			children: ["heading", "description", "accordion", "summaryCard"],
		},
		heading: {
			type: "Heading",
			props: { text: "First-Year Financial Planner", level: "h2" },
		},
		description: {
			type: "Text",
			props: {
				content: "Plan your first-year finances by entering your income, tax, expense, and leave assumptions. Expand each section to customize the inputs.",
			},
		},
		accordion: {
			type: "AccordionForm",
			props: {
				items: [
					{ value: "income", title: "Income & Compensation" },
					{ value: "taxes", title: "Tax Withholding" },
					{ value: "expenses", title: "Monthly Expenses" },
					{ value: "savings", title: "Savings & Retirement" },
					{ value: "leave", title: "Leave & Time Off" },
				],
				defaultOpenValues: ["income"],
			},
			children: [
				"incomeSection",
				"taxSection",
				"expenseSection",
				"savingsSection",
				"leaveSection",
			],
		},

		/* ── Income section ──────────────────────────────── */
		incomeSection: {
			type: "Stack",
			props: { direction: "vertical", gap: "md" },
			children: ["salaryInput", "bonusSlider", "signingInput", "equityInput", "vestingSelect"],
		},
		salaryInput: {
			type: "TextInput",
			props: {
				label: "Annual Base Salary ($)",
				type: "number",
				value: { $bindState: "/plan/baseSalary" } as unknown as string,
				placeholder: "130000",
			},
		},
		bonusSlider: {
			type: "Slider",
			props: {
				label: "Target Bonus (%)",
				value: { $bindState: "/plan/bonusTarget" } as unknown as number,
				min: 0,
				max: 50,
				step: 5,
			},
		},
		signingInput: {
			type: "TextInput",
			props: {
				label: "Signing Bonus ($)",
				type: "number",
				value: { $bindState: "/plan/signingBonus" } as unknown as string,
				placeholder: "15000",
			},
		},
		equityInput: {
			type: "TextInput",
			props: {
				label: "Equity Grant Value ($)",
				type: "number",
				value: { $bindState: "/plan/equityGrant" } as unknown as string,
				placeholder: "40000",
			},
		},
		vestingSelect: {
			type: "SelectInput",
			props: {
				label: "Vesting Schedule",
				value: { $bindState: "/plan/vestingYears" } as unknown as string,
				options: [
					{ label: "3-year vest", value: "3" },
					{ label: "4-year vest", value: "4" },
					{ label: "5-year vest", value: "5" },
				],
			},
		},

		/* ── Tax section ─────────────────────────────────── */
		taxSection: {
			type: "Stack",
			props: { direction: "vertical", gap: "md" },
			children: ["federalTaxSlider", "stateTaxSlider"],
		},
		federalTaxSlider: {
			type: "Slider",
			props: {
				label: "Federal Tax Rate (%)",
				value: { $bindState: "/plan/federalTaxRate" } as unknown as number,
				min: 10,
				max: 37,
				step: 1,
			},
		},
		stateTaxSlider: {
			type: "Slider",
			props: {
				label: "State Tax Rate (%)",
				value: { $bindState: "/plan/stateTaxRate" } as unknown as number,
				min: 0,
				max: 13,
				step: 1,
			},
		},

		/* ── Expenses section ────────────────────────────── */
		expenseSection: {
			type: "Stack",
			props: { direction: "vertical", gap: "md" },
			children: ["rentInput", "utilitiesInput", "groceriesInput", "transportInput", "insuranceInput", "otherInput"],
		},
		rentInput: {
			type: "TextInput",
			props: {
				label: "Rent / Mortgage (monthly $)",
				type: "number",
				value: { $bindState: "/plan/rentMortgage" } as unknown as string,
				placeholder: "2200",
			},
		},
		utilitiesInput: {
			type: "TextInput",
			props: {
				label: "Utilities (monthly $)",
				type: "number",
				value: { $bindState: "/plan/utilities" } as unknown as string,
				placeholder: "300",
			},
		},
		groceriesInput: {
			type: "TextInput",
			props: {
				label: "Groceries (monthly $)",
				type: "number",
				value: { $bindState: "/plan/groceries" } as unknown as string,
				placeholder: "600",
			},
		},
		transportInput: {
			type: "TextInput",
			props: {
				label: "Transportation (monthly $)",
				type: "number",
				value: { $bindState: "/plan/transportation" } as unknown as string,
				placeholder: "400",
			},
		},
		insuranceInput: {
			type: "TextInput",
			props: {
				label: "Insurance (monthly $)",
				type: "number",
				value: { $bindState: "/plan/insurance" } as unknown as string,
				placeholder: "250",
			},
		},
		otherInput: {
			type: "TextInput",
			props: {
				label: "Other Expenses (monthly $)",
				type: "number",
				value: { $bindState: "/plan/otherExpenses" } as unknown as string,
				placeholder: "500",
			},
		},

		/* ── Savings section ─────────────────────────────── */
		savingsSection: {
			type: "Stack",
			props: { direction: "vertical", gap: "md" },
			children: ["retirementSlider", "hsaInput", "emergencySlider"],
		},
		retirementSlider: {
			type: "Slider",
			props: {
				label: "401(k) Contribution (%)",
				value: { $bindState: "/plan/retirement401k" } as unknown as number,
				min: 0,
				max: 22,
				step: 1,
			},
		},
		hsaInput: {
			type: "TextInput",
			props: {
				label: "HSA Annual Contribution ($)",
				type: "number",
				value: { $bindState: "/plan/hsaContribution" } as unknown as string,
				placeholder: "3000",
			},
		},
		emergencySlider: {
			type: "Slider",
			props: {
				label: "Emergency Fund Target (months)",
				value: { $bindState: "/plan/emergencyFund" } as unknown as number,
				min: 1,
				max: 12,
				step: 1,
			},
		},

		/* ── Leave section ───────────────────────────────── */
		leaveSection: {
			type: "Stack",
			props: { direction: "vertical", gap: "md" },
			children: ["ptoSlider", "sickSlider", "parentalSelect"],
		},
		ptoSlider: {
			type: "Slider",
			props: {
				label: "PTO Days",
				value: { $bindState: "/plan/ptodays" } as unknown as number,
				min: 10,
				max: 30,
				step: 1,
			},
		},
		sickSlider: {
			type: "Slider",
			props: {
				label: "Sick Days",
				value: { $bindState: "/plan/sickDays" } as unknown as number,
				min: 5,
				max: 20,
				step: 1,
			},
		},
		parentalSelect: {
			type: "SelectInput",
			props: {
				label: "Parental Leave (weeks)",
				value: { $bindState: "/plan/parentalLeave" } as unknown as string,
				options: [
					{ label: "Not applicable", value: "0" },
					{ label: "4 weeks", value: "4" },
					{ label: "8 weeks", value: "8" },
					{ label: "12 weeks", value: "12" },
					{ label: "16 weeks", value: "16" },
				],
			},
		},

		/* ── Summary ─────────────────────────────────────── */
		summaryCard: {
			type: "Card",
			props: { title: "Financial Plan Summary", description: "Based on your inputs above" },
			children: ["summaryMetrics", "summaryActions"],
		},
		summaryMetrics: {
			type: "Grid",
			props: { columns: "3", gap: "md" },
			children: ["metricGross", "metricNet", "metricExpenses", "metricSavings", "metricTakeHome", "metricLeave"],
		},
		metricGross: {
			type: "Metric",
			props: { label: "Gross Income", value: "$156,000", detail: "Salary + bonus target", trend: null },
		},
		metricNet: {
			type: "Metric",
			props: { label: "After-Tax Income", value: "$109,200", detail: "30% effective tax rate", trend: null },
		},
		metricExpenses: {
			type: "Metric",
			props: { label: "Annual Expenses", value: "$51,000", detail: "$4,250/month total", trend: "down" },
		},
		metricSavings: {
			type: "Metric",
			props: { label: "Total Savings", value: "$29,100", detail: "401k + HSA + emergency", trend: "up" },
		},
		metricTakeHome: {
			type: "Metric",
			props: { label: "Discretionary", value: "$29,100", detail: "After expenses & savings", trend: "up" },
		},
		metricLeave: {
			type: "Metric",
			props: { label: "Total Leave", value: "30 days", detail: "PTO + sick days", trend: null },
		},
		summaryActions: {
			type: "Stack",
			props: { direction: "horizontal", gap: "sm", justify: "end" },
			children: ["exportBtn", "saveBtn"],
		},
		exportBtn: {
			type: "Button",
			props: { label: "Export Plan", variant: "outline" },
		},
		saveBtn: {
			type: "Button",
			props: { label: "Save Plan", variant: "default" },
		},
	},
};
