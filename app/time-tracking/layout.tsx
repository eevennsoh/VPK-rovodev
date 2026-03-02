import type { ReactNode } from "react";

export const metadata = {
	title: "Time Tracking",
	description: "Log and track work hours with daily and weekly calendar views",
};

export default function TimeTrackingLayout({ children }: { children: ReactNode }) {
	return <>{children}</>;
}
