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
        y: [0, -25, 8, -15, 5, -30, 0], // Exaggerated bouncing up and down
        x: [0, -12, 15, -10, 12, -5, 0], // Playful side-to-side zig-zag
        rotate: [0, -15, 20, -12, 25, -10, 360], // Deeper tilts and a quick full spin
        scale: [1, 1.2, 0.8, 1.15, 0.85, 1.25, 1], // Stronger squash and stretch for a bouncy feel
      }}
      transition={{
        duration: 3.5, // Much faster for rapid, energetic movements
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
