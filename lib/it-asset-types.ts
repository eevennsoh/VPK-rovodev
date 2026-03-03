/**
 * IT Asset Management Types
 * Data models for tracking hardware and software assets through their lifecycle,
 * with employee assignment tracking and check-in/check-out history.
 */

// ---------------------------------------------------------------------------
// Asset categories & types
// ---------------------------------------------------------------------------

export type ITAssetCategory = "Hardware" | "Software";

export type HardwareAssetType =
	| "Laptop"
	| "Desktop"
	| "Monitor"
	| "Server"
	| "Phone"
	| "Tablet"
	| "Keyboard"
	| "Mouse"
	| "Headset"
	| "Docking Station"
	| "Printer"
	| "Network Equipment";

export type SoftwareAssetType =
	| "Software License"
	| "SaaS Subscription"
	| "Cloud Resource"
	| "Development Tool";

export type ITAssetType = HardwareAssetType | SoftwareAssetType;

export const HARDWARE_ASSET_TYPES: HardwareAssetType[] = [
	"Laptop",
	"Desktop",
	"Monitor",
	"Server",
	"Phone",
	"Tablet",
	"Keyboard",
	"Mouse",
	"Headset",
	"Docking Station",
	"Printer",
	"Network Equipment",
];

export const SOFTWARE_ASSET_TYPES: SoftwareAssetType[] = [
	"Software License",
	"SaaS Subscription",
	"Cloud Resource",
	"Development Tool",
];

export const IT_ASSET_TYPES: ITAssetType[] = [
	...HARDWARE_ASSET_TYPES,
	...SOFTWARE_ASSET_TYPES,
];

// ---------------------------------------------------------------------------
// Status lifecycle
// ---------------------------------------------------------------------------

export type ITAssetStatus =
	| "procurement"
	| "in-stock"
	| "assigned"
	| "in-repair"
	| "decommissioned"
	| "disposed";

export const IT_ASSET_STATUSES: ITAssetStatus[] = [
	"procurement",
	"in-stock",
	"assigned",
	"in-repair",
	"decommissioned",
	"disposed",
];

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------

export type ITDepartment =
	| "Engineering"
	| "Design"
	| "Product"
	| "Marketing"
	| "Sales"
	| "Finance"
	| "HR"
	| "Operations"
	| "Legal"
	| "Support"
	| "IT";

export const IT_DEPARTMENTS: ITDepartment[] = [
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
	"IT",
];

// ---------------------------------------------------------------------------
// Assignment records (check-in / check-out history)
// ---------------------------------------------------------------------------

export type AssignmentAction = "check-out" | "check-in";

export interface AssignmentRecord {
	id: string;
	action: AssignmentAction;
	assigneeName: string;
	assigneeAvatar?: string;
	department: ITDepartment;
	timestamp: string;
	notes?: string;
}

// ---------------------------------------------------------------------------
// Activity log
// ---------------------------------------------------------------------------

export type ITAssetActivityAction =
	| "created"
	| "updated"
	| "deleted"
	| "status-changed"
	| "checked-out"
	| "checked-in";

export interface ITAssetActivityEntry {
	id: string;
	action: ITAssetActivityAction;
	assetId: string;
	assetName: string;
	details: string;
	timestamp: string;
}

// ---------------------------------------------------------------------------
// Core asset interface
// ---------------------------------------------------------------------------

export interface ITAsset {
	id: string;
	name: string;
	assetTag: string;
	type: ITAssetType;
	category: ITAssetCategory;
	status: ITAssetStatus;

	// Identification
	serialNumber?: string;
	model?: string;
	manufacturer?: string;

	// Software-specific fields
	licenseKey?: string;
	licenseExpiry?: string;
	seatCount?: number;

	// Assignment
	assigneeName?: string;
	assigneeAvatar?: string;
	department?: ITDepartment;

	// Financial
	purchaseDate?: string;
	purchaseCost?: number;
	warrantyExpiry?: string;

	// Metadata
	location?: string;
	notes?: string;
	assignmentHistory: AssignmentRecord[];
	createdAt: string;
	updatedAt: string;
}

// ---------------------------------------------------------------------------
// Aggregate state
// ---------------------------------------------------------------------------

