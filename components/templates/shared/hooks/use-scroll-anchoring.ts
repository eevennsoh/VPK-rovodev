"use client";

import { useRef, useEffect, useMemo } from "react";
import type { StickToBottomContext } from "use-stick-to-bottom";
import { getLatestUserMessageId } from "@/lib/rovo-ui-messages";
import type { RovoUIMessage } from "@/lib/rovo-ui-messages";

const FAST_TURN_SCROLL_ANIMATION = {
	damping: 0.72,
	stiffness: 0.1,
	mass: 0.9,
} as const;

interface UseScrollAnchoringOptions {
	uiMessages: RovoUIMessage[];
	enabled?: boolean;
}

interface UseScrollAnchoringReturn {
	conversationContextRef: React.RefObject<StickToBottomContext | null>;
	scrollSpacerRef: React.RefObject<HTMLDivElement | null>;
}

export function useScrollAnchoring({
	uiMessages,
	enabled = true,
}: Readonly<UseScrollAnchoringOptions>): UseScrollAnchoringReturn {
	const conversationContextRef = useRef<StickToBottomContext | null>(null);
	const scrollSpacerRef = useRef<HTMLDivElement>(null);
	const hasInitializedScrollRef = useRef(false);
	const previousLatestUserMessageIdRef = useRef<string | null>(null);

	const latestUserMessageId = useMemo(
		() => getLatestUserMessageId(uiMessages),
		[uiMessages]
	);

	useEffect(() => {
		if (!enabled) return;

		const scrollElement = conversationContextRef.current?.scrollRef.current;
		if (!scrollElement) return;

		const hasNewUserTurn =
			hasInitializedScrollRef.current &&
			latestUserMessageId !== null &&
			latestUserMessageId !== previousLatestUserMessageIdRef.current;
		const shouldAnchorToLatestTurn = !hasInitializedScrollRef.current || hasNewUserTurn;

		if (shouldAnchorToLatestTurn) {
			void conversationContextRef.current?.scrollToBottom({
				animation: hasNewUserTurn ? FAST_TURN_SCROLL_ANIMATION : "instant",
				ignoreEscapes: true,
			});
		}

		previousLatestUserMessageIdRef.current = latestUserMessageId;
		hasInitializedScrollRef.current = true;
	}, [latestUserMessageId, uiMessages.length, enabled]);

	return { conversationContextRef, scrollSpacerRef };
}
