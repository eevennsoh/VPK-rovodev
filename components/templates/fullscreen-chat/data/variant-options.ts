import FullscreenEnterIcon from "@atlaskit/icon/core/fullscreen-enter";
import PanelRightIcon from "@atlaskit/icon/core/panel-right";
import SmartLinkEmbedIcon from "@atlaskit/icon/core/smart-link-embed";
import type { PanelVariant } from "../types";

/** @deprecated Use PanelVariant from "../types" instead */
export type ChatVariant = PanelVariant;

export interface VariantOption {
	id: string;
	icon: typeof PanelRightIcon;
	label: string;
	variant?: ChatVariant;
	isFullScreen?: boolean;
}

export const VARIANT_OPTIONS: VariantOption[] = [
	{ id: "sidepanel", icon: PanelRightIcon, label: "Side panel", variant: "sidepanel" },
	{ id: "floating", icon: SmartLinkEmbedIcon, label: "Floating", variant: "floating" },
	{ id: "fullscreen", icon: FullscreenEnterIcon, label: "Full screen", isFullScreen: true },
] as const;
