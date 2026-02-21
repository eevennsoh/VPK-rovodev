"use client";

import type { MotionProps, Transition } from "motion/react";
import type { CSSProperties, ElementType, JSX } from "react";

import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "motion/react";
import { memo, useMemo } from "react";

type MotionHTMLProps = MotionProps & Record<string, unknown>;

// Cache motion components at module level to avoid creating during render
const motionComponentCache = new Map<
  keyof JSX.IntrinsicElements,
  React.ComponentType<MotionHTMLProps>
>();

const getMotionComponent = (element: keyof JSX.IntrinsicElements) => {
  let component = motionComponentCache.get(element);
  if (!component) {
    component = motion.create(element);
    motionComponentCache.set(element, component);
  }
  return component;
};

const WAVE_REPEAT_DELAY_FACTOR = 0.05;
const DEFAULT_SHIMMER_DURATION = 2;
const DEFAULT_SHIMMER_SPREAD = 2;
const DEFAULT_WAVE_DURATION = 1;
const DEFAULT_WAVE_SPREAD = 1;
const DEFAULT_WAVE_Z_DISTANCE = 10;
const DEFAULT_WAVE_X_DISTANCE = 2;
const DEFAULT_WAVE_Y_DISTANCE = -2;
const DEFAULT_WAVE_SCALE_DISTANCE = 1.1;
const DEFAULT_WAVE_ROTATE_Y_DISTANCE = 10;
const DEFAULT_WAVE_HIGHLIGHT_OPACITY = 0.88;
const MAX_RGB_CHANNEL = 255;
const HEX_SHORT_LENGTH = 4;
const HEX_LONG_LENGTH = 7;

type RGBColor = {
	r: number;
	g: number;
	b: number;
};

function parseHexColor(color: string): RGBColor | null {
	if (color.length === HEX_SHORT_LENGTH) {
		const r = parseInt(color[1] + color[1], 16);
		const g = parseInt(color[2] + color[2], 16);
		const b = parseInt(color[3] + color[3], 16);
		if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
			return null;
		}
		return { r, g, b };
	}
	if (color.length === HEX_LONG_LENGTH) {
		const r = parseInt(color.slice(1, 3), 16);
		const g = parseInt(color.slice(3, 5), 16);
		const b = parseInt(color.slice(5, 7), 16);
		if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
			return null;
		}
		return { r, g, b };
	}
	return null;
}

function parseRgbColor(color: string): RGBColor | null {
	const rgbMatch = color
		.trim()
		.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*[\d.]+\s*)?\)$/i);
	if (!rgbMatch) {
		return null;
	}
	const r = Number.parseFloat(rgbMatch[1]);
	const g = Number.parseFloat(rgbMatch[2]);
	const b = Number.parseFloat(rgbMatch[3]);
	if (
		Number.isNaN(r) ||
		Number.isNaN(g) ||
		Number.isNaN(b)
	) {
		return null;
	}
	return {
		r: Math.max(0, Math.min(255, Math.round(r))),
		g: Math.max(0, Math.min(255, Math.round(g))),
		b: Math.max(0, Math.min(255, Math.round(b))),
	};
}

function parseColor(color: string): RGBColor | null {
	if (color.startsWith("#")) {
		return parseHexColor(color);
	}
	if (color.trim().toLowerCase().startsWith("rgb")) {
		return parseRgbColor(color);
	}
	return null;
}

function smoothStep(value: number): number {
	const clamped = Math.max(0, Math.min(1, value));
	return clamped * clamped * (3 - 2 * clamped);
}

function srgbChannelToLinear(channel: number): number {
	const normalized = channel / MAX_RGB_CHANNEL;
	if (normalized <= 0.04045) {
		return normalized / 12.92;
	}
	return Math.pow((normalized + 0.055) / 1.055, 2.4);
}

function linearChannelToSrgb(channel: number): number {
	const normalized =
		channel <= 0.0031308
			? channel * 12.92
			: 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
	return Math.max(0, Math.min(1, normalized)) * MAX_RGB_CHANNEL;
}

