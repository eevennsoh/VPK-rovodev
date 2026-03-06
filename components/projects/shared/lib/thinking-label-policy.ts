import type { ReasoningPhase } from "@/components/templates/shared/hooks/use-reasoning-phase";

interface ResolveThinkingLabelForSurfaceOptions {
	baseLabel: string;
	surface: "sidebar" | "fullscreen";
	reasoningPhase: ReasoningPhase;
}

export function resolveThinkingLabelForSurface({
	baseLabel,
}: Readonly<ResolveThinkingLabelForSurfaceOptions>): string {
	return baseLabel;
}
