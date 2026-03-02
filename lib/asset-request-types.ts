/**
 * IT Asset Request App Types
 * Data models for internal asset request submission, tracking, and admin review
 */

export type AssetRequestStatus = "submitted" | "approved" | "rejected";

export const ASSET_REQUEST_STATUSES: AssetRequestStatus[] = [
	"submitted",
	"approved",
	"rejected",
];

export type AssetType =
	| "Laptop"
	| "Monitor"
	| "Keyboard"
	| "Mouse"
	| "Headset"
	| "Docking Station"
	| "Software License"
	| "Mobile Device"
	| "Desk Chair"
	| "Other";

export const ASSET_TYPES: AssetType[] = [
	"Laptop",
	"Monitor",
	"Keyboard",
	"Mouse",
	"Headset",
	"Docking Station",
	"Software License",
	"Mobile Device",
	"Desk Chair",
	"Other",
];

export type Department =
	| "Engineering"
	| "Design"
	| "Product"
	| "Marketing"
	| "Sales"
	| "Finance"
	| "HR"
	| "Operations"
	| "Legal"
	| "Support";

export const DEPARTMENTS: Department[] = [
	"Engineering",
	"Design",
	"Product",
	"Marketing",
	"Sales",
	"Finance",
	"HR",
	"Operations",
	"Legal",
	"Support",
];

export interface AssetRequest {
	id: string;
	requesterName: string;
	department: Department;
	assetType: AssetType;
	justification: string;
	neededByDate: string;
	status: AssetRequestStatus;
	submittedAt: string;
	reviewedAt?: string;
	reviewNote?: string;
}

export interface AssetRequestState {
	requests: AssetRequest[];
}

/** Get human-readable label for a status */
export function getStatusLabel(status: AssetRequestStatus): string {
	switch (status) {
		case "submitted":
			return "Submitted";
		case "approved":
			return "Approved";
		case "rejected":
			return "Rejected";
	}
}

/** Map status to Lozenge variant */
export function getStatusVariant(
	status: AssetRequestStatus,
): "neutral" | "success" | "danger" {
	switch (status) {
		case "submitted":
			return "neutral";
		case "approved":
			return "success";
		case "rejected":
			return "danger";
	}
}
