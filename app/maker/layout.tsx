import type { Metadata } from "next";
import { getTemplatePageTitle } from "@/lib/template-page-title";

export const metadata: Metadata = {
	title: getTemplatePageTitle("maker"),
	openGraph: {
		title: `${getTemplatePageTitle("maker")} — VPK`,
	},
};

export default function MakerLayout({ children }: { children: React.ReactNode }) {
	return children;
}
