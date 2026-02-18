import type {
	SkillDialogProps,
	AgentDialogProps,
} from "@/components/templates/agents-team/hooks/use-config-dialogs";
import SkillDialog from "./skill-dialog";
import AgentDialog from "./agent-dialog";

interface ConfigDialogsProps {
	skillDialog: SkillDialogProps;
	agentDialog: AgentDialogProps;
}

export function ConfigDialogs({ skillDialog, agentDialog }: Readonly<ConfigDialogsProps>) {
	return (
		<>
			<SkillDialog {...skillDialog} />
			<AgentDialog {...agentDialog} />
		</>
	);
}
