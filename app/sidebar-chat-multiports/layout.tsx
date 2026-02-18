import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Sidebar Chat Multiport Demo — VPK",
	openGraph: {
		title: "Sidebar Chat Multiport Demo — VPK",
	},
};

export default function SidebarChatMultiportsLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return children;
}
