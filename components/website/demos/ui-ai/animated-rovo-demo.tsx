"use client";

import { AnimatedRovo } from "@/components/ui-ai/animated-rovo";

export default function AnimatedRovoDemo() {
  return (
    <div className="flex h-[350px] w-full flex-col items-center justify-center gap-12 rounded-lg bg-surface p-12">
      <div className="flex w-full items-center justify-center gap-16">
        <AnimatedRovo.Root size={16} />
        <AnimatedRovo.Root size={24} />
        <AnimatedRovo.Root size={48} />
        <AnimatedRovo.Root size={64} />
        <AnimatedRovo.Root size={128} />
      </div>
    </div>
  );
}
