"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { useEffect, useState } from "react";

interface AnimatedRovoProps {
  size?: number;
  className?: string;
}

export function AnimatedRovo({ size = 32, className }: AnimatedRovoProps) {
  const [mounted, setMounted] = useState(false);

  // Predictable starting state for SSR to avoid hydration mismatch
  const [animation, setAnimation] = useState({
    x: 0,
    y: 0,
    scale: 1,
    transition: { duration: 0 },
  });

  const generateRandomMovement = () => {
    return {
      x: (Math.random() - 0.5) * 50, // Random x offset up to +/- 25px
      y: (Math.random() - 0.5) * 50, // Random y offset up to +/- 25px
      scale: 0.85 + Math.random() * 0.3, // Random scale between 0.85 and 1.15
      transition: {
        type: "spring",
        stiffness: 80 + Math.random() * 80, // Random stiffness (80-160)
        damping: 10 + Math.random() * 10,   // Moderate damping (10-20)
        mass: 0.8 + Math.random() * 0.4,    // Small mass changes
        restDelta: 0.001,
      },
    };
  };

  useEffect(() => {
    setMounted(true);
    setAnimation(generateRandomMovement());
  }, []);

  return (
    <motion.div
      className={className}
      style={{ width: size, height: size }}
      // Use the random animation state only after hydration
      animate={mounted ? animation : { x: 0, y: 0, scale: 1 }}
      onAnimationComplete={() => {
        if (mounted) {
          setAnimation(generateRandomMovement());
        }
      }}
    >
      <motion.div
        animate={{
          rotate: 360,
        }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration: 3, // Constant slow rotation
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
