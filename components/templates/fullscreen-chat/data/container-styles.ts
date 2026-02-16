export const CONTAINER_STYLES = {
	initial: {
		display: "flex",
		flexDirection: "column" as const,
		alignItems: "center",
		justifyContent: "center",
		minHeight: "calc(100vh - 48px)",
		height: "calc(100vh - 48px)",
		position: "relative" as const,
		padding: "24px",
	},
	chatMode: {
		display: "flex",
		flexDirection: "column" as const,
		alignItems: "stretch",
		justifyContent: "flex-start",
		minHeight: "calc(100vh - 48px)",
		height: "calc(100vh - 48px)",
		position: "relative" as const,
		padding: 0,
	},
} as const;
