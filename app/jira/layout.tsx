import type { Metadata } from "next";
import { getTemplatePageTitle } from "@/lib/template-page-title";

export const metadata: Metadata = {
	title: getTemplatePageTitle("jira"),
	description: "Jira board view",
	openGraph: {
		title: getTemplatePageTitle("jira"),
		description: "Jira board view",
	},
};

export default function JiraLayout({ children }: { children: React.ReactNode }) {
	return <>{children}</>;
}
