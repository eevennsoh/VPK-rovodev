import type { Metadata } from "next";
import { getTemplatePageTitle } from "@/lib/template-page-title";

export const metadata: Metadata = {
	title: getTemplatePageTitle("plan"),
	openGraph: {
		title: `${getTemplatePageTitle("plan")} — VPK`,
	},
};

export default function PlanLayout({ children }: { children: React.ReactNode }) {
	return children;
}
