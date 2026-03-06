import type { Metadata } from "next";
import { getProjectPageTitle } from "@/lib/project-page-title";

export const metadata: Metadata = {
	title: getProjectPageTitle("make"),
	openGraph: {
		title: `${getProjectPageTitle("make")} — VPK`,
	},
};

export default function MakeLayout({ children }: { children: React.ReactNode }) {
	return children;
}
