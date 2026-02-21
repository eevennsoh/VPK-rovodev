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

  // States for the inner spinning motion (continuous + occasional rapid spin)
  const [spinAnimation, setSpinAnimation] = useState({
    rotate: 0,
    transition: { duration: 3.5, ease: "linear" as const },
  });

  // Generate either slow continuous rotation or rapid spins
  const generateSpin = (currentRotation: number) => {
    const isRapidSpin = Math.random() > 0.65; // Increased to 35% chance to do a rapid spin

    let nextRotation;
    let duration;
    let ease;

    if (isRapidSpin) {
      // Rapid spin 360 degrees forward (clockwise strictly)
      nextRotation = currentRotation + 360;
      duration = 0.5 + Math.random() * 0.5; // Quick! 0.5s to 1.0s
      ease = "easeInOut" as const;
    } else {
      // Normal slow continuous forward rotation (clockwise strictly)
      nextRotation = currentRotation + (90 + Math.random() * 90); // 90 to 180 degrees further
      duration = 1.0 + Math.random() * 1.5; // Made slower spins faster: 1.0s to 2.5s
      ease = "linear" as const;
    }

    return {
      rotate: nextRotation,
      transition: { duration, ease },
    };
  };

  useEffect(() => {
    setMounted(true);
    setSpinAnimation(generateSpin(0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        // Predictable harmonic pendulum swing from side to side
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
        animate={mounted ? spinAnimation : { rotate: 0 }}
        onAnimationComplete={(definition) => {
          if (mounted && typeof definition.rotate === "number") {
            setSpinAnimation(generateSpin(definition.rotate));
          }
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
