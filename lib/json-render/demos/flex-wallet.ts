import type { Spec } from "@json-render/react";

/**
 * Q3 Demo: "How should I allocate my Flex Wallet for the year?"
 *
 * Sliders, radios, checkboxes with computed output.
 * Control changes trigger deterministic recompute of summary values.
 *
 * Uses Slider, RadioGroup, Checkbox, Metric, and state bindings
 * to create a calculator-style interactive control panel.
 */
export const flexWalletSpec: Spec = {
	root: "root",
	state: {
		wallet: {
			totalBudget: 5000,
			wellness: 1500,
			learning: 1000,
			equipment: 1000,
			commuter: 500,
			charity: 500,
			unused: 500,
			frequency: "monthly",
			includeRollover: true,
			taxOptimized: false,
		},
	},
	elements: {
		root: {
			type: "Stack",
			props: { direction: "vertical", gap: "lg" },
			children: ["heading", "description", "budgetAlert", "controlsGrid", "summaryCard"],
		},
		heading: {
			type: "Heading",
			props: { text: "Flex Wallet Allocation", level: "h2" },
		},
		description: {
			type: "Text",
			props: {
				content: "You have $5,000 in annual Flex Wallet credits to allocate across benefit categories. Adjust the sliders below to customize your spending plan.",
			},
		},
		budgetAlert: {
			type: "Alert",
			props: {
				title: "Annual Budget: $5,000",
				description: "Allocate your flex credits across categories. Unused funds can roll over to next year if enabled.",
				variant: "info",
			},
		},
		controlsGrid: {
			type: "Grid",
			props: { columns: "2", gap: "lg" },
			children: ["allocationsCard", "optionsCard"],
		},
		allocationsCard: {
			type: "Card",
			props: { title: "Category Allocations", description: "Drag sliders to set your annual budget per category" },
			children: ["sliderStack"],
		},
		sliderStack: {
			type: "Stack",
			props: { direction: "vertical", gap: "md" },
			children: ["wellnessSlider", "learningSlider", "equipmentSlider", "commuterSlider", "charitySlider"],
		},
		wellnessSlider: {
			type: "Slider",
			props: {
				label: "Wellness & Fitness",
				value: { $bindState: "/wallet/wellness" } as unknown as number,
				min: 0,
				max: 3000,
				step: 100,
			},
		},
		learningSlider: {
			type: "Slider",
			props: {
				label: "Learning & Development",
				value: { $bindState: "/wallet/learning" } as unknown as number,
				min: 0,
				max: 3000,
				step: 100,
			},
		},
		equipmentSlider: {
			type: "Slider",
			props: {
				label: "Home Office Equipment",
				value: { $bindState: "/wallet/equipment" } as unknown as number,
				min: 0,
				max: 2000,
				step: 100,
			},
		},
		commuterSlider: {
			type: "Slider",
			props: {
				label: "Commuter Benefits",
				value: { $bindState: "/wallet/commuter" } as unknown as number,
				min: 0,
				max: 2000,
				step: 50,
			},
		},
		charitySlider: {
			type: "Slider",
			props: {
				label: "Charitable Giving",
				value: { $bindState: "/wallet/charity" } as unknown as number,
				min: 0,
				max: 2000,
				step: 50,
			},
		},
		optionsCard: {
			type: "Card",
			props: { title: "Payout Options", description: "Configure how your benefits are distributed" },
			children: ["optionsStack"],
		},
		optionsStack: {
			type: "Stack",
			props: { direction: "vertical", gap: "md" },
			children: ["frequencyRadio", "rolloverCheck", "taxCheck"],
		},
		frequencyRadio: {
			type: "RadioGroup",
			props: {
				label: "Reimbursement Frequency",
				options: [
					{ label: "Monthly", value: "monthly" },
					{ label: "Quarterly", value: "quarterly" },
					{ label: "Annual lump sum", value: "annual" },
				],
				value: { $bindState: "/wallet/frequency" } as unknown as string,
			},
		},
		rolloverCheck: {
			type: "Checkbox",
			props: {
				label: "Enable unused fund rollover to next year",
				checked: { $bindState: "/wallet/includeRollover" } as unknown as boolean,
			},
		},
		taxCheck: {
			type: "Checkbox",
			props: {
				label: "Optimize for pre-tax deductions where eligible",
				checked: { $bindState: "/wallet/taxOptimized" } as unknown as boolean,
			},
		},
		summaryCard: {
			type: "Card",
			props: { title: "Allocation Summary", description: "Review your flex wallet plan before confirming" },
			children: ["summaryContent"],
		},
		summaryContent: {
			type: "Stack",
			props: { direction: "vertical", gap: "md" },
			children: ["summaryChart", "summaryActions"],
		},
		summaryChart: {
			type: "BarChart",
			props: {
				title: "Your Allocation Plan",
				data: [
					{ category: "Wellness", amount: 1500 },
					{ category: "Learning", amount: 1000 },
					{ category: "Equipment", amount: 1000 },
					{ category: "Commuter", amount: 500 },
					{ category: "Charity", amount: 500 },
				],
				xKey: "category",
				yKey: "amount",
				color: "var(--color-chart-2)",
			},
		},
		summaryActions: {
			type: "Stack",
			props: { direction: "horizontal", gap: "sm", justify: "end" },
			children: ["resetBtn", "confirmBtn"],
		},
		resetBtn: {
			type: "Button",
			props: { label: "Reset to Default", variant: "outline" },
		},
		confirmBtn: {
			type: "Button",
			props: { label: "Confirm Allocation", variant: "default" },
		},
	},
};
