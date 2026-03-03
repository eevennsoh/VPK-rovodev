export type DesignConfig = {
	theme: "light" | "dark";
	radius: number;
	density: "compact" | "default" | "spacious";
	shadow: "none" | "subtle" | "raised";
	animation: boolean;
	fontScale: number;
	fontFamily: "system" | "mono" | "serif";
	letterSpacing: number;
	borders: boolean;
	grayscale: boolean;
	heading: string;
	subheading: string;
};

export const DEFAULT_DESIGN_CONFIG: DesignConfig = {
	theme: "light",
	radius: 6,
	density: "default",
	shadow: "subtle",
	animation: true,
	fontScale: 1,
	fontFamily: "system",
	letterSpacing: 0,
	borders: true,
	grayscale: false,
	heading: "",
	subheading: "",
};

export const VPK_DESIGN_CONFIG_MESSAGE_TYPE = "vpk-design-config" as const;

export type DesignConfigMessage = {
	type: typeof VPK_DESIGN_CONFIG_MESSAGE_TYPE;
	config: DesignConfig;
};

export function sendDesignConfigToIframe(
	iframe: HTMLIFrameElement,
	config: DesignConfig,
): void {
	try {
		iframe.contentWindow?.postMessage(
			{ type: VPK_DESIGN_CONFIG_MESSAGE_TYPE, config } satisfies DesignConfigMessage,
			"*",
		);
	} catch {
		// Ignore cross-origin errors
	}
}
