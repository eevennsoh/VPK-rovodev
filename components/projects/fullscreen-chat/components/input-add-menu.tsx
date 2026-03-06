"use client";

import { PromptInputActionMenuItem } from "@/components/ui-ai/prompt-input";
import { ADD_MENU_ITEMS } from "../data/input-menu-items";

interface InputAddMenuProps {
	onClose: () => void;
}

export default function InputAddMenu({ onClose }: Readonly<InputAddMenuProps>) {
	return (
		<>
			{ADD_MENU_ITEMS.map((item) => {
				const IconComponent = item.icon;
				return (
					<PromptInputActionMenuItem
						key={item.label}
						onSelect={onClose}
						elemBefore={<IconComponent label="" />}
					>
						{item.text}
					</PromptInputActionMenuItem>
				);
			})}
		</>
	);
}
