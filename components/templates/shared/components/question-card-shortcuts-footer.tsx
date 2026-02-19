"use client";

import { Footer } from "@/components/ui/footer";

export function QuestionCardShortcutsFooter(): React.ReactElement {
	return (
		<Footer hideIcon>
			<span>
				<kbd className="font-sans">↑</kbd> <kbd className="font-sans">↓</kbd> to navigate
			</span>
			<span aria-hidden>•</span>
			<span>
				<kbd className="font-sans">↵</kbd> Enter to select
			</span>
			<span aria-hidden>•</span>
			<span>Esc to skip</span>
		</Footer>
	);
}
