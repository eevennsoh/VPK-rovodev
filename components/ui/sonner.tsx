"use client";

import * as React from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import CrossIcon from "@atlaskit/icon/core/cross";
import StatusErrorIcon from "@atlaskit/icon/core/status-error";
import StatusInformationIcon from "@atlaskit/icon/core/status-information";
import StatusSuccessIcon from "@atlaskit/icon/core/status-success";
import StatusWarningIcon from "@atlaskit/icon/core/status-warning";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

type SonnerToastAppearance = "neutral" | "success" | "info" | "warning" | "error";

interface SonnerToastAction {
	label: React.ReactNode;
	onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

interface SonnerToastProps extends Omit<React.ComponentProps<"div">, "title"> {
	appearance?: SonnerToastAppearance;
	title: React.ReactNode;
	description?: React.ReactNode;
	action?: SonnerToastAction;
	secondaryAction?: SonnerToastAction;
	dismissible?: boolean;
	onDismiss?: () => void;
	icon?: React.ReactNode;
	iconLabel?: string;
}

const SONNER_TOAST_APPEARANCE_STYLES: Record<SonnerToastAppearance, string> = {
	neutral: "bg-surface-raised",
	success: "bg-bg-success-subtler",
	info: "bg-bg-information-subtler",
	warning: "bg-bg-warning-subtler",
	error: "bg-bg-danger-subtler",
};

const SONNER_TOAST_ICON_LABELS: Record<SonnerToastAppearance, string> = {
	neutral: "Notification",
	success: "Success",
	info: "Information",
	warning: "Warning",
	error: "Error",
};

function getSonnerIcon(appearance: SonnerToastAppearance) {
	switch (appearance) {
		case "success":
			return (
				<StatusSuccessIcon
					label=""
					size="small"
					spacing="none"
					color="var(--ds-icon-success)"
				/>
			);
		case "warning":
			return (
				<StatusWarningIcon
					label=""
					size="small"
					spacing="none"
					color="var(--ds-icon-warning)"
				/>
			);
		case "error":
			return (
				<StatusErrorIcon
					label=""
					size="small"
					spacing="none"
					color="var(--ds-icon-danger)"
				/>
			);
		case "neutral":
		case "info":
		default:
			return (
				<StatusInformationIcon
					label=""
					size="small"
					spacing="none"
					color="var(--ds-icon-information)"
				/>
			);
	}
}

function SonnerToast({
	appearance = "neutral",
	title,
	description,
	action,
	secondaryAction,
	dismissible = false,
	onDismiss,
	icon,
	iconLabel,
	className,
	style,
	...props
}: Readonly<SonnerToastProps>) {
	return (
		<div
			data-slot="sonner-toast"
			className={cn(
				"w-[min(420px,calc(100vw-2rem))] rounded-sm p-3 text-left text-[14px]/[20px] text-text shadow-2xl",
				SONNER_TOAST_APPEARANCE_STYLES[appearance],
				className
			)}
			style={style}
			{...props}
		>
			<div className="flex items-start gap-3">
				<div className="mt-0.5 shrink-0 text-icon">
					{icon ?? (
						<Icon
							label={iconLabel ?? SONNER_TOAST_ICON_LABELS[appearance]}
							render={getSonnerIcon(appearance)}
						/>
					)}
				</div>
				<div className="min-w-0 flex-1">
					<div className="text-sm/5 font-semibold text-text">{title}</div>
					{description ? (
						<div className="mt-1 text-[14px]/[20px] text-text-subtle">
							{description}
						</div>
					) : null}
					{action || secondaryAction ? (
						<div className="mt-2 flex flex-wrap items-center gap-3">
							{action ? (
								<button
									type="button"
									onClick={action.onClick}
									className="focus-visible:ring-ring rounded-xs px-0.5 text-link underline-offset-3 outline-none hover:underline focus-visible:ring-2"
								>
									{action.label}
								</button>
							) : null}
							{secondaryAction ? (
								<button
									type="button"
									onClick={secondaryAction.onClick}
									className="focus-visible:ring-ring rounded-xs px-0.5 text-link underline-offset-3 outline-none hover:underline focus-visible:ring-2"
								>
									{secondaryAction.label}
								</button>
							) : null}
						</div>
					) : null}
				</div>
				{dismissible && onDismiss ? (
					<button
						type="button"
						onClick={onDismiss}
						className="focus-visible:ring-ring text-icon-subtle inline-flex size-7 shrink-0 items-center justify-center rounded-sm outline-none hover:bg-bg-neutral-subtle-hovered active:bg-bg-neutral-subtle-pressed focus-visible:ring-2"
						aria-label="Dismiss notification"
					>
						<Icon
							label="Close"
							render={<CrossIcon label="" spacing="none" size="small" />}
						/>
					</button>
				) : null}
			</div>
		</div>
	);
}

const Toaster = ({ toastOptions, ...props }: ToasterProps) => {
	return (
		<Sonner
			toastOptions={{
				...toastOptions,
				unstyled: true,
			}}
			{...props}
		/>
	);
};

export { SonnerToast, Toaster };
export type { SonnerToastAction, SonnerToastAppearance, SonnerToastProps };
