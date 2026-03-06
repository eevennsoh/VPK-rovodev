import type { PlanApprovalDecision } from "@/components/projects/shared/lib/plan-approval";

export interface ApprovalOption {
	id: PlanApprovalDecision;
	step: string;
	label: string;
	selected?: boolean;
}

export const APPROVAL_OPTIONS: ApprovalOption[] = [
	{ id: "auto-accept", step: "1", label: "Yes, let's start cooking" },
	{ id: "continue-planning", step: "2", label: "No, keep planning" },
];
