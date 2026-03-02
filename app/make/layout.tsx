import type { Metadata } from "next";
import { getTemplatePageTitle } from "@/lib/template-page-title";

export const metadata: Metadata = {
	title: getTemplatePageTitle("make"),
	openGraph: {
		title: `${getTemplatePageTitle("make")} — VPK`,
	},
};

export default function MakeLayout({ children }: { children: React.ReactNode }) {
	return children;
}
