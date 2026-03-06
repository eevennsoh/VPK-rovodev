import AddIcon from "@atlaskit/icon/core/add";
import LinkIcon from "@atlaskit/icon/core/link";
import MentionIcon from "@atlaskit/icon/core/mention";
import PageIcon from "@atlaskit/icon/core/page";
import UploadIcon from "@atlaskit/icon/core/upload";
/**
 * Menu item configurations for the chat input add menu
 */


export interface AddMenuItem {
	icon: typeof UploadIcon;
	label: string;
	text: string;
}

export const ADD_MENU_ITEMS: AddMenuItem[] = [
	{ icon: UploadIcon, label: "Upload file", text: "Upload file" },
	{ icon: LinkIcon, label: "Add link", text: "Add a link" },
	{ icon: MentionIcon, label: "Mention someone", text: "Mention someone" },
	{ icon: AddIcon, label: "More formatting", text: "More formatting" },
	{ icon: PageIcon, label: "Add current page as context", text: "Add current page as context" },
] as const;
