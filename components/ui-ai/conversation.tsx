"use client"

import type { ComponentProps, ReactNode, RefObject } from "react"
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowDownIcon, DownloadIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const DEFAULT_SCROLL_THRESHOLD_PX = 24

type ScrollAnimation = boolean | ScrollBehavior | "instant" | {
	damping: number
	stiffness: number
	mass: number
}

export interface ScrollToBottomOptions {
	animation?: ScrollAnimation
	ignoreEscapes?: boolean
}

export interface ConversationScrollTargetOptions {
	scrollElement: HTMLElement
}

export type GetTargetScrollTop = (
	defaultTargetTop: number,
	options: ConversationScrollTargetOptions
) => number

export interface ConversationContextValue {
	scrollRef: RefObject<HTMLDivElement | null>
	contentRef: RefObject<HTMLDivElement | null>
	isAtBottom: boolean
	scrollToBottom: (options?: ScrollToBottomOptions) => Promise<void>
}

const ConversationContext = createContext<ConversationContextValue | null>(null)

function resolveScrollBehavior(animation: ScrollAnimation | undefined): ScrollBehavior {
	if (animation === false || animation === "instant") {
		return "auto"
	}

	if (animation === "auto" || animation === "smooth") {
		return animation
	}

	if (typeof animation === "object") {
		return "smooth"
	}

	return "smooth"
}

function setContextRef(
	contextRef: { current: ConversationContextValue | null } | undefined,
	value: ConversationContextValue | null
) {
	if (contextRef) {
		contextRef.current = value
	}
}

export function useConversationContext(): ConversationContextValue {
	const context = use(ConversationContext)

	if (!context) {
		throw new Error("useConversationContext must be used within <Conversation>")
	}

	return context
}

export interface ConversationProps extends ComponentProps<"div"> {
	contextRef?: { current: ConversationContextValue | null }
	initial?: ScrollAnimation
	resize?: ScrollAnimation
	targetScrollTop?: GetTargetScrollTop
}

export function Conversation({
	children,
	className,
	contextRef,
	initial = "smooth",
	resize = "smooth",
	role = "log",
	targetScrollTop,
	...props
}: Readonly<ConversationProps>) {
	const scrollRef = useRef<HTMLDivElement>(null)
	const contentRef = useRef<HTMLDivElement>(null)
	const [isAtBottom, setIsAtBottom] = useState(true)
	const isAtBottomRef = useRef(true)
	const hasInitializedScrollRef = useRef(false)
	const lastKnownScrollHeightRef = useRef(0)

	const updateIsAtBottom = useCallback(() => {
		const scrollElement = scrollRef.current
		if (!scrollElement) {
			return true
		}

		const distanceFromBottom =
			scrollElement.scrollHeight - scrollElement.clientHeight - scrollElement.scrollTop
		const nextIsAtBottom = distanceFromBottom <= DEFAULT_SCROLL_THRESHOLD_PX
		isAtBottomRef.current = nextIsAtBottom
		setIsAtBottom(nextIsAtBottom)
		return nextIsAtBottom
	}, [])

	const scrollToBottom = useCallback(
		async (options?: ScrollToBottomOptions) => {
			const scrollElement = scrollRef.current
			if (!scrollElement) {
				return
			}

			const defaultTargetTop = Math.max(
				0,
				scrollElement.scrollHeight - scrollElement.clientHeight
			)
			const targetTop = targetScrollTop
				? targetScrollTop(defaultTargetTop, { scrollElement })
				: defaultTargetTop

			scrollElement.scrollTo({
				top: Math.max(0, targetTop),
				behavior: resolveScrollBehavior(options?.animation),
			})
			updateIsAtBottom()
		},
		[targetScrollTop, updateIsAtBottom]
	)

	const contextValue = useMemo<ConversationContextValue>(
		() => ({
			scrollRef,
			contentRef,
			isAtBottom,
			scrollToBottom,
		}),
		[isAtBottom, scrollToBottom]
	)

	useEffect(() => {
		setContextRef(contextRef, contextValue)
		return () => {
			setContextRef(contextRef, null)
		}
	}, [contextRef, contextValue])

	useEffect(() => {
		const scrollElement = scrollRef.current
		if (!scrollElement) {
			return
		}

		const handleScroll = () => {
			updateIsAtBottom()
		}

		handleScroll()
		scrollElement.addEventListener("scroll", handleScroll, { passive: true })

		return () => {
			scrollElement.removeEventListener("scroll", handleScroll)
		}
	}, [updateIsAtBottom])

	useEffect(() => {
		const scrollElement = scrollRef.current
		if (!scrollElement) {
			return
		}

		lastKnownScrollHeightRef.current = scrollElement.scrollHeight

		if (initial === false || hasInitializedScrollRef.current) {
			return
		}

		hasInitializedScrollRef.current = true
		const frameId = window.requestAnimationFrame(() => {
			void scrollToBottom({ animation: initial })
		})

		return () => {
			window.cancelAnimationFrame(frameId)
		}
	}, [initial, scrollToBottom])

	useEffect(() => {
		const scrollElement = scrollRef.current
		const observedContentElement = contentRef.current
		if (!scrollElement || typeof ResizeObserver === "undefined") {
			return
		}

		const observer = new ResizeObserver(() => {
			const previousScrollHeight = lastKnownScrollHeightRef.current
			const nextScrollHeight = scrollElement.scrollHeight
			const shouldStickToBottom =
				isAtBottomRef.current || previousScrollHeight === 0 || !hasInitializedScrollRef.current

			lastKnownScrollHeightRef.current = nextScrollHeight
			updateIsAtBottom()

			if (resize === false || !shouldStickToBottom) {
				return
			}

			void scrollToBottom({ animation: resize })
		})

		observer.observe(scrollElement)
		if (observedContentElement && observedContentElement !== scrollElement) {
			observer.observe(observedContentElement)
		}

		return () => {
			observer.disconnect()
		}
	}, [resize, scrollToBottom, updateIsAtBottom])

	return (
		<ConversationContext value={contextValue}>
			<div
				className={cn("relative flex-1 overflow-y-hidden", className)}
				ref={scrollRef}
				role={role}
				{...props}
			>
				{children}
			</div>
		</ConversationContext>
	)
}

