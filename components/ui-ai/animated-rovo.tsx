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

  // States for the pendulum/string outer motion
  const [swingAnimation, setSwingAnimation] = useState({
    rotate: 0,
    y: 0,
    transition: { type: "spring", duration: 0 },
  });

  // States for the inner spinning motion (continuous + occasional rapid spin)
  const [spinAnimation, setSpinAnimation] = useState({
    rotate: 0,
    transition: { duration: 3.5, ease: "linear" as const },
  });

  // Randomize the string sway/bounce
  const generateSwing = () => {
    // Randomize the peak angle (how far it swings to the sides) between 10 and 25 degrees
    const swingAngle = 10 + Math.random() * 15;
    
    // Randomize direction to avoid predictable left-right-left
    const currentAngle = Math.random() > 0.5 ? swingAngle : -swingAngle;
    
    // Vary the elastic string bounce (downwards drop) between 5px and 18px
    const bounceY = 5 + Math.random() * 13;

    return {
      rotate: currentAngle,
      y: bounceY,
      transition: {
        type: "spring",
        stiffness: 80 + Math.random() * 40, // 80-120 Make it snap or float
        damping: 15 + Math.random() * 5,    // 15-20 Ensure it doesn't wobble infinitely
        mass: 0.8 + Math.random() * 0.4,
      },
    };
  };

  // Generate either slow continuous rotation or rapid spins
  const generateSpin = (currentRotation: number) => {
    const isRapidSpin = Math.random() > 0.85; // 15% chance to do a rapid spin

    let nextRotation;
    let duration;
    let ease;

    if (isRapidSpin) {
      // Rapid spin 360 degrees forward or backward
      const spinDirection = Math.random() > 0.5 ? 360 : -360;
      nextRotation = currentRotation + spinDirection;
      duration = 0.5 + Math.random() * 0.5; // Quick! 0.5s to 1.0s
      ease = "easeInOut" as const;
    } else {
      // Normal slow continuous forward rotation
      nextRotation = currentRotation + (90 + Math.random() * 90); // 90 to 180 degrees further
      duration = 2 + Math.random() * 1.5; // Slow: 2s to 3.5s
      ease = "linear" as const;
    }

    return {
      rotate: nextRotation,
      transition: { duration, ease },
    };
  };

  useEffect(() => {
    setMounted(true);
    setSwingAnimation(generateSwing());
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
      animate={mounted ? swingAnimation : { rotate: 0, y: 0 }}
      onAnimationComplete={() => {
        if (mounted) {
          setSwingAnimation(generateSwing());
        }
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
