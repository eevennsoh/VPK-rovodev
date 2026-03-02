import type { ReactNode } from "react";

export const metadata = {
	title: "Sprint Board",
	description: "Kanban-style sprint board with drag-and-drop task management",
};

export default function SprintBoardLayout({ children }: { children: ReactNode }) {
	return <>{children}</>;
}
