"use client";

import { token } from "@/lib/tokens";
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
					<button
						type="button"
						key={item.label}
						onClick={onClose}
						className="w-full bg-bg-neutral-subtle p-1.5 text-left transition-colors hover:bg-bg-neutral-subtle-hovered"
						style={{
							borderRadius: token("radius.small"),
							cursor: "pointer",
							display: "block",
							border: "none",
						}}
					>
						<div className="flex items-center gap-2">
							<IconComponent label={item.label} />
							<span className="text-sm">{item.text}</span>
						</div>
					</button>
				);
			})}
		</>
	);
}
