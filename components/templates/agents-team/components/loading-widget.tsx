"use client";

import { useEffect, useState } from "react";

const HOTEL_LOADING_MESSAGES = [
	"Accessing calendar...",
	"Confirming travel policy...",
	"Searching hotels...",
] as const;

interface LoadingWidgetProps {
	widgetType?: string;
}

function getWidgetMessage(widgetType: string | undefined, step: number): string {
	if (widgetType === "hotels") {
		return HOTEL_LOADING_MESSAGES[step % HOTEL_LOADING_MESSAGES.length];
	}
	if (widgetType === "work-items") return "Loading work items...";
	if (widgetType === "plan") return "Drafting plan...";
	if (widgetType === "question-card") return "Preparing follow-up questions...";
	return "Loading widget...";
}

export default function LoadingWidget({ widgetType }: Readonly<LoadingWidgetProps>) {
	const [step, setStep] = useState(0);

	useEffect(() => {
		if (widgetType !== "hotels") {
			return;
		}

		const intervalId = setInterval(() => {
			setStep((previousStep) => (previousStep + 1) % HOTEL_LOADING_MESSAGES.length);
		}, 1200);

		return () => clearInterval(intervalId);
	}, [widgetType]);

	return (
		<div className="mx-6 flex items-center justify-start rounded-lg bg-bg-neutral-subtle p-2 text-sm text-text-subtlest">
			{getWidgetMessage(widgetType, step)}
		</div>
	);
}
