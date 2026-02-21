"use client";

import { AnimatedRovo } from "@/components/ui-ai/animated-rovo";

export default function AnimatedRovoDemo() {
  return (
    <div className="flex h-[350px] w-full flex-col items-center justify-center gap-12 rounded-lg border border-border-bold bg-surface p-12">
      <div className="flex w-full items-center justify-center gap-16">
        <AnimatedRovo size={48} />
        <AnimatedRovo size={64} />
        <AnimatedRovo size={128} />
      </div>
      <p className="text-sm text-text-subtle">
        Watch it float, bounce, dance, and occasionally spin!
      </p>
    </div>
  );
}
