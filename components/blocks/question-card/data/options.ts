export interface ChoiceOption {
	id: string;
	label: string;
	description?: string;
	selected?: boolean;
}

export const CHOICE_OPTIONS: ChoiceOption[] = [
	{
		id: "1",
		label: "Team-led flexibility (Recommended)",
		description: "Teams decide how to use Fridays (e.g. remote work, focus time, and collaboration).",
		selected: true,
	},
	{
		id: "2",
		label: "Company-wide default",
		description: "Flexible Fridays are the default for everyone, with teams opting out.",
	},
	{
		id: "3",
		label: "Individual choice with manager approval",
		description: "Employees choose whether to adopt Flexible Fridays, with approval.",
	},
];
