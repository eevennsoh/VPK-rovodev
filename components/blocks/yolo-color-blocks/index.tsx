import { cn } from "@/lib/utils";

interface YoloColorBlocksProps extends React.ComponentProps<"div"> {
	/**
	 * Layout variant: grid (responsive, recommended) or absolute (original design)
	 */
	variant?: "grid" | "absolute";
	/**
	 * Size of individual color blocks
	 */
	blockSize?: "sm" | "md" | "lg";
}

const blockSizeMap = {
	sm: { width: "w-16", height: "h-12" },
	md: { width: "w-32", height: "h-16" },
	lg: { width: "w-48", height: "h-24" },
};

const colorBlocks = [
	{
		id: "block-1",
		name: "Red",
		color: "bg-[#a93d3d]",
		className: "col-start-1 row-start-1",
	},
	{
		id: "block-2",
		name: "Purple",
		color: "bg-[#513da9]",
		className: "col-start-3 row-start-1",
	},
	{
		id: "block-3",
		name: "Green",
		color: "bg-[#4ea93d]",
		className: "col-start-2 row-start-2",
	},
];

export function YoloColorBlocks({
	variant = "grid",
	blockSize = "md",
	className,
	...props
}: YoloColorBlocksProps) {
	const { width, height } = blockSizeMap[blockSize];

	if (variant === "absolute") {
		// Original design: absolute positioning
		return (
			<div
				className={cn(
					"relative size-full bg-white",
					"[min-width:501px] [min-height:286px]",
					className
				)}
				data-name="YOLO COLOR BLOCKS"
				{...props}
			>
				{colorBlocks.map((block) => (
					<div
						key={block.id}
						className={cn(
							"absolute",
							block.color,
							"h-[71px] w-[122px]",
							block.id === "block-1" && "left-[90px] top-[80px]",
							block.id === "block-2" && "left-[300px] top-[80px]",
							block.id === "block-3" && "left-[190px] top-[183px]"
						)}
						data-node-id={block.id}
					/>
				))}
			</div>
		);
	}

	// Grid variant: responsive, modern layout
	return (
		<div
			className={cn(
				"grid grid-cols-3 gap-4 p-6",
				"bg-surface rounded-lg",
				className
			)}
			data-name="YOLO COLOR BLOCKS - Grid"
			{...props}
		>
			{colorBlocks.map((block) => (
				<div
					key={block.id}
					className={cn(width, height, block.color, block.className, "rounded")}
					data-node-id={block.id}
					title={block.name}
				/>
			))}
		</div>
	);
}

export default YoloColorBlocks;
