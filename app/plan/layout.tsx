import type { Metadata } from "next";
import { getTemplatePageTitle } from "@/lib/template-page-title";

export const metadata: Metadata = {
	title: getTemplatePageTitle("agents-team"),
	openGraph: {
		title: `${getTemplatePageTitle("agents-team")} — VPK`,
	},
};

export default function PlanLayout({ children }: { children: React.ReactNode }) {
	return children;
}