function mixColors(left: RGBColor, right: RGBColor, ratio: number): string {
	const easedRatio = smoothStep(ratio);
	const leftLinear = {
		r: srgbChannelToLinear(left.r),
		g: srgbChannelToLinear(left.g),
		b: srgbChannelToLinear(left.b),
	};
	const rightLinear = {
		r: srgbChannelToLinear(right.r),
		g: srgbChannelToLinear(right.g),
		b: srgbChannelToLinear(right.b),
	};
	const mixedLinear = {
		r: leftLinear.r + (rightLinear.r - leftLinear.r) * easedRatio,
		g: leftLinear.g + (rightLinear.g - leftLinear.g) * easedRatio,
		b: leftLinear.b + (rightLinear.b - leftLinear.b) * easedRatio,
	};
	const r = Math.round(linearChannelToSrgb(mixedLinear.r));
	const g = Math.round(linearChannelToSrgb(mixedLinear.g));
	const b = Math.round(linearChannelToSrgb(mixedLinear.b));
	return `rgb(${r}, ${g}, ${b})`;
}

export interface TextShimmerProps {
	children: string;
	as?: ElementType;
	className?: string;
	duration?: number;
	spread?: number;
	wave?: boolean;
	zDistance?: number;
	xDistance?: number;
	yDistance?: number;
	scaleDistance?: number;
	rotateYDistance?: number;
	transition?: Transition;
	baseColor?: string;
	baseGradientColor?: string | readonly string[];
}

function resolveWaveHighlightColor(
	baseGradientColor: string | readonly string[] | undefined,
	index: number,
	totalCharacters: number
): string {
	if (Array.isArray(baseGradientColor) && baseGradientColor.length > 0) {
		if (baseGradientColor.length === 1) {
			return baseGradientColor[0];
		}
		const ratio =
			totalCharacters <= 1 ? 0 : index / Math.max(totalCharacters - 1, 1);
		const scaledPosition = ratio * (baseGradientColor.length - 1);
		const leftIndex = Math.floor(scaledPosition);
		const rightIndex = Math.min(leftIndex + 1, baseGradientColor.length - 1);
		const mixRatio = scaledPosition - leftIndex;
		const leftColor = baseGradientColor[leftIndex];
		const rightColor = baseGradientColor[rightIndex];
		if (leftIndex === rightIndex || mixRatio <= 0) {
			return leftColor;
		}
		if (mixRatio >= 1) {
			return rightColor;
		}
		const parsedLeft = parseColor(leftColor);
		const parsedRight = parseColor(rightColor);
		if (parsedLeft && parsedRight) {
			return mixColors(parsedLeft, parsedRight, mixRatio);
		}
		return mixRatio < 0.5 ? leftColor : rightColor;
	}

	if (typeof baseGradientColor === "string" && baseGradientColor.length > 0) {
		return baseGradientColor;
	}

	return "var(--color-background)";
}

