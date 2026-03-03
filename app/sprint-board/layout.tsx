import type { ReactNode } from "react";

export const metadata = {
	title: "ABCD",
	description: "Kanban-style board with drag-and-drop task management",
};

export default function SprintBoardLayout({ children }: { children: ReactNode }) {
	return <>{children}</>;
}
