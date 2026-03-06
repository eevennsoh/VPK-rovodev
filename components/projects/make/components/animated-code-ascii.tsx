"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const ASCII_ART = [
	"                //         ", // R0
	"    //         //    \\\\    ", // R1
	"  //          //       \\\\  ", // R2
	"//           //          \\\\", // R3
	"\\\\          //           //", // R4
	"  \\\\       //          //  ", // R5
	"    \\\\    //         //    ", // R6
	"         //                ", // R7
];

const GLITCH_CHARS = "x+v-~=>*^:.°#";

export function AnimatedCodeAscii() {
	// Render the grid character by character to allow individual styling
	return (
		<div
			className="relative flex h-[120px] items-center justify-center bg-transparent font-mono text-[14px] font-bold leading-none select-none"
			aria-hidden="true"
		>
			<div className="flex flex-col items-center">
				{ASCII_ART.map((line, r) => (
					<div key={r} className="flex">
						{line.split("").map((char, c) => {
							const isSpace = char === " ";
							
							let colorClass = "text-text-subtlest/60 dark:text-text-subtlest/60 font-normal";
							let isSymbol = !isSpace;
							let delayC = c;
							
							if (isSymbol) {
								if (c <= 5) {
									colorClass = "text-[#AF59E1]";
								} else if (c >= 9 && c <= 17) {
									colorClass = "text-[#6A9A23]";
								} else if (c >= 21) {
									colorClass = "text-[#FCA700] dark:text-[#E56E00]";
									delayC = 26 - c; // Mirror the animation delay for symmetrical effect
								} else {
									isSymbol = false;
								}
							}

							return (
								<motion.span
									key={`${r}-${c}`}
									initial={isSymbol ? { opacity: 0, scale: 0.5 } : { opacity: 0 }}
									animate={
										isSymbol
											? { opacity: [0.4, 1, 0.4], scale: 1 }
											: { opacity: [0.3, 0.6, 0.3] }
									}
									transition={
										isSymbol
											? {
													duration: 2,
													repeat: Infinity,
													ease: "easeInOut",
													delay: (r + delayC) * 0.05,
												}
											: {
													duration: 3 + Math.random() * 2,
													repeat: Infinity,
													ease: "easeInOut",
													delay: Math.random() * 2,
												}
									}
									className={cn("inline-block w-[8px] text-center", colorClass)}
								>
									{isSymbol ? char : <GlitchChar />}
								</motion.span>
							);
						})}
					</div>
				))}
			</div>
		</div>
	);
}

function GlitchChar() {
	const [char, setChar] = useState(".");

	useEffect(() => {
		const changeChar = () => {
			if (Math.random() > 0.7) {
				setChar(GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]);
			}
		};

		// Random initial character
		changeChar();

		const interval = setInterval(changeChar, 200 + Math.random() * 800);
		return () => clearInterval(interval);
	}, []);

	return <span>{char}</span>;
}
