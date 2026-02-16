"use client";

import Image from "next/image";
import { Message, MessageContent } from "@/components/ui-ai/message";
import { Shimmer } from "@/components/ui-ai/shimmer";

const DOT_COLORS = ["#1868db", "#bf63f3", "#fca700"] as const;

interface ThinkingIndicatorProps {
	label?: string;
}

export function ThinkingIndicator({
	label = "Thinking",
}: Readonly<ThinkingIndicatorProps>) {
	return (
		<Message from="assistant" className="max-w-full">
			<MessageContent className="px-3">
				<style
					dangerouslySetInnerHTML={{
						__html: `
							@keyframes dot-reveal {
								0%, 20% { opacity: 0; }
								40%, 100% { opacity: 1; }
							}
						`,
					}}
				/>
				<span className="inline-flex items-center gap-2">
					<Image
						src="/loading/rovo-logo.gif"
						alt=""
						width={20}
						height={20}
						unoptimized
					/>
					<span className="inline-flex items-baseline">
						<Shimmer duration={1} as="span">
							{label}
						</Shimmer>
						<span className="inline-flex items-baseline" aria-hidden="true">
							{DOT_COLORS.map((color, i) => (
								<span
									key={i}
									className="text-sm leading-none"
									style={{
										color,
										animation: "dot-reveal 1.2s ease-in-out infinite",
										animationDelay: `${i * 0.2}s`,
									}}
								>
									.
								</span>
							))}
						</span>
					</span>
				</span>
			</MessageContent>
		</Message>
	);
}
