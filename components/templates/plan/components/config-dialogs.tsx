import type {
	SkillDialogProps,
	AgentDialogProps,
	ImportDialogState,
	DeleteAlertState,
} from "@/components/templates/plan/hooks/use-config-dialogs";
import SkillDialog from "./skill-dialog";
import AgentDialog from "./agent-dialog";
import ImportDialog from "./import-dialog";
import DeleteAlert from "./delete-alert";

interface ConfigDialogsProps {
	skillDialog: SkillDialogProps;
	agentDialog: AgentDialogProps;
	importDialog: ImportDialogState;
	onImportDialogClose: () => void;
	onImport: (content: string) => Promise<void>;
	deleteAlert: DeleteAlertState;
	onDeleteAlertClose: () => void;
	onDeleteConfirm: () => void;
}

export function ConfigDialogs({
	skillDialog,
	agentDialog,
	importDialog,
	onImportDialogClose,
	onImport,
	deleteAlert,
	onDeleteAlertClose,
	onDeleteConfirm,
}: Readonly<ConfigDialogsProps>) {
	return (
		<>
			<SkillDialog {...skillDialog} />
			<AgentDialog {...agentDialog} />
			<ImportDialog
				open={importDialog.open}
				onOpenChange={(open) => { if (!open) onImportDialogClose(); }}
				type={importDialog.type}
				onImport={onImport}
			/>
			<DeleteAlert
				open={deleteAlert.open}
				onOpenChange={(open) => { if (!open) onDeleteAlertClose(); }}
				type={deleteAlert.type}
				name={deleteAlert.name}
				referencedBy={deleteAlert.referencedBy}
				onConfirm={onDeleteConfirm}
			/>
		</>
	);
}
