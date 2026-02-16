"use client";

import { token } from "@/lib/tokens";

const SHADOW_TOKENS = [
	{
		token: "elevation.shadow.raised",
		label: "Raised",
		description: "Cards, tiles, and raised containers",
	},
	{
		token: "elevation.shadow.overflow",
		label: "Overflow",
		description: "Dropdowns, popovers, and floating menus",
	},
	{
		token: "elevation.shadow.overlay",
		label: "Overlay",
		description: "Modals, dialogs, and full overlays",
	},
] as const;

export default function ShadowDemo() {
	return (
		<div className="flex flex-col w-full max-w-2xl" style={{ gap: token("space.400") }}>
			<div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: token("space.300") }}>
				{SHADOW_TOKENS.map((s) => (
					<div key={s.token} className="flex flex-col items-center" style={{ gap: token("space.200") }}>
						<div
							className="w-full aspect-square rounded-lg bg-surface flex items-center justify-center"
							style={{ boxShadow: token(s.token) }}
						>
							<span className="text-text-subtle text-sm font-medium">
								{s.label}
							</span>
						</div>
						<div className="flex flex-col items-center" style={{ gap: token("space.050") }}>
							<code className="text-text-subtlest text-xs font-mono">
								{s.token}
							</code>
							<span className="text-text-subtle text-xs text-center">
								{s.description}
							</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
