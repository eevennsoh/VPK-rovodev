"use client";

import { useCallback, useEffect, useRef } from "react";
import { RovoChatProvider } from "@/app/contexts";
import ChatPanel from "@/components/templates/sidebar-chat/page";

const PORT_COUNT = 3;

export default function MultiportsDemo(): React.ReactElement {
	const containerRef = useRef<HTMLDivElement>(null);

	const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key !== "Tab") return;

		const container = containerRef.current;
		if (!container) return;

		const textareas = Array.from(
			container.querySelectorAll<HTMLTextAreaElement>(
				'textarea[aria-label="Chat message input"]'
			)
		);
		if (textareas.length === 0) return;

		const currentIndex = textareas.indexOf(
			document.activeElement as HTMLTextAreaElement
		);

		let nextIndex: number;
		if (e.shiftKey) {
			nextIndex = currentIndex <= 0 ? textareas.length - 1 : currentIndex - 1;
		} else {
			nextIndex = currentIndex >= textareas.length - 1 ? 0 : currentIndex + 1;
		}

		e.preventDefault();
		textareas[nextIndex].focus();
	}, []);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const textarea = container.querySelector<HTMLTextAreaElement>(
			'textarea[aria-label="Chat message input"]'
		);
		textarea?.focus();
	}, []);

	return (
		<div
			ref={containerRef}
			className="mx-auto flex h-screen items-center justify-center gap-12 px-6"
			onKeyDown={handleKeyDown}
		>
			{Array.from({ length: PORT_COUNT }, (_, i) => (
				<div key={i} className="flex min-w-0 flex-1 justify-center" style={{ maxWidth: 400 }}>
					<RovoChatProvider>
						<ChatPanel
							onClose={() => {}}
							enableSmartWidgets={true}
							sendPromptOptions={{
								smartGeneration: {
									enabled: true,
									surface: "multiports",
								},
							}}
						/>
					</RovoChatProvider>
				</div>
			))}
		</div>
	);
}
