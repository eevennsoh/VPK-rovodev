export interface ApprovalOption {
	id: string;
	label: string;
	selected?: boolean;
}

export const APPROVAL_OPTIONS: ApprovalOption[] = [
	{ id: "1", label: "Yes, and auto-accept", selected: true },
	{ id: "2", label: "Yes, and manually approve edits" },
	{ id: "3", label: "No, keep planning" },
];
