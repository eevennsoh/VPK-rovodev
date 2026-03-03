import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { Category } from "@/components/blocks/make-gallery/data/gallery-items";
import { getFramesForId } from "./ascii-frames";

interface AnimatedAsciiProps {
	id: string;
	animationId?: string;
	type: Category;
	ascii: string;
	color: string;
}

export function AnimatedAscii({ id, animationId, type, ascii, color }: AnimatedAsciiProps) {
	const effectiveId = animationId ?? id;
	const customFrames = getFramesForId(effectiveId);
	const [animatedAscii, setAnimatedAscii] = useState(customFrames ? customFrames[0] : ascii);

	useEffect(() => {
		let intervalId: NodeJS.Timeout;

		if (customFrames) {
			let frame = 0;
			intervalId = setInterval(() => {
				frame = (frame + 1) % customFrames.length;
				setAnimatedAscii(customFrames[frame]);
			}, 1000);
		} else if (effectiveId === "sprint-board") {
			let step = 0;
			intervalId = setInterval(() => {
				step = (step + 1) % 4;
				let next = ascii;
				if (step === 1) {
					next = next.replace("24 pts", "25 pts").replace("75% done", "79% done");
				} else if (step === 2) {
					next = next.replace("24 pts", "26 pts").replace("75% done", "83% done");
				} else if (step === 3) {
					next = next.replace("24 pts", "28 pts").replace("75% done", "92% done");
				}
				setAnimatedAscii(next);
			}, 2000);
		} else if (effectiveId === "time-tracker") {
			let seconds = 18;
			let minutes = 34;
			let hours = 2;
			intervalId = setInterval(() => {
				seconds++;
				if (seconds >= 60) {
					seconds = 0;
					minutes++;
					if (minutes >= 60) {
						minutes = 0;
						hours++;
					}
				}
				const formattedTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
				setAnimatedAscii((prev) => prev.replace(/\d{2}:\d{2}:\d{2}/, formattedTime));
			}, 1000);
		} else if (effectiveId === "onboarding-buddy") {
			let step = 0;
			intervalId = setInterval(() => {
				step++;
				setAnimatedAscii((prev) => {
					let next = prev;
					if (step === 1) {
						next = next.replace(/\[ \] Meet your buddy/, "[x] Meet your buddy");
					} else if (step === 2) {
						next = next.replace(/\[ \] First PR walkthrough/, "[x] First PR walkthrough");
					} else if (step === 3) {
						next = next.replace(/\[x\] Meet your buddy/, "[ ] Meet your buddy");
						next = next.replace(/\[x\] First PR walkthrough/, "[ ] First PR walkthrough");
						step = 0;
					}
					return next;
				});
			}, 2000);
		} else if (effectiveId === "asset-registry") {
			let active = false;
			intervalId = setInterval(() => {
				active = !active;
				setAnimatedAscii((prev) => {
					let next = prev;
					if (active) {
						next = next.replace(/A-003  Keyboard   o Spare/, "A-003  Keyboard   * Active");
						next = next.replace(/Total: 142   Active: 128/, "Total: 142   Active: 129");
						next = next.replace(/Spare: 9     Repair: 5/, "Spare: 8     Repair: 5");
					} else {
						next = next.replace(/A-003  Keyboard   \* Active/, "A-003  Keyboard   o Spare");
						next = next.replace(/Total: 142   Active: 129/, "Total: 142   Active: 128");
						next = next.replace(/Spare: 8     Repair: 5/, "Spare: 9     Repair: 5");
					}
					return next;
				});
			}, 3000);
		}

		return () => {
			if (intervalId) clearInterval(intervalId);
		};
	}, [effectiveId, ascii, customFrames]);

	const lineCount = ascii.split("\n").length;
	const isTall = lineCount > 14;

	if (type === "automation" || isTall) {
		return (
			<div className="relative h-full w-full overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]">
				<motion.div
					animate={{ y: ["0%", "-50%"] }}
					transition={{
						duration: 20,
						ease: "linear",
						repeat: Number.POSITIVE_INFINITY,
					}}
					className="absolute inset-x-0 flex flex-col items-center pt-4"
				>
					<pre className={cn("whitespace-pre font-mono text-[11px] leading-4 transition-colors", color)}>
						{animatedAscii}
					</pre>
					<pre className={cn("mt-8 whitespace-pre font-mono text-[11px] leading-4 transition-colors", color)}>
						{animatedAscii}
					</pre>
					<pre className={cn("mt-8 whitespace-pre font-mono text-[11px] leading-4 transition-colors", color)}>
						{animatedAscii}
					</pre>
					<pre className={cn("mt-8 whitespace-pre font-mono text-[11px] leading-4 transition-colors", color)}>
						{animatedAscii}
					</pre>
				</motion.div>
			</div>
		);
	}

	return (
		<pre className={cn("whitespace-pre font-mono text-[11px] leading-4 transition-colors", color)}>
			{animatedAscii}
		</pre>
	);
}
