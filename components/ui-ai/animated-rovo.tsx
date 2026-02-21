"use client";

import { motion } from "motion/react";
import Image from "next/image";

interface AnimatedRovoProps {
  size?: number;
  className?: string;
}

export function AnimatedRovo({ size = 32, className }: AnimatedRovoProps) {
  // Define a complex keyframe animation that combines floating, bouncing, dancing, and spinning
  // The entire sequence loops infinitely
  return (
    <motion.div
      className={className}
      style={{ width: size, height: size }}
      animate={{
        // Define an array of values for each property to create a sequence
        y: [0, -10, 0, -5, 0, -8, 0], // Float up and down, subtle bounce
        x: [0, -3, 3, -2, 2, 0, 0], // Subtle side-to-side dance
        rotate: [0, -5, 5, -5, 5, 0, 360], // Occasional spin at the end of the loop
        scale: [1, 1.05, 0.95, 1.02, 0.98, 1.05, 1], // Squish and stretch for bounce effect
      }}
      transition={{
        duration: 8, // Total duration for one full loop
        ease: "easeInOut",
        times: [0, 0.2, 0.4, 0.6, 0.8, 0.9, 1], // Timing for each keyframe
        repeat: Infinity,
        repeatType: "loop",
      }}
    >
      <Image
        src="/1p/rovo.svg"
        alt="Rovo"
        width={size}
        height={size}
        className="dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] drop-shadow-[0_0_8px_rgba(0,0,0,0.1)]"
        priority
      />
    </motion.div>
  );
}
