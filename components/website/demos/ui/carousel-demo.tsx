"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

export default function CarouselDemo() {
	return (
		<Carousel className="w-48">
			<CarouselContent>
				{[1, 2, 3].map((i) => (
					<CarouselItem key={i}>
						<div className="flex h-24 items-center justify-center rounded-md border bg-muted text-xl font-semibold">
							{i}
						</div>
					</CarouselItem>
				))}
			</CarouselContent>
			<CarouselPrevious />
			<CarouselNext />
		</Carousel>
	);
}

export function CarouselDemoBasic() {
	return (
		<Carousel className="mx-auto max-w-xs sm:max-w-sm">
			<CarouselContent>
				{Array.from({ length: 5 }).map((_, index) => (
					<CarouselItem key={index}>
						<div className="p-1">
							<Card>
								<CardContent className="flex aspect-square items-center justify-center p-6">
									<span className="text-4xl font-semibold">{index + 1}</span>
								</CardContent>
							</Card>
						</div>
					</CarouselItem>
				))}
			</CarouselContent>
			<CarouselPrevious className="hidden sm:inline-flex" />
			<CarouselNext className="hidden sm:inline-flex" />
		</Carousel>
	);
}

export function CarouselDemoDefault() {
	return (
		<Carousel className="w-full max-w-xs">
			<CarouselContent>
				{Array.from({ length: 5 }).map((_, index) => (
					<CarouselItem key={index}>
						<div className="flex aspect-square items-center justify-center rounded-lg border bg-muted p-6">
							<span className="text-3xl font-semibold">{index + 1}</span>
						</div>
					</CarouselItem>
				))}
			</CarouselContent>
			<CarouselPrevious />
			<CarouselNext />
		</Carousel>
	);
}

export function CarouselDemoMultiple() {
	return (
		<Carousel
			className="mx-auto max-w-xs sm:max-w-sm"
			opts={{
				align: "start",
			}}
		>
			<CarouselContent>
				{Array.from({ length: 5 }).map((_, index) => (
					<CarouselItem key={index} className="sm:basis-1/2 lg:basis-1/3">
						<div className="p-1">
							<Card>
								<CardContent className="flex aspect-square items-center justify-center p-6">
									<span className="text-3xl font-semibold">{index + 1}</span>
								</CardContent>
							</Card>
						</div>
					</CarouselItem>
				))}
			</CarouselContent>
			<CarouselPrevious className="hidden sm:inline-flex" />
			<CarouselNext className="hidden sm:inline-flex" />
		</Carousel>
	);
}

export function CarouselDemoSizes() {
	return (
		<Carousel className="w-full max-w-sm">
			<CarouselContent className="-ml-2">
				{Array.from({ length: 8 }).map((_, index) => (
					<CarouselItem key={index} className="basis-1/3 pl-2">
						<div className="flex aspect-square items-center justify-center rounded-lg border bg-muted">
							<span className="text-xl font-semibold">{index + 1}</span>
						</div>
					</CarouselItem>
				))}
			</CarouselContent>
			<CarouselPrevious />
			<CarouselNext />
		</Carousel>
	);
}

export function CarouselDemoVertical() {
	return (
		<Carousel orientation="vertical" className="w-full max-w-xs">
			<CarouselContent className="-mt-2 h-[200px]">
				{Array.from({ length: 5 }).map((_, index) => (
					<CarouselItem key={index} className="basis-1/2 pt-2">
						<div className="flex items-center justify-center rounded-lg border bg-muted p-6">
							<span className="text-xl font-semibold">{index + 1}</span>
						</div>
					</CarouselItem>
				))}
			</CarouselContent>
			<CarouselPrevious />
			<CarouselNext />
		</Carousel>
	);
}

export function CarouselDemoWithGap() {
	return (
		<Carousel className="mx-auto max-w-xs sm:max-w-sm">
			<CarouselContent className="-ml-1">
				{Array.from({ length: 5 }).map((_, index) => (
					<CarouselItem key={index} className="pl-1 md:basis-1/2">
						<div className="p-1">
							<Card>
								<CardContent className="flex aspect-square items-center justify-center p-6">
									<span className="text-2xl font-semibold">{index + 1}</span>
								</CardContent>
							</Card>
						</div>
					</CarouselItem>
				))}
			</CarouselContent>
			<CarouselPrevious className="hidden sm:inline-flex" />
			<CarouselNext className="hidden sm:inline-flex" />
		</Carousel>
	);
}
