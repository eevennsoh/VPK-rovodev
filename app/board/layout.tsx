import type { ReactNode } from "react";

export const metadata = {
	title: "ABCD",
	description: "3-column board with drag-and-drop task management",
};

export default function BoardLayout({ children }: { children: ReactNode }) {
	return <>{children}</>;
}
