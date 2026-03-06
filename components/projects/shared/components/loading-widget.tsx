"use client";

import { useEffect, useState } from "react";
import {
	HOTEL_LOADING_MESSAGES,
	WIDGET_LOADING_MESSAGES,
} from "../data/loading-messages";

interface LoadingWidgetProps {
	widgetType?: string;
}

function getLoadingMessage(widgetType: string | undefined, step: number): string {
	if (widgetType === "hotels") {
		return HOTEL_LOADING_MESSAGES[step % HOTEL_LOADING_MESSAGES.length];
	}

	if (widgetType && widgetType in WIDGET_LOADING_MESSAGES) {
		return WIDGET_LOADING_MESSAGES[widgetType];
	}

	return WIDGET_LOADING_MESSAGES.default;
}

export default function LoadingWidget({
	widgetType,
}: Readonly<LoadingWidgetProps>): React.ReactElement {
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
		<div
			role="status"
			aria-live="polite"
			className="mx-6 flex items-center justify-start rounded-lg bg-bg-neutral-subtle p-2 text-sm text-text-subtlest"
		>
			{getLoadingMessage(widgetType, step)}
		</div>
	);
}
