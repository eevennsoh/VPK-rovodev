"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export default function SliderDemo() {
	const [value, setValue] = useState([50]);

	return (
		<div className="flex w-48 flex-col gap-2">
			<Slider value={value} onValueChange={(v) => setValue(Array.isArray(v) ? [...v] : [v])} />
			<span className="text-xs text-muted-foreground text-center">{value[0]}%</span>
		</div>
	);
}

export function SliderDemoBasic() {
	return <Slider defaultValue={[50]} max={100} step={1} />;
}

export function SliderDemoControlled() {
	const [value, setValue] = useState([0.3, 0.7]);

	return (
		<div className="grid w-full gap-3">
			<div className="flex items-center justify-between gap-2">
				<Label htmlFor="slider-demo-temperature">Temperature</Label>
				<span className="text-muted-foreground text-sm">
					{value.join(", ")}
				</span>
			</div>
			<Slider
				id="slider-demo-temperature"
				value={value}
				onValueChange={(value) => setValue(value as number[])}
				min={0}
				max={1}
				step={0.1}
			/>
		</div>
	);
}

export function SliderDemoDefault() {
	return (
		<div className="w-64">
			<Slider defaultValue={[50]} max={100} />
		</div>
	);
}

export function SliderDemoDisabled() {
	return <Slider defaultValue={[50]} max={100} step={1} disabled />;
}

export function SliderDemoMultipleThumbs() {
	return <Slider defaultValue={[10, 20, 70]} max={100} step={10} />;
}

export function SliderDemoRange() {
	return <Slider defaultValue={[25, 50]} max={100} step={5} />;
}

export function SliderDemoVertical() {
	return (
		<div className="flex items-center gap-6">
			<Slider
				defaultValue={[50]}
				max={100}
				step={1}
				orientation="vertical"
				className="h-40"
			/>
			<Slider
				defaultValue={[25]}
				max={100}
				step={1}
				orientation="vertical"
				className="h-40"
			/>
		</div>
	);
}
