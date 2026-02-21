"use client";

import SharedCustomizeMenu, { type CustomizeMenuProps as SharedCustomizeMenuProps } from "@/components/blocks/shared-ui/customize-menu";

export type CustomizeMenuProps = SharedCustomizeMenuProps;

export default function CustomizeMenu(props: Readonly<CustomizeMenuProps>): React.ReactElement {
	return <SharedCustomizeMenu {...props} />;
}
