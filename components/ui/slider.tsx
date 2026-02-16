"use client";

import * as React from "react";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "@/lib/utils";

export type SliderProps = SliderPrimitive.Root.Props;

function Slider({
	className,
	defaultValue,
	value,
	min = 0,
	max = 100,
	...props
}: Readonly<SliderProps>) {
	const values = React.useMemo(() => {
		if (Array.isArray(value)) return value;
		if (typeof value === "number") return [value];
		if (Array.isArray(defaultValue)) return defaultValue;
		if (typeof defaultValue === "number") return [defaultValue];
		return [min];
	}, [value, defaultValue, min]);

	return (
		<SliderPrimitive.Root
			className={cn("w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-auto", className)}
			data-slot="slider"
			defaultValue={defaultValue}
			value={value}
			min={min}
			max={max}
			thumbAlignment="edge"
			{...props}
		>
			<SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:pointer-events-none data-disabled:opacity-(--opacity-disabled) data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-40 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col">
				<SliderPrimitive.Track
					data-slot="slider-track"
					className="bg-bg-neutral-subtle-hovered rounded-full relative grow overflow-hidden select-none data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
				>
					<SliderPrimitive.Indicator
						data-slot="slider-range"
						className="bg-bg-neutral-bold select-none data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
					/>
				</SliderPrimitive.Track>
				{Array.from({ length: values.length }, (_, index) => (
					<SliderPrimitive.Thumb
						data-slot="slider-thumb"
						key={index}
						className="border-border-bold ring-ring/50 relative block size-5 shrink-0 select-none rounded-full border bg-bg-neutral-bold shadow-sm transition-[background-color,box-shadow] after:absolute after:-inset-2 hover:bg-bg-neutral-bold-hovered active:bg-bg-neutral-bold-pressed active:ring-3 focus-visible:border-ring focus-visible:ring-3 focus-visible:outline-hidden disabled:pointer-events-none disabled:border-border-disabled disabled:bg-bg-disabled"
					/>
				))}
			</SliderPrimitive.Control>
		</SliderPrimitive.Root>
	);
}

export { Slider };
