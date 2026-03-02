import type { ReactNode } from "react";

export const metadata = {
	title: "Sprint Board",
	description: "3-column sprint board with drag-and-drop task management",
};

export default function BoardLayout({ children }: { children: ReactNode }) {
	return <>{children}</>;
}
