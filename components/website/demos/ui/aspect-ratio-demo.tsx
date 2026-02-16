import Image from "next/image";
import { AspectRatio } from "@/components/ui/aspect-ratio";

export default function AspectRatioDemo() {
	return (
		<div className="w-40">
			<AspectRatio ratio={16 / 9}>
				<div className="flex size-full items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
					16:9
				</div>
			</AspectRatio>
		</div>
	);
}

export function AspectRatioDemo16x9() {
	return (
		<AspectRatio ratio={16 / 9} className="bg-muted rounded-lg">
			<Image
				src="https://avatar.vercel.sh/shadcn1"
				alt="Photo"
				fill
				className="h-full w-full rounded-lg object-cover grayscale dark:brightness-20"
			/>
		</AspectRatio>
	);
}

export function AspectRatioDemo1x1() {
	return (
		<AspectRatio ratio={1 / 1} className="bg-muted rounded-lg">
			<Image
				src="https://avatar.vercel.sh/shadcn1"
				alt="Photo"
				fill
				className="h-full w-full rounded-lg object-cover grayscale dark:brightness-20"
			/>
		</AspectRatio>
	);
}

export function AspectRatioDemo21x9() {
	return (
		<AspectRatio ratio={21 / 9} className="bg-muted rounded-lg">
			<Image
				src="https://avatar.vercel.sh/shadcn1"
				alt="Photo"
				fill
				className="h-full w-full rounded-lg object-cover grayscale dark:brightness-20"
			/>
		</AspectRatio>
	);
}

export function AspectRatioDemo9x16() {
	return (
		<AspectRatio ratio={9 / 16} className="bg-muted rounded-lg">
			<Image
				src="https://avatar.vercel.sh/shadcn1"
				alt="Photo"
				fill
				className="h-full w-full rounded-lg object-cover grayscale dark:brightness-20"
			/>
		</AspectRatio>
	);
}

export function AspectRatioDemoDefault() {
	return (
		<div className="w-64">
			<AspectRatio ratio={16 / 9}>
				<div className="flex h-full w-full items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
					16:9
				</div>
			</AspectRatio>
		</div>
	);
}

export function AspectRatioDemoSquare() {
	return (
		<div className="w-48">
			<AspectRatio ratio={1}>
				<div className="flex h-full w-full items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
					1:1
				</div>
			</AspectRatio>
		</div>
	);
}
