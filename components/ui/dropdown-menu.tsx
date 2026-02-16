"use client"

import * as React from "react"
import type { ComponentProps, ComponentType, ReactElement, ReactNode } from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import CheckMarkIcon from "@atlaskit/icon/core/check-mark"
import ChevronRightIcon from "@atlaskit/icon/core/chevron-right"

import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"

type DropdownMenuProps = MenuPrimitive.Root.Props

function DropdownMenu({ ...props }: Readonly<DropdownMenuProps>) {
	return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

type DropdownMenuPortalProps = MenuPrimitive.Portal.Props

function DropdownMenuPortal({ ...props }: Readonly<DropdownMenuPortalProps>) {
	return <MenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
}

interface DropdownMenuTriggerProps
	extends Omit<MenuPrimitive.Trigger.Props, "render"> {
	render?: ReactElement
}

function DropdownMenuTrigger({
	render,
	...props
}: Readonly<DropdownMenuTriggerProps>) {
	const Trigger = MenuPrimitive.Trigger as ComponentType<DropdownMenuTriggerProps>
	return (
		<Trigger
			data-slot="dropdown-menu-trigger"
			render={render}
			{...props}
		/>
	)
}

interface DropdownMenuContentProps
	extends MenuPrimitive.Popup.Props,
		Pick<
			MenuPrimitive.Positioner.Props,
			"align" | "alignOffset" | "side" | "sideOffset"
		> {
	portalled?: boolean
	portalContainer?: MenuPrimitive.Portal.Props["container"]
}

function DropdownMenuContent({
	align = "start",
	alignOffset = 0,
	side = "bottom",
	sideOffset = 4,
	portalled = true,
	portalContainer,
	className,
	...props
}: Readonly<DropdownMenuContentProps>) {
	const inlinePortalContainerRef = React.useRef<HTMLSpanElement | null>(null)
	const content = (
		<MenuPrimitive.Positioner
			className="isolate z-50 outline-none"
			align={align}
			alignOffset={alignOffset}
			side={side}
			sideOffset={sideOffset}
		>
			<MenuPrimitive.Popup
				data-slot="dropdown-menu-content"
				className={cn(
					"data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=inline-end]:slide-in-from-left-2 bg-popover text-popover-foreground ring-border z-50 max-h-(--available-height) min-w-56 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg shadow-lg ring-1 outline-none duration-100 data-closed:overflow-hidden",
					className
				)}
				{...props}
			/>
		</MenuPrimitive.Positioner>
	)

	const resolvedPortalContainer = portalled
		? portalContainer
		: (portalContainer ?? inlinePortalContainerRef)

	return (
		<>
			{!portalled ? (
				<span
					aria-hidden
					data-slot="dropdown-menu-inline-portal-container"
					className="contents"
					ref={inlinePortalContainerRef}
				/>
			) : null}
			<MenuPrimitive.Portal container={resolvedPortalContainer}>
				{content}
			</MenuPrimitive.Portal>
		</>
	)
}

type DropdownMenuGroupProps = MenuPrimitive.Group.Props

function DropdownMenuGroup({
	className,
	...props
}: Readonly<DropdownMenuGroupProps>) {
	return (
		<MenuPrimitive.Group
			data-slot="dropdown-menu-group"
			className={cn("p-1", className)}
			{...props}
		/>
	)
}

interface DropdownMenuLabelProps extends MenuPrimitive.GroupLabel.Props {
	inset?: boolean
}

function DropdownMenuLabel({
	className,
	inset,
	...props
}: Readonly<DropdownMenuLabelProps>) {
	return (
		<MenuPrimitive.GroupLabel
			data-slot="dropdown-menu-label"
			data-inset={inset}
			className={cn(
				"text-text-subtle px-3 py-2 text-xs leading-4 font-medium data-inset:pl-8",
				className
			)}
			{...props}
		/>
	)
}

interface DropdownMenuItemProps extends MenuPrimitive.Item.Props {
	inset?: boolean
	variant?: "default" | "destructive"
	elemBefore?: ReactNode
	elemAfter?: ReactNode
	description?: string
}

function DropdownMenuItem({
	className,
	inset,
	variant = "default",
	elemBefore,
	elemAfter,
	description,
	children,
	...props
}: Readonly<DropdownMenuItemProps>) {
	return (
		<MenuPrimitive.Item
			data-slot="dropdown-menu-item"
			data-inset={inset}
			data-variant={variant}
			className={cn(
				"group/dropdown-menu-item data-[highlighted]:bg-bg-neutral-subtle-hovered data-[highlighted]:text-text data-[variant=destructive]:text-text-danger data-[variant=destructive]:data-[highlighted]:bg-bg-danger-subtler-hovered data-disabled:pointer-events-none data-disabled:text-text-disabled relative flex w-full cursor-default items-start gap-2 rounded-sm px-3 py-2 text-[13px] leading-5 outline-none select-none active:bg-bg-neutral-subtle-pressed data-[variant=destructive]:active:bg-bg-danger-subtler-pressed data-inset:pl-8 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className
			)}
			{...props}
		>
			{elemBefore ? (
				<span className="text-icon-subtle mt-0.5 inline-flex shrink-0 items-center justify-center">
					{elemBefore}
				</span>
			) : null}
			<span className="min-w-0 flex flex-1 flex-col">
				<span className="min-w-0 whitespace-normal break-words">{children}</span>
				{description ? (
					<span className="text-text-subtle text-[11px] leading-4">{description}</span>
				) : null}
			</span>
			{elemAfter ? (
				<span className="text-icon-subtle ml-auto inline-flex shrink-0 items-center justify-center">
					{elemAfter}
				</span>
			) : null}
		</MenuPrimitive.Item>
	)
}

type DropdownMenuSubProps = MenuPrimitive.SubmenuRoot.Props

function DropdownMenuSub({ ...props }: Readonly<DropdownMenuSubProps>) {
	return (
		<MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />
	)
}

interface DropdownMenuSubTriggerProps
	extends MenuPrimitive.SubmenuTrigger.Props {
	inset?: boolean
}

function DropdownMenuSubTrigger({
	className,
	inset,
	children,
	...props
}: Readonly<DropdownMenuSubTriggerProps>) {
	return (
		<MenuPrimitive.SubmenuTrigger
			data-slot="dropdown-menu-sub-trigger"
			data-inset={inset}
			className={cn(
				"group/dropdown-menu-item data-[highlighted]:bg-bg-neutral-subtle-hovered data-[highlighted]:text-text data-popup-open:bg-bg-neutral-subtle-hovered data-popup-open:text-text data-disabled:pointer-events-none data-disabled:text-text-disabled flex w-full cursor-default items-center gap-2 rounded-sm px-3 py-2 text-[13px] leading-5 outline-none select-none active:bg-bg-neutral-subtle-pressed data-inset:pl-8 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className
			)}
			{...props}
		>
			{children}
			<Icon
				render={<ChevronRightIcon label="" size="small" />}
				label="Open submenu"
				className="text-icon-subtle ml-auto"
			/>
		</MenuPrimitive.SubmenuTrigger>
	)
}

type DropdownMenuSubContentProps = ComponentProps<typeof DropdownMenuContent>

function DropdownMenuSubContent({
	align = "start",
	alignOffset = -4,
	side = "right",
	sideOffset = 2,
	className,
	...props
}: Readonly<DropdownMenuSubContentProps>) {
	return (
		<DropdownMenuContent
			data-slot="dropdown-menu-sub-content"
			className={cn("w-auto min-w-48", className)}
			align={align}
			alignOffset={alignOffset}
			side={side}
			sideOffset={sideOffset}
			{...props}
		/>
	)
}

interface DropdownMenuCheckboxItemProps
	extends MenuPrimitive.CheckboxItem.Props {
	inset?: boolean
}

function DropdownMenuCheckboxItem({
	className,
	children,
	checked,
	inset,
	...props
}: Readonly<DropdownMenuCheckboxItemProps>) {
	return (
		<MenuPrimitive.CheckboxItem
			data-slot="dropdown-menu-checkbox-item"
			data-inset={inset}
			className={cn(
				"data-[highlighted]:bg-bg-neutral-subtle-hovered data-[highlighted]:text-text data-disabled:pointer-events-none data-disabled:text-text-disabled relative flex w-full cursor-default items-center rounded-sm py-2 pr-3 pl-8 text-[13px] leading-5 outline-none select-none active:bg-bg-neutral-subtle-pressed data-inset:pl-8 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className
			)}
			checked={checked}
			{...props}
		>
			<span
				className="pointer-events-none absolute left-2 inline-flex items-center justify-center"
				data-slot="dropdown-menu-checkbox-item-indicator"
			>
				<MenuPrimitive.CheckboxItemIndicator>
					<Icon
						render={<CheckMarkIcon label="" size="small" />}
						label="Selected"
						className="text-icon"
					/>
				</MenuPrimitive.CheckboxItemIndicator>
			</span>
			{children}
		</MenuPrimitive.CheckboxItem>
	)
}

type DropdownMenuRadioGroupProps = MenuPrimitive.RadioGroup.Props

function DropdownMenuRadioGroup({
	...props
}: Readonly<DropdownMenuRadioGroupProps>) {
	return (
		<MenuPrimitive.RadioGroup
			data-slot="dropdown-menu-radio-group"
			{...props}
		/>
	)
}

interface DropdownMenuRadioItemProps extends MenuPrimitive.RadioItem.Props {
	inset?: boolean
}

function DropdownMenuRadioItem({
	className,
	children,
	inset,
	...props
}: Readonly<DropdownMenuRadioItemProps>) {
	return (
		<MenuPrimitive.RadioItem
			data-slot="dropdown-menu-radio-item"
			data-inset={inset}
			className={cn(
				"data-[highlighted]:bg-bg-neutral-subtle-hovered data-[highlighted]:text-text data-disabled:pointer-events-none data-disabled:text-text-disabled relative flex w-full cursor-default items-center rounded-sm py-2 pr-3 pl-8 text-[13px] leading-5 outline-none select-none active:bg-bg-neutral-subtle-pressed data-inset:pl-8 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className
			)}
			{...props}
		>
			<span
				className="pointer-events-none absolute left-2 inline-flex items-center justify-center"
				data-slot="dropdown-menu-radio-item-indicator"
			>
				<MenuPrimitive.RadioItemIndicator>
					<Icon
						render={<CheckMarkIcon label="" size="small" />}
						label="Selected"
						className="text-icon"
					/>
				</MenuPrimitive.RadioItemIndicator>
			</span>
			{children}
		</MenuPrimitive.RadioItem>
	)
}

type DropdownMenuSeparatorProps = MenuPrimitive.Separator.Props

function DropdownMenuSeparator({
	className,
	...props
}: Readonly<DropdownMenuSeparatorProps>) {
	return (
		<MenuPrimitive.Separator
			data-slot="dropdown-menu-separator"
			className={cn("bg-border mx-1 my-1 h-px", className)}
			{...props}
		/>
	)
}

type DropdownMenuShortcutProps = ComponentProps<"span">

function DropdownMenuShortcut({
	className,
	...props
}: Readonly<DropdownMenuShortcutProps>) {
	return (
		<span
			data-slot="dropdown-menu-shortcut"
			className={cn(
				"text-text-subtlest group-data-[highlighted]/dropdown-menu-item:text-text-subtle ml-auto text-[11px] leading-4 tracking-wide",
				className
			)}
			{...props}
		/>
	)
}

export {
	DropdownMenu,
	DropdownMenuPortal,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuItem,
	DropdownMenuCheckboxItem,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubTrigger,
	DropdownMenuSubContent,
	type DropdownMenuProps,
	type DropdownMenuPortalProps,
	type DropdownMenuTriggerProps,
	type DropdownMenuContentProps,
	type DropdownMenuGroupProps,
	type DropdownMenuLabelProps,
	type DropdownMenuItemProps,
	type DropdownMenuCheckboxItemProps,
	type DropdownMenuRadioGroupProps,
	type DropdownMenuRadioItemProps,
	type DropdownMenuSeparatorProps,
	type DropdownMenuShortcutProps,
	type DropdownMenuSubProps,
	type DropdownMenuSubTriggerProps,
	type DropdownMenuSubContentProps,
}
