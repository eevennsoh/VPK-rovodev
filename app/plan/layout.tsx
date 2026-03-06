import type { Metadata } from "next";
import { getProjectPageTitle } from "@/lib/project-page-title";

export const metadata: Metadata = {
	title: getProjectPageTitle("plan"),
	openGraph: {
		title: `${getProjectPageTitle("plan")} — VPK`,
	},
};

export default function PlanLayout({ children }: { children: React.ReactNode }) {
	return children;
}
