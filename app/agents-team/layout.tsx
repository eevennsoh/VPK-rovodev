import type { Metadata } from "next";
import { getTemplatePageTitle } from "@/lib/template-page-title";

export const metadata: Metadata = {
	title: getTemplatePageTitle("agents-team"),
	openGraph: {
		title: getTemplatePageTitle("agents-team"),
	},
};

export default function AgentsTeamLayout({ children }: { children: React.ReactNode }) {
	return children;
}
