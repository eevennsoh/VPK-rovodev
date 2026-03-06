import type { Category } from "@/components/blocks/make-gallery/data/gallery-items";
import { GALLERY_ITEMS } from "@/components/blocks/make-gallery/data/gallery-items";

export interface MakeItemRecurring {
	runs: number;
	schedule: string;
	enabled: boolean;
}

export interface MakeItemRunMeta {
	runId: string;
	status: "running" | "completed";
	taskCount: number;
	agentCount: number;
}

export interface MakeItem {
	id: string;
	title: string;
	description: string;
	type: Category;
	ascii: string;
	color: string;
	animationId?: string;
	lastUpdated: string;
	users: number;
	rating: number;
	ratingCount: string;
	maintainers: { name: string; src?: string }[];
	recurring?: MakeItemRecurring;
	runMeta?: MakeItemRunMeta;
}

// Convert some gallery items into MakeItem for our mock data
export const MOCK_MAKE_ITEMS: MakeItem[] = [
	{
		id: GALLERY_ITEMS[0].id,
		title: GALLERY_ITEMS[0].title,
		description: GALLERY_ITEMS[0].description,
		type: GALLERY_ITEMS[0].type,
		ascii: GALLERY_ITEMS[0].ascii,
		color: GALLERY_ITEMS[0].color,
		lastUpdated: "Feb 22, 2026",
		users: 12408,
		rating: 4.6,
		ratingCount: "3.8K",
		maintainers: [
			{ name: "Alex" },
			{ name: "Sam" },
			{ name: "Jordan" },
			{ name: "Taylor" },
			{ name: "Casey" },
			{ name: "Riley" },
			{ name: "Morgan" },
		],
	},
	{
		id: GALLERY_ITEMS[6].id, // code-reviewer
		title: GALLERY_ITEMS[6].title,
		description: GALLERY_ITEMS[6].description,
		type: GALLERY_ITEMS[6].type,
		ascii: GALLERY_ITEMS[6].ascii,
		color: GALLERY_ITEMS[6].color,
		lastUpdated: "Feb 20, 2026",
		users: 9124,
		rating: 4.8,
		ratingCount: "2.1K",
		maintainers: [
			{ name: "Sarah" },
			{ name: "James" },
			{ name: "Lee" },
		],
		runMeta: {
			runId: "run-demo-1",
			status: "running",
			taskCount: 3,
			agentCount: 2,
		},
	},
	{
		id: GALLERY_ITEMS[12].id, // auto-assign
		title: GALLERY_ITEMS[12].title,
		description: GALLERY_ITEMS[12].description,
		type: GALLERY_ITEMS[12].type,
		ascii: GALLERY_ITEMS[12].ascii,
		color: GALLERY_ITEMS[12].color,
		lastUpdated: "Feb 19, 2026",
		users: 7312,
		rating: 4.5,
		ratingCount: "1.2K",
		maintainers: [
			{ name: "Avery" },
			{ name: "Drew" },
		],
		recurring: {
			runs: 2,
			schedule: "Every Friday, 9 AM",
			enabled: true,
		},
	},
	{
		id: GALLERY_ITEMS[18].id, // jql-wizard
		title: GALLERY_ITEMS[18].title,
		description: GALLERY_ITEMS[18].description,
		type: GALLERY_ITEMS[18].type,
		ascii: GALLERY_ITEMS[18].ascii,
		color: GALLERY_ITEMS[18].color,
		lastUpdated: "Feb 23, 2026",
		users: 8456,
		rating: 4.9,
		ratingCount: "4.5K",
		maintainers: [
			{ name: "Blake" },
			{ name: "Cameron" },
			{ name: "Dana" },
			{ name: "Ellis" },
		],
	},
];
