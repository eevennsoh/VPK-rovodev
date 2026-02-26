"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogMedia,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import WarningIcon from "@atlaskit/icon/core/warning";

interface DeleteAlertProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	type: "skill" | "agent";
	name: string;
	referencedBy?: string[];
	onConfirm: () => void;
}

export default function DeleteAlert({
	open,
	onOpenChange,
	type,
	name,
	referencedBy,
	onConfirm,
}: Readonly<DeleteAlertProps>) {
	const hasReferences = type === "skill" && referencedBy && referencedBy.length > 0;

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent size="sm">
				<AlertDialogHeader>
					<AlertDialogMedia className="bg-bg-danger-bold/10 text-icon-danger">
						<WarningIcon label="" />
					</AlertDialogMedia>
					<AlertDialogTitle>
						Delete &ldquo;{name}&rdquo;?
					</AlertDialogTitle>
					<AlertDialogDescription>
						{hasReferences ? (
							<>
								This skill is referenced by the following agents:
								<ul className="mt-1 list-disc pl-4">
									{referencedBy.map((agentName) => (
										<li key={agentName}>{agentName}</li>
									))}
								</ul>
								<span className="mt-1 block">
									These agents will continue to reference this skill, but it will
									no longer be available at runtime.
								</span>
							</>
						) : (
							`This ${type} will be permanently deleted. This action cannot be undone.`
						)}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction variant="destructive" onClick={onConfirm}>
						Delete
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
