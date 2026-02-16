"use client";

import { useState, useEffect } from "react";
import { chatStyles, HOTEL_LOADING_MESSAGES } from "../data/styles";

interface LoadingWidgetProps {
	widgetType?: string;
}

export default function LoadingWidget({ widgetType }: Readonly<LoadingWidgetProps>): React.ReactElement {
	const [step, setStep] = useState(0);

	useEffect(() => {
		if (widgetType === "hotels") {
			const interval = setInterval(() => {
				setStep((prev) => (prev + 1) % HOTEL_LOADING_MESSAGES.length);
			}, 1200);
			return () => clearInterval(interval);
		}
	}, [widgetType]);

	const getMessage = (): string => {
		if (widgetType === "hotels") {
			return HOTEL_LOADING_MESSAGES[step % HOTEL_LOADING_MESSAGES.length];
		}
		if (widgetType === "work-items") {
			return "Loading work items...";
		}
		if (widgetType === "plan") {
			return "Drafting plan...";
		}
		if (widgetType === "question-card") {
			return "Preparing follow-up questions...";
		}
		return "Loading widget...";
	};

	return <div style={chatStyles.loadingWidget}>{getMessage()}</div>;
}
