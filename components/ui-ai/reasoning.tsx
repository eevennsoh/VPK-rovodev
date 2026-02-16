"use client";

import type { ComponentProps, ReactNode } from "react";

import { useControllableState } from "@/hooks/use-controllable-state";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { ChevronDownIcon } from "lucide-react";
import Image from "next/image";
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Streamdown } from "streamdown";

import { Shimmer } from "./shimmer";

interface ReasoningContextValue {
  isStreaming: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  duration: number | undefined;
}

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

export const useReasoning = () => {
  const context = useContext(ReasoningContext);
  if (!context) {
    throw new Error("Reasoning components must be used within Reasoning");
  }
  return context;
};

export type ReasoningProps = ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  duration?: number;
};

const AUTO_CLOSE_DELAY = 1000;
const MS_IN_S = 1000;

export const Reasoning = memo(
  ({
    className,
    isStreaming = false,
    open,
    defaultOpen,
    onOpenChange,
    duration: durationProp,
    children,
    ...props
  }: ReasoningProps) => {
    const resolvedDefaultOpen = defaultOpen ?? isStreaming;
    // Track if defaultOpen was explicitly set to false (to prevent auto-open)
    const isExplicitlyClosed = defaultOpen === false;

    const [isOpen, setIsOpen] = useControllableState<boolean>({
      defaultProp: resolvedDefaultOpen,
      onChange: onOpenChange,
      prop: open,
    });
    const [duration, setDuration] = useControllableState<number | undefined>({
      defaultProp: undefined,
      prop: durationProp,
    });

    const hasEverStreamedRef = useRef(isStreaming);
    const [hasAutoClosed, setHasAutoClosed] = useState(false);
    const startTimeRef = useRef<number | null>(null);
    const hasUserClosedRef = useRef(false);
    const prevStreamingRef = useRef(false);

    // Track when streaming starts and compute duration
    useEffect(() => {
      if (isStreaming && !prevStreamingRef.current) {
        hasUserClosedRef.current = false;
      }
      prevStreamingRef.current = isStreaming;

      if (isStreaming) {
        hasEverStreamedRef.current = true;
        if (startTimeRef.current === null) {
          startTimeRef.current = Date.now();
        }
      } else if (startTimeRef.current !== null) {
        setDuration(Math.ceil((Date.now() - startTimeRef.current) / MS_IN_S));
        startTimeRef.current = null;
      }
    }, [isStreaming, setDuration]);

    // Auto-open when streaming starts (unless explicitly closed)
    useEffect(() => {
      if (isStreaming && !isOpen && !isExplicitlyClosed && !hasUserClosedRef.current) {
        setIsOpen(true);
      }
    }, [isStreaming, isOpen, setIsOpen, isExplicitlyClosed]);

    // Auto-close when streaming ends (once only, and only if it ever streamed)
    useEffect(() => {
      if (
        hasEverStreamedRef.current &&
        !isStreaming &&
        isOpen &&
        !hasAutoClosed
      ) {
        const timer = setTimeout(() => {
          setIsOpen(false);
          setHasAutoClosed(true);
        }, AUTO_CLOSE_DELAY);

        return () => clearTimeout(timer);
      }
    }, [isStreaming, isOpen, setIsOpen, hasAutoClosed]);

    const handleOpenChange = useCallback(
      (newOpen: boolean) => {
        if (!newOpen && isStreaming) {
          hasUserClosedRef.current = true;
        }
        setIsOpen(newOpen);
      },
      [setIsOpen, isStreaming]
    );

    const contextValue = useMemo(
      () => ({ duration, isOpen, isStreaming, setIsOpen }),
      [duration, isOpen, isStreaming, setIsOpen]
    );

    return (
      <ReasoningContext.Provider value={contextValue}>
        <Collapsible
          className={cn("not-prose mb-4", className)}
          onOpenChange={handleOpenChange}
          open={isOpen}
          {...props}
        >
          {children}
        </Collapsible>
      </ReasoningContext.Provider>
    );
  }
);

const DOT_COLORS = ["#1868db", "#bf63f3", "#fca700"] as const;
const COMPLETED_STATUS_PREFIXES = ["used", "completed"] as const;

const isCompletedStatusLabel = (label: ReactNode) => {
	if (typeof label !== "string") {
		return false;
	}
	const normalizedLabel = label.trim().toLowerCase();
	return COMPLETED_STATUS_PREFIXES.some((prefix) =>
		normalizedLabel === prefix || normalizedLabel.startsWith(`${prefix} `)
	);
};

export type ReasoningTriggerProps = ComponentProps<
  typeof CollapsibleTrigger
> & {
  label?: string;
  completedLabel?: (duration?: number) => ReactNode;
};

const defaultReasoningCompletedLabel = (duration?: number) => {
  if (duration === undefined) {
    return "Thought for a few seconds";
  }
  return `Thought for ${duration} seconds`;
};

