"use client";

import type { CSSProperties, ReactElement, ReactNode } from "react";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

export interface ThreadMessage {
	id: string;
}

export function groupMessagesByTurn<MESSAGE extends ThreadMessage>(
	messages: ReadonlyArray<MESSAGE>,
	isUserMessage: (message: MESSAGE) => boolean
): MESSAGE[][] {
	return messages.reduce<MESSAGE[][]>((turns, message) => {
		if (isUserMessage(message)) {
			turns.push([message]);
			return turns;
		}

		if (turns.length === 0) {
			turns.push([message]);
			return turns;
		}

		turns[turns.length - 1].push(message);
		return turns;
	}, []);
}

interface MessageTurnsProps<MESSAGE extends ThreadMessage> {
	messages: ReadonlyArray<MESSAGE>;
	isUserMessage: (message: MESSAGE) => boolean;
	latestTurnClassName?: string;
	latestTurnDataAttribute?: `data-${string}`;
	getMessageContainerClassName?: (
		message: MESSAGE,
		messageIndex: number,
		turn: ReadonlyArray<MESSAGE>
	) => string | undefined;
	getMessageContainerStyle?: (
		message: MESSAGE,
		messageIndex: number,
		turn: ReadonlyArray<MESSAGE>
	) => CSSProperties | undefined;
	renderMessage: (
		message: MESSAGE,
		messageIndex: number,
		turn: ReadonlyArray<MESSAGE>
	) => ReactNode;
}

export function MessageTurns<MESSAGE extends ThreadMessage>({
	messages,
	isUserMessage,
	latestTurnClassName,
	latestTurnDataAttribute,
	getMessageContainerClassName,
	getMessageContainerStyle,
	renderMessage,
}: Readonly<MessageTurnsProps<MESSAGE>>): ReactElement {
	const turns = useMemo(
		() => groupMessagesByTurn(messages, isUserMessage),
		[messages, isUserMessage]
	);

	return (
		<>
			{turns.map((turn, turnIndex) => {
				const isLatestTurn = turnIndex === turns.length - 1;
				const latestTurnProps =
					isLatestTurn && latestTurnDataAttribute
						? ({ [latestTurnDataAttribute]: "true" } as Record<string, string>)
						: {};

				return (
					<div
						key={`turn-${turnIndex}-${turn[0]?.id ?? "empty"}`}
						className={cn(isLatestTurn ? latestTurnClassName : undefined)}
						{...latestTurnProps}
					>
						{turn.map((message, messageIndex) => (
							<div
								key={`turn-${turnIndex}-message-${messageIndex}-${message.id}`}
								className={cn(
									getMessageContainerClassName?.(message, messageIndex, turn)
								)}
								style={getMessageContainerStyle?.(message, messageIndex, turn)}
							>
								{renderMessage(message, messageIndex, turn)}
							</div>
						))}
					</div>
				);
			})}
		</>
	);
}
