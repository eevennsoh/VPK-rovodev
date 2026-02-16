"use client";

import { useRef, useEffect, useMemo } from "react";
import type {
	GetTargetScrollTop,
	StickToBottomContext,
} from "use-stick-to-bottom";
import {
	getLatestUserMessageId,
} from "@/lib/rovo-ui-messages";
import type { RovoUIMessage } from "@/lib/rovo-ui-messages";

const LATEST_TURN_TOP_INSET_PX = 48;
const FAST_TURN_SCROLL_ANIMATION = {
	damping: 0.72,
	stiffness: 0.1,
	mass: 0.9,
} as const;

interface UseScrollAnchorOptions {
	uiMessages: RovoUIMessage[];
}

interface UseScrollAnchorReturn {
	conversationContextRef: React.RefObject<StickToBottomContext | null>;
	scrollSpacerRef: React.RefObject<HTMLDivElement | null>;
	getLatestTurnTargetTop: GetTargetScrollTop;
}

export function useScrollAnchor({
	uiMessages,
}: Readonly<UseScrollAnchorOptions>): UseScrollAnchorReturn {
	const conversationContextRef = useRef<StickToBottomContext | null>(null);
	const scrollSpacerRef = useRef<HTMLDivElement>(null);
	const hasInitializedScrollRef = useRef(false);
	const previousLatestUserMessageIdRef = useRef<string | null>(null);

	const latestUserMessageId = useMemo(
		() => getLatestUserMessageId(uiMessages),
		[uiMessages]
	);

	useEffect(() => {
		const scrollElement = conversationContextRef.current?.scrollRef.current;
		if (!scrollElement) {
			return;
		}

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
	}, [latestUserMessageId, uiMessages.length]);

	const getLatestTurnTargetTop = useMemo<GetTargetScrollTop>(
		() => (defaultTargetTop, { scrollElement }) => {
			const latestTurnElement = scrollElement.querySelector<HTMLElement>(
				"[data-chat-latest-turn='true']"
			);
			if (!latestTurnElement) {
				return defaultTargetTop;
			}

			const scrollRect = scrollElement.getBoundingClientRect();
			const latestTurnRect = latestTurnElement.getBoundingClientRect();
			const rawTargetTop = scrollElement.scrollTop + (latestTurnRect.top - scrollRect.top);
			const desiredTargetTop = Math.max(0, rawTargetTop - LATEST_TURN_TOP_INSET_PX);
			const availableScrollRange = scrollElement.scrollHeight - scrollElement.clientHeight;
			const currentSpacerHeight = scrollSpacerRef.current?.offsetHeight ?? 0;
			const availableScrollRangeWithoutSpacer = Math.max(
				0,
				availableScrollRange - currentSpacerHeight
			);
			const requiredSpacer = Math.max(
				0,
				desiredTargetTop - availableScrollRangeWithoutSpacer
			);

			if (scrollSpacerRef.current) {
				scrollSpacerRef.current.style.height = `${requiredSpacer}px`;
			}

			const maxScrollTopWithPadding = Math.max(
				0,
				scrollElement.scrollHeight - scrollElement.clientHeight
			);

			return Math.min(maxScrollTopWithPadding, desiredTargetTop);
		},
		[]
	);

	return { conversationContextRef, scrollSpacerRef, getLatestTurnTargetTop };
}
