import type { Metadata } from "next";
import { getTemplatePageTitle } from "@/lib/template-page-title";

export const metadata: Metadata = {
	title: getTemplatePageTitle("time-tracking"),
	description: "Track time across projects and tasks with daily and weekly views",
	openGraph: {
		title: `${getTemplatePageTitle("time-tracking")} — VPK`,
		description: "Track time across projects and tasks with daily and weekly views",
	},
};

export default function TimeTrackingLayout({ children }: { children: React.ReactNode }) {
	return children;
}
