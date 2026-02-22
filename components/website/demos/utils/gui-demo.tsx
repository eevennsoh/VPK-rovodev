"use client";

import { useMemo, useState } from "react";

import { GUI } from "@/components/utils/gui";

export default function GUIDemo() {
	const [radius, setRadius] = useState(8);
	const [opacity, setOpacity] = useState(1);
	const [size, setSize] = useState(120);
	const [rotation, setRotation] = useState(0);

	const config = useMemo(
		() => ({ radius, opacity, size, rotation }),
		[radius, opacity, size, rotation],
	);

	return (
		<div className="mx-auto flex w-full max-w-[480px] flex-col gap-4">
			<div className="flex items-center justify-center py-6">
				<div
					className="bg-primary"
					style={{
						width: size,
						height: size,
						borderRadius: radius,
						opacity,
						transform: `rotate(${rotation}deg)`,
						transition: "all 150ms ease-out",
					}}
				/>
			</div>
			<GUI.Panel title="Shape controls" values={config}>
				<GUI.Control
					id="gui-size"
					label="Size"
					description="Width and height of the shape."
					value={size}
					defaultValue={120}
					min={40}
					max={200}
					step={1}
					unit="px"
					onChange={setSize}
				/>
				<GUI.Control
					id="gui-radius"
					label="Radius"
					description="Border radius of the shape."
					value={radius}
					defaultValue={8}
					min={0}
					max={100}
					step={1}
					unit="px"
					onChange={setRadius}
				/>
				<GUI.Control
					id="gui-opacity"
					label="Opacity"
					description="Transparency of the shape."
					value={opacity}
					defaultValue={1}
					min={0}
					max={1}
					step={0.01}
					onChange={setOpacity}
				/>
				<GUI.Control
					id="gui-rotation"
					label="Rotation"
					description="Rotation angle of the shape."
					value={rotation}
					defaultValue={0}
					min={-180}
					max={180}
					step={1}
					unit="deg"
					onChange={setRotation}
				/>
			</GUI.Panel>
		</div>
	);
}
