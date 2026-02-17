import type { Metadata } from "next";
import { getTemplatePageTitle } from "@/lib/template-page-title";

export const metadata: Metadata = {
	title: getTemplatePageTitle("sidebar-chat"),
	openGraph: {
		title: `${getTemplatePageTitle("sidebar-chat")} — VPK`,
	},
};

export default function SidebarChatLayout({ children }: { children: React.ReactNode }) {
	return children;
}
