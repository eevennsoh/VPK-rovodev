"use client";

import { useCallback, useEffect, useState } from "react";
import type { ConversationContextValue } from "@/components/ui-ai/conversation";

const SCROLL_BUTTON_THRESHOLD_PX = 100;

interface UseScrollToBottomOptions {
	conversationContextRef: React.RefObject<ConversationContextValue | null>;
}

interface UseScrollToBottomReturn {
	showScrollButton: boolean;
	scrollToBottom: () => void;
}

export function useScrollToBottom({
	conversationContextRef,
}: Readonly<UseScrollToBottomOptions>): UseScrollToBottomReturn {
	const [showScrollButton, setShowScrollButton] = useState(false);

	useEffect(() => {
		const ctx = conversationContextRef.current;
		if (!ctx) return;

		const scrollEl = ctx.scrollRef.current;
		const contentEl = ctx.contentRef.current;
		if (!scrollEl) return;

		function check() {
			if (!scrollEl) return;
			const distanceFromBottom =
				scrollEl.scrollHeight - scrollEl.clientHeight - scrollEl.scrollTop;
			setShowScrollButton(distanceFromBottom > SCROLL_BUTTON_THRESHOLD_PX);
		}

		check();
		scrollEl.addEventListener("scroll", check, { passive: true });

		const observer = new ResizeObserver(check);
		if (contentEl) observer.observe(contentEl);
		observer.observe(scrollEl);

		return () => {
			scrollEl.removeEventListener("scroll", check);
			observer.disconnect();
		};
	}, [conversationContextRef]);

	const scrollToBottom = useCallback(() => {
		const scrollEl = conversationContextRef.current?.scrollRef.current;
		if (scrollEl) {
			scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: "smooth" });
		}
	}, [conversationContextRef]);

	return { showScrollButton, scrollToBottom };
}
