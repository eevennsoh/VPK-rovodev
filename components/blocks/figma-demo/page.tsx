/**
 * Figma Design Implementation
 * 
 * Original Figma node: 277-3811
 * Converted from absolute positioning to responsive flex layout
 * Uses ADS color tokens instead of hardcoded hex values
 */

export default function FigmaDemo() {
	return (
		<div className="bg-surface relative flex min-h-[286px] w-full max-w-[501px] items-center justify-center p-8">
			{/* Top Row - Red and Purple rectangles */}
			<div className="flex gap-16">
				<div className="h-[71px] w-[122px] bg-red-700" />
				<div className="h-[71px] w-[122px] bg-purple-700" />
			</div>

			{/* Bottom - Green rectangle centered */}
			<div className="absolute bottom-8 left-1/2 h-[71px] w-[122px] -translate-x-1/2 bg-green-500" />
		</div>
	);
}
