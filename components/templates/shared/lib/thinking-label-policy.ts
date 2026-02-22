import type { ReasoningPhase } from "@/components/templates/shared/hooks/use-reasoning-phase";

export const SIDEBAR_THINKING_LABEL = "Rovo is cooking";

interface ResolveThinkingLabelForSurfaceOptions {
	baseLabel: string;
	surface: "sidebar" | "fullscreen";
	reasoningPhase: ReasoningPhase;
}

export function resolveThinkingLabelForSurface({
	baseLabel,
	surface,
	reasoningPhase,
}: Readonly<ResolveThinkingLabelForSurfaceOptions>): string {
	if (surface === "sidebar" && reasoningPhase === "thinking") {
		return SIDEBAR_THINKING_LABEL;
	}

	return baseLabel;
}
