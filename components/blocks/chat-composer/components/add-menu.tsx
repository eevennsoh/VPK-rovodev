"use client";

import InputAddMenu from "@/components/templates/fullscreen-chat/components/input-add-menu";

interface AddMenuProps {
	onClose: () => void;
}

export default function AddMenu({ onClose }: Readonly<AddMenuProps>): React.ReactElement {
	return <InputAddMenu onClose={onClose} />;
}
