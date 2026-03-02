import type { AssetRequest } from "@/lib/asset-request-types";

export const SEED_ASSET_REQUESTS: AssetRequest[] = [
	{
		id: "ar-001",
		requesterName: "Priya Hansra",
		department: "Engineering",
		assetType: "Laptop",
		justification:
			"Current laptop is 4 years old and struggling with Docker builds. Need a machine with 32GB RAM for development.",
		neededByDate: "2026-03-15",
		status: "submitted",
		submittedAt: "2026-02-28T09:15:00Z",
	},
	{
		id: "ar-002",
		requesterName: "Michael Chu",
		department: "Design",
		assetType: "Monitor",
		justification:
			"Need a 4K color-accurate monitor for design work. Current monitor has poor color reproduction.",
		neededByDate: "2026-03-20",
		status: "approved",
		submittedAt: "2026-02-25T14:30:00Z",
		reviewedAt: "2026-02-26T10:00:00Z",
		reviewNote: "Approved — standard design equipment upgrade.",
	},
	{
		id: "ar-003",
		requesterName: "Olivia Yang",
		department: "Marketing",
		assetType: "Software License",
		justification:
			"Need Adobe Creative Cloud license for campaign asset creation and video editing.",
		neededByDate: "2026-03-10",
		status: "submitted",
		submittedAt: "2026-02-27T11:45:00Z",
	},
	{
		id: "ar-004",
		requesterName: "Raul Gonzalez",
		department: "Sales",
		assetType: "Mobile Device",
		justification:
			"Traveling for client meetings frequently. Need a company phone for secure communication.",
		neededByDate: "2026-03-25",
		status: "rejected",
		submittedAt: "2026-02-20T08:00:00Z",
		reviewedAt: "2026-02-21T16:30:00Z",
		reviewNote:
			"Rejected — BYOD policy covers mobile devices. Please submit a reimbursement claim instead.",
	},
	{
		id: "ar-005",
		requesterName: "Annie Clare",
		department: "Product",
		assetType: "Headset",
		justification:
			"Working in open office and need a noise-cancelling headset for focused work and video calls.",
		neededByDate: "2026-03-08",
		status: "approved",
		submittedAt: "2026-02-22T13:20:00Z",
		reviewedAt: "2026-02-23T09:15:00Z",
		reviewNote: "Approved — standard equipment for open-office workers.",
	},
	{
		id: "ar-006",
		requesterName: "David Hsieh",
		department: "Engineering",
		assetType: "Docking Station",
		justification:
			"Switching to a hybrid setup. Need a USB-C docking station for the office desk.",
		neededByDate: "2026-03-12",
		status: "submitted",
		submittedAt: "2026-03-01T10:00:00Z",
	},
	{
		id: "ar-007",
		requesterName: "Florence Garcia",
		department: "HR",
		assetType: "Desk Chair",
		justification:
			"Ergonomic assessment recommended a new chair. Current chair causing back pain.",
		neededByDate: "2026-03-18",
		status: "approved",
		submittedAt: "2026-02-19T15:30:00Z",
		reviewedAt: "2026-02-20T11:00:00Z",
		reviewNote: "Approved — ergonomic assessment on file. Priority fulfillment.",
	},
	{
		id: "ar-008",
		requesterName: "Kayla Parajuli",
		department: "Finance",
		assetType: "Keyboard",
		justification:
			"Wireless ergonomic keyboard to reduce wrist strain. Doctor's recommendation attached.",
		neededByDate: "2026-03-05",
		status: "submitted",
		submittedAt: "2026-03-01T08:45:00Z",
	},
	{
		id: "ar-009",
		requesterName: "Bradley Phillips",
		department: "Support",
		assetType: "Laptop",
		justification:
			"Onboarding next week and no device assigned yet. Need a standard support team laptop.",
		neededByDate: "2026-03-07",
		status: "submitted",
		submittedAt: "2026-03-02T07:30:00Z",
	},
	{
		id: "ar-010",
		requesterName: "Melanie Lee",
		department: "Operations",
		assetType: "Mouse",
		justification:
			"Current mouse is malfunctioning (double-click issue). Need a replacement.",
		neededByDate: "2026-03-04",
		status: "rejected",
		submittedAt: "2026-02-24T09:00:00Z",
		reviewedAt: "2026-02-25T14:00:00Z",
		reviewNote:
			"Rejected — IT has spare mice in stock. Please visit the IT help desk on floor 3.",
	},
];