export interface ITAssetState {
	assets: ITAsset[];
	activityLog: ITAssetActivityEntry[];
}

// ---------------------------------------------------------------------------
// Utility functions — status labels
// ---------------------------------------------------------------------------

export function getITAssetStatusLabel(status: ITAssetStatus): string {
	switch (status) {
		case "procurement":
			return "Procurement";
		case "in-stock":
			return "In Stock";
		case "assigned":
			return "Assigned";
		case "in-repair":
			return "In Repair";
		case "decommissioned":
			return "Decommissioned";
		case "disposed":
			return "Disposed";
	}
}

// ---------------------------------------------------------------------------
// Utility functions — status badge/lozenge variant mapping
// ---------------------------------------------------------------------------

export type StatusVariant =
	| "neutral"
	| "success"
	| "information"
	| "warning"
	| "danger"
	| "discovery";

export function getITAssetStatusVariant(status: ITAssetStatus): StatusVariant {
	switch (status) {
		case "procurement":
			return "discovery";
		case "in-stock":
			return "success";
		case "assigned":
			return "information";
		case "in-repair":
			return "warning";
		case "decommissioned":
			return "neutral";
		case "disposed":
			return "danger";
	}
}

// ---------------------------------------------------------------------------
// Utility functions — category helpers
// ---------------------------------------------------------------------------

export function getAssetCategory(type: ITAssetType): ITAssetCategory {
	if ((HARDWARE_ASSET_TYPES as string[]).includes(type)) {
		return "Hardware";
	}
	return "Software";
}

export function isHardwareAsset(type: ITAssetType): type is HardwareAssetType {
	return (HARDWARE_ASSET_TYPES as string[]).includes(type);
}

export function isSoftwareAsset(type: ITAssetType): type is SoftwareAssetType {
	return (SOFTWARE_ASSET_TYPES as string[]).includes(type);
}

// ---------------------------------------------------------------------------
// Utility functions — assignment action labels
// ---------------------------------------------------------------------------

export function getAssignmentActionLabel(action: AssignmentAction): string {
	switch (action) {
		case "check-out":
			return "Checked Out";
		case "check-in":
			return "Checked In";
	}
}

export function getAssignmentActionVariant(
	action: AssignmentAction,
): "success" | "neutral" {
	switch (action) {
		case "check-out":
			return "success";
		case "check-in":
			return "neutral";
	}
}

// ---------------------------------------------------------------------------
// Utility functions — activity action labels
// ---------------------------------------------------------------------------

export function getActivityActionLabel(action: ITAssetActivityAction): string {
	switch (action) {
		case "created":
			return "Created";
		case "updated":
			return "Updated";
		case "deleted":
			return "Deleted";
		case "status-changed":
			return "Status Changed";
		case "checked-out":
			return "Checked Out";
		case "checked-in":
			return "Checked In";
	}
}

// ---------------------------------------------------------------------------
// Utility functions — status transition validation
// ---------------------------------------------------------------------------

/** Returns the set of statuses an asset can transition to from its current status */
export function getValidNextStatuses(
	currentStatus: ITAssetStatus,
): ITAssetStatus[] {
	switch (currentStatus) {
		case "procurement":
			return ["in-stock"];
		case "in-stock":
			return ["assigned", "decommissioned"];
		case "assigned":
			return ["in-stock", "in-repair", "decommissioned"];
		case "in-repair":
			return ["in-stock", "decommissioned"];
		case "decommissioned":
			return ["disposed"];
		case "disposed":
			return [];
	}
}

/** Check whether a status transition is valid */
export function isValidStatusTransition(
	from: ITAssetStatus,
	to: ITAssetStatus,
): boolean {
	return getValidNextStatuses(from).includes(to);
}

// ---------------------------------------------------------------------------
// Utility functions — asset tag generation
// ---------------------------------------------------------------------------

/** Generate a human-readable asset tag like "HW-00042" or "SW-00007" */
export function generateAssetTag(
	category: ITAssetCategory,
	sequence: number,
): string {
	const prefix = category === "Hardware" ? "HW" : "SW";
	return `${prefix}-${String(sequence).padStart(5, "0")}`;
}
