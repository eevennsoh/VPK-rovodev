export interface TableRow {
	id: number;
	header: string;
	type: string;
	status: string;
	target: string;
	limit: string;
	reviewer: string;
}

export const SAMPLE_TABLE_DATA: TableRow[] = [
	{
		id: 1,
		header: "Executive Summary",
		type: "Executive Summary",
		status: "Done",
		target: "5",
		limit: "10",
		reviewer: "Eddie Lake",
	},
	{
		id: 2,
		header: "Technical Approach",
		type: "Technical Approach",
		status: "In Progress",
		target: "8",
		limit: "15",
		reviewer: "Jamik Tashpulatov",
	},
	{
		id: 3,
		header: "Design Specifications",
		type: "Design",
		status: "In Progress",
		target: "12",
		limit: "20",
		reviewer: "Emily Whalen",
	},
	{
		id: 4,
		header: "Table of Contents",
		type: "Table of Contents",
		status: "Done",
		target: "2",
		limit: "5",
		reviewer: "Eddie Lake",
	},
	{
		id: 5,
		header: "Capabilities Overview",
		type: "Capabilities",
		status: "Not Started",
		target: "6",
		limit: "12",
		reviewer: "Assign reviewer",
	},
	{
		id: 6,
		header: "Focus Documents",
		type: "Focus Documents",
		status: "In Progress",
		target: "4",
		limit: "8",
		reviewer: "Jamik Tashpulatov",
	},
	{
		id: 7,
		header: "Project Narrative",
		type: "Narrative",
		status: "Done",
		target: "10",
		limit: "18",
		reviewer: "Emily Whalen",
	},
	{
		id: 8,
		header: "Cover Page",
		type: "Cover Page",
		status: "Done",
		target: "1",
		limit: "3",
		reviewer: "Eddie Lake",
	},
];
