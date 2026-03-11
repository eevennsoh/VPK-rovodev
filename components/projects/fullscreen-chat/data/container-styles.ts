export const CONTAINER_STYLES = {
	initial: {
		display: "flex",
		flexDirection: "column" as const,
		alignItems: "center",
		minHeight: "var(--vpk-project-shell-content-height, calc(100vh - 48px))",
		height: "var(--vpk-project-shell-content-height, calc(100vh - 48px))",
		position: "relative" as const,
		padding: "24px 24px 0",
		overflowY: "auto" as const,
	},
	chatMode: {
		display: "flex",
		flexDirection: "column" as const,
		alignItems: "stretch",
		justifyContent: "flex-start",
		minHeight: "var(--vpk-project-shell-content-height, calc(100vh - 48px))",
		height: "var(--vpk-project-shell-content-height, calc(100vh - 48px))",
		position: "relative" as const,
		padding: 0,
	},
} as const;