export interface ConversationContentProps extends ComponentProps<"div"> {}

export function ConversationContent({
	className,
	...props
}: Readonly<ConversationContentProps>) {
	const context = use(ConversationContext)

	return (
		<div
			className={cn("flex flex-col gap-8 p-4", className)}
			ref={context?.contentRef}
			{...props}
		/>
	)
}

export type ConversationEmptyStateProps = ComponentProps<"div"> & {
	title?: string
	description?: string
	icon?: ReactNode
}

export function ConversationEmptyState({
	className,
	title = "No messages yet",
	description = "Start a conversation to see messages here",
	icon,
	children,
	...props
}: Readonly<ConversationEmptyStateProps>) {
	return (
		<div
			className={cn(
				"flex size-full flex-col items-center justify-center gap-3 p-8 text-center",
				className
			)}
			{...props}
		>
			{children ?? (
				<>
					{icon ? <div className="text-muted-foreground">{icon}</div> : null}
					<div className="space-y-1">
						<h3 className="text-sm font-medium">{title}</h3>
						{description ? (
							<p className="text-muted-foreground text-sm">{description}</p>
						) : null}
					</div>
				</>
			)}
		</div>
	)
}

export type ConversationScrollButtonProps = ComponentProps<typeof Button>

export function ConversationScrollButton({
	className,
	...props
}: Readonly<ConversationScrollButtonProps>) {
	const { isAtBottom, scrollToBottom } = useConversationContext()

	const handleScrollToBottom = useCallback(() => {
		void scrollToBottom()
	}, [scrollToBottom])

	return !isAtBottom ? (
		<Button
			className={cn(
				"absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full",
				className
			)}
			onClick={handleScrollToBottom}
			size="icon"
			type="button"
			variant="outline"
			{...props}
		>
			<ArrowDownIcon className="size-4" />
		</Button>
	) : null
}

export interface ConversationMessage {
	role: "user" | "assistant" | "system" | "data" | "tool"
	content: string
}

export type ConversationDownloadProps = Omit<
	ComponentProps<typeof Button>,
	"onClick"
> & {
	messages: ConversationMessage[]
	filename?: string
	formatMessage?: (message: ConversationMessage, index: number) => string
}

const defaultFormatMessage = (message: ConversationMessage): string => {
	const roleLabel =
		message.role.charAt(0).toUpperCase() + message.role.slice(1)
	return `**${roleLabel}:** ${message.content}`
}

export const messagesToMarkdown = (
	messages: ConversationMessage[],
	formatMessage: (
		message: ConversationMessage,
		index: number
	) => string = defaultFormatMessage
): string => messages.map((msg, index) => formatMessage(msg, index)).join("\n\n")

export function ConversationDownload({
	messages,
	filename = "conversation.md",
	formatMessage = defaultFormatMessage,
	className,
	children,
	...props
}: Readonly<ConversationDownloadProps>) {
	const handleDownload = useCallback(() => {
		const markdown = messagesToMarkdown(messages, formatMessage)
		const blob = new Blob([markdown], { type: "text/markdown" })
		const url = URL.createObjectURL(blob)
		const link = document.createElement("a")
		link.href = url
		link.download = filename
		document.body.append(link)
		link.click()
		link.remove()
		URL.revokeObjectURL(url)
	}, [messages, filename, formatMessage])

	return (
		<Button
			className={cn("absolute top-4 right-4 rounded-full", className)}
			onClick={handleDownload}
			size="icon"
			type="button"
			variant="outline"
			{...props}
		>
			{children ?? <DownloadIcon className="size-4" />}
		</Button>
	)
}