export const ReasoningTrigger = memo(
  ({
    className,
    children,
    label = "Thinking",
    completedLabel = defaultReasoningCompletedLabel,
    ...props
  }: ReasoningTriggerProps) => {
    const { isStreaming, isOpen, duration } = useReasoning();
    const isComplete = !isStreaming && duration !== undefined && duration > 0;
    const hasCompletedStatusLabel = isCompletedStatusLabel(label);
    const shouldShowCompletedState = isComplete || hasCompletedStatusLabel;
    const completedStateLabel = hasCompletedStatusLabel ? label : completedLabel(duration);

    return (
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground",
          className
        )}
        {...props}
      >
        {children ?? (
          <>
            {shouldShowCompletedState ? (
              <>
                <Image
                  src="/loading/rovo-logo.png"
                  alt=""
                  width={20}
                  height={20}
                />
                <span>{completedStateLabel}</span>
              </>
            ) : (
              <>
                <style
                  dangerouslySetInnerHTML={{
                    __html: `
                      @keyframes dot-reveal {
                        0%, 20% { opacity: 0; }
                        40%, 100% { opacity: 1; }
                      }
                    `,
                  }}
                />
                <Image
                  src="/loading/rovo-logo.gif"
                  alt=""
                  width={20}
                  height={20}
                  unoptimized
                />
                <span className="inline-flex items-baseline">
                  <Shimmer duration={1} as="span">
                    {label}
                  </Shimmer>
                  <span className="inline-flex items-baseline" aria-hidden="true">
                    {DOT_COLORS.map((color, i) => (
                      <span
                        key={i}
                        className="text-sm leading-none"
                        style={{
                          color,
                          animation: "dot-reveal 1.2s ease-in-out infinite",
                          animationDelay: `${i * 0.2}s`,
                        }}
                      >
                        .
                      </span>
                    ))}
                  </span>
                </span>
              </>
            )}
            <ChevronDownIcon
              className={cn(
                "size-4 transition-transform",
                isOpen ? "rotate-180" : "rotate-0"
              )}
            />
          </>
        )}
      </CollapsibleTrigger>
    );
  }
);

export type ReasoningContentProps = ComponentProps<
  typeof CollapsibleContent
> & {
  children: string;
};

const streamdownPlugins = { cjk, code, math, mermaid };

export const ReasoningContent = memo(
  ({ className, children, ...props }: ReasoningContentProps) => (
    <CollapsibleContent
      className={cn(
        "mt-4 text-sm",
        "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-muted-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
        className
      )}
      {...props}
    >
      <Streamdown plugins={streamdownPlugins} {...props}>
        {children}
      </Streamdown>
    </CollapsibleContent>
  )
);

export type AdsReasoningTriggerProps = ComponentProps<
  typeof CollapsibleTrigger
> & {
  label?: string;
  completedLabel?: (duration?: number) => ReactNode;
  showChevron?: boolean;
};

const defaultCompletedLabel = (duration?: number) => {
  if (duration === undefined) {
    return "Thought for a few seconds";
  }
  return `Thought for ${duration} seconds`;
};

export const AdsReasoningTrigger = memo(
  ({
    className,
    label = "Thinking",
    completedLabel = defaultCompletedLabel,
    showChevron = true,
    ...props
  }: AdsReasoningTriggerProps) => {
    const { isStreaming, isOpen, duration } = useReasoning();
    const isComplete = !isStreaming && duration !== undefined && duration > 0;
    const hasCompletedStatusLabel = isCompletedStatusLabel(label);
    const shouldShowCompletedState = isComplete || hasCompletedStatusLabel;
    const completedStateLabel = hasCompletedStatusLabel ? label : completedLabel(duration);

    return (
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground",
          className
        )}
        {...props}
      >
        {shouldShowCompletedState ? (
          <>
            <Image
              src="/loading/rovo-logo.png"
              alt=""
              width={20}
              height={20}
            />
            <span>{completedStateLabel}</span>
          </>
        ) : (
          <>
            <style
              dangerouslySetInnerHTML={{
                __html: `
                  @keyframes dot-reveal {
                    0%, 20% { opacity: 0; }
                    40%, 100% { opacity: 1; }
                  }
                `,
              }}
            />
            <Image
              src="/loading/rovo-logo.gif"
              alt=""
              width={20}
              height={20}
              unoptimized
            />
            <span className="inline-flex items-baseline">
              <Shimmer duration={1} as="span">
                {label}
              </Shimmer>
              <span className="inline-flex items-baseline" aria-hidden="true">
                {DOT_COLORS.map((color, i) => (
                  <span
                    key={i}
                    className="text-sm leading-none"
                    style={{
                      color,
                      animation: "dot-reveal 1.2s ease-in-out infinite",
                      animationDelay: `${i * 0.2}s`,
                    }}
                  >
                    .
                  </span>
                ))}
              </span>
            </span>
          </>
        )}
        {showChevron ? (
          <ChevronDownIcon
            className={cn(
              "size-4 transition-transform",
              isOpen ? "rotate-180" : "rotate-0"
            )}
          />
        ) : null}
      </CollapsibleTrigger>
    );
  }
);

Reasoning.displayName = "Reasoning";
ReasoningTrigger.displayName = "ReasoningTrigger";
ReasoningContent.displayName = "ReasoningContent";
AdsReasoningTrigger.displayName = "AdsReasoningTrigger";
