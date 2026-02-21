"use client";

import { motion } from "motion/react";
import Image from "next/image";

interface AnimatedRovoProps {
  size?: number;
  className?: string;
}

export function AnimatedRovo({ size = 32, className }: AnimatedRovoProps) {
  // We simulate a pendulum or elastic string by setting a transform origin
  // strictly above the logo. This acts as the attachment point of the imaginary string.
  return (
    <motion.div
      className={className}
      style={{
        width: size,
        height: size,
        transformOrigin: "50% -50%", // Anchor point is half-height above the logo
      }}
      animate={{
        // Smooth pendulum swing from side to side
        rotate: [15, -15, 15],
        // Elastic bounce down on the "string" exactly when crossing the center
        y: [0, 12, 0, 12, 0],
      }}
      transition={{
        duration: 2,
        ease: "easeInOut", // Smooth harmonic pendulum motion
        repeat: Infinity,
      }}
    >
      <motion.div
        animate={{
          rotate: 360,
        }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration: 3.5, // Constant smooth rotation while it swings and bounces
        }}
        style={{ width: "100%", height: "100%" }}
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
    </motion.div>
  );
}
