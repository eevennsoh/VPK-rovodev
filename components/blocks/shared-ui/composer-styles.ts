import { token } from "@/lib/tokens";

export const composerUpwardShadow =
	"0px -2px 50px 8px rgba(30, 31, 33, 0.08)";

export const composerPromptInputClassName =
	"chat-composer-form w-full [&>[data-slot=input-group]]:h-auto [&>[data-slot=input-group]]:border-0 [&>[data-slot=input-group]]:bg-transparent [&>[data-slot=input-group]]:shadow-none [&>[data-slot=input-group]]:ring-0";

export const composerTextareaClassName =
	"chat-composer-textarea h-6 min-h-6 max-h-[120px] px-0 py-0 font-normal leading-6 shadow-none outline-none ring-0";

export const textareaCSS = `
	.chat-composer-textarea::placeholder {
		color: ${token("color.text.subtlest")};
	}
`;
