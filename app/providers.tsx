"use client";

import { ThemeWrapper } from "@/components/utils/theme-wrapper";
import { SidebarProvider } from "@/app/contexts/context-sidebar";
import { RovoChatProvider } from "@/app/contexts/context-rovo-chat";
import { CreationModeProvider } from "@/app/contexts/context-creation-mode";

// VPK does not initialize Atlassian Feature Gates in local prototype mode.
// Override the problematic Rovo logo gate locally to avoid uninitialized FG client warnings.
const platformFeatureFlags = globalThis as typeof globalThis & {
	__PLATFORM_FEATURE_FLAGS__?: {
		booleanResolver?: (flagName: string) => boolean;
	};
};
const existingBooleanResolver =
	platformFeatureFlags.__PLATFORM_FEATURE_FLAGS__?.booleanResolver;

platformFeatureFlags.__PLATFORM_FEATURE_FLAGS__ = {
	...platformFeatureFlags.__PLATFORM_FEATURE_FLAGS__,
	booleanResolver: (flagName: string) => {
		if (flagName === "platform-logo-rebrand-rovo-hex") {
			return false;
		}

		return existingBooleanResolver?.(flagName) ?? false;
	},
};

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<ThemeWrapper>
			<SidebarProvider>
				<CreationModeProvider>
					<RovoChatProvider>
						{children}
					</RovoChatProvider>
				</CreationModeProvider>
			</SidebarProvider>
		</ThemeWrapper>
	);
}
