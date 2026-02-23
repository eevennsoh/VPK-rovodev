/**
 * Exact Figma Layout Replica
 * 
 * This version preserves the exact pixel positioning from Figma
 * using absolute positioning. For production use, prefer the 
 * responsive flex version in page.tsx
 */

export function FigmaDemoExact() {
	return (
		<div className="relative h-[286px] w-[501px] bg-surface" data-node-id="277:3811">
			<div 
				className="absolute h-[71px] w-[122px] bg-red-700" 
				style={{ left: '90px', top: '80px' }}
				data-node-id="277:3812" 
			/>
			<div 
				className="absolute h-[71px] w-[122px] bg-purple-700" 
				style={{ left: '300px', top: '80px' }}
				data-node-id="277:3813" 
			/>
			<div 
				className="absolute h-[71px] w-[122px] bg-green-500" 
				style={{ left: '190px', top: '183px' }}
				data-node-id="277:3814" 
			/>
		</div>
	);
}
