import type { NewCoreIconProps } from "@atlaskit/icon/base-new";

export interface NavigationItemProps {
	icon: React.ComponentType<NewCoreIconProps>;
	label: string;
	href?: string;
	isSelected?: boolean;
	hasChevron?: boolean;
	hasExternalLink?: boolean;
	hasActions?: boolean;
	onClick?: () => void;
}

export interface NavigationItemWithHoverChevronProps {
	icon: React.ComponentType<NewCoreIconProps>;
	label: string;
	isExpanded?: boolean;
	hasActions?: boolean;
	onClick?: () => void;
}