const ShimmerComponent = ({
	children,
	as: Component = "p",
	className,
	duration,
	spread,
	wave = false,
	zDistance = DEFAULT_WAVE_Z_DISTANCE,
	xDistance = DEFAULT_WAVE_X_DISTANCE,
	yDistance = DEFAULT_WAVE_Y_DISTANCE,
	scaleDistance = DEFAULT_WAVE_SCALE_DISTANCE,
	rotateYDistance = DEFAULT_WAVE_ROTATE_Y_DISTANCE,
	transition,
	baseColor,
	baseGradientColor,
}: TextShimmerProps) => {
	const MotionComponent = getMotionComponent(
		Component as keyof JSX.IntrinsicElements
	);
	const shouldReduceMotion = useReducedMotion();
	const isWaveEnabled = wave && !shouldReduceMotion && children.length > 0;
	const resolvedDuration =
		duration ?? (isWaveEnabled ? DEFAULT_WAVE_DURATION : DEFAULT_SHIMMER_DURATION);
	const resolvedSpread =
		spread ?? (isWaveEnabled ? DEFAULT_WAVE_SPREAD : DEFAULT_SHIMMER_SPREAD);
	const dynamicSpread = useMemo(
		() => (children?.length ?? 0) * resolvedSpread,
		[children, resolvedSpread]
	);
	const characters = useMemo(
		() => (isWaveEnabled ? children.split("") : []),
		[children, isWaveEnabled]
	);
	const repeatDelay = useMemo(
		() =>
			(characters.length * WAVE_REPEAT_DELAY_FACTOR) /
			Math.max(resolvedSpread, 1),
		[characters.length, resolvedSpread]
	);
	const resolvedBaseColor = baseColor ?? "var(--color-muted-foreground)";
	const resolvedBaseGradientColor = useMemo(
		() =>
			characters.map((_, index) =>
				resolveWaveHighlightColor(baseGradientColor, index, characters.length)
			),
		[baseGradientColor, characters]
	);

	if (isWaveEnabled) {
		return (
			<MotionComponent
				className={cn(
					"relative inline-block overflow-visible [perspective:500px]",
					className,
					"overflow-visible"
				)}
				style={
					{
						"--base-color": resolvedBaseColor,
						"--base-gradient-color": resolveWaveHighlightColor(
							baseGradientColor,
							0,
							Math.max(characters.length, 1)
						),
					} as CSSProperties
				}
			>
				<span className="inline-flex items-baseline whitespace-pre">
					{characters.map((character, index) => {
						const delay =
							(index * resolvedDuration * (1 / Math.max(resolvedSpread, 1))) /
							Math.max(characters.length, 1);
						const renderedCharacter = character === " " ? "\u00A0" : character;
						if (character === " ") {
							return (
								<span
									key={`${character}-${index}`}
									className="inline-block whitespace-pre [color:var(--base-color)]"
								>
									{renderedCharacter}
								</span>
							);
						}
						const waveTransition = {
							delay,
							duration: resolvedDuration,
							ease: "easeInOut",
							repeat: Number.POSITIVE_INFINITY,
							repeatDelay,
							...transition,
						} satisfies Transition;

							return (
								<motion.span
									key={`${character}-${index}`}
									animate={{
										rotateY: [0, rotateYDistance, 0],
										scale: [1, scaleDistance, 1],
										translateX: [0, xDistance, 0],
										translateY: [0, yDistance, 0],
										translateZ: [0, zDistance, 0],
									}}
									className="relative inline-block whitespace-pre transform-gpu [backface-visibility:hidden] [transform-origin:50%_100%] [transform-style:preserve-3d] [will-change:transform]"
								initial={{
									rotateY: 0,
									scale: 1,
									translateX: 0,
									translateY: 0,
									translateZ: 0,
								}}
								transition={waveTransition}
							>
								<span className="[color:var(--base-color)]">
									{renderedCharacter}
								</span>
								<motion.span
									aria-hidden="true"
									animate={{ opacity: [0, DEFAULT_WAVE_HIGHLIGHT_OPACITY, 0] }}
									className="pointer-events-none absolute inset-0 whitespace-pre"
									initial={{
										opacity: 0,
									}}
									style={{
										color:
											resolvedBaseGradientColor[index] ??
											"var(--base-gradient-color)",
									}}
									transition={waveTransition}
								>
									{renderedCharacter}
								</motion.span>
							</motion.span>
						);
					})}
				</span>
			</MotionComponent>
		);
	}

	return (
		<MotionComponent
			animate={{ backgroundPosition: "0% center" }}
			className={cn(
				"relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent",
				"[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--color-background),#0000_calc(50%+var(--spread)))] [background-repeat:no-repeat,padding-box]",
				className
			)}
			initial={{ backgroundPosition: "100% center" }}
			style={
				{
					"--spread": `${dynamicSpread}px`,
					backgroundImage:
						"var(--bg), linear-gradient(var(--color-muted-foreground), var(--color-muted-foreground))",
				} as CSSProperties
			}
			transition={{
				duration: resolvedDuration,
				ease: "linear",
				repeat: Number.POSITIVE_INFINITY,
			}}
		>
			{children}
		</MotionComponent>
	);
};

export const Shimmer = memo(ShimmerComponent);
