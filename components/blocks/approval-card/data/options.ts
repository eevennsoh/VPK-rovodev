import type { PlanApprovalDecision } from "@/components/templates/shared/lib/plan-approval";

export interface ApprovalOption {
	id: PlanApprovalDecision;
	step: string;
	label: string;
	selected?: boolean;
}

export const APPROVAL_OPTIONS: ApprovalOption[] = [
	{ id: "auto-accept", step: "1", label: "Yes, and auto-accept", selected: true },
	{ id: "manual-approve", step: "2", label: "Yes, and manually approve edits" },
	{ id: "continue-planning", step: "3", label: "No, keep planning" },
];
