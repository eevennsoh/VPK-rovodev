import { Checkpoint, CheckpointIcon, CheckpointTrigger } from "@/components/ui-ai/checkpoint";

export default function CheckpointDemo() {
	return (
		<Checkpoint>
			<CheckpointIcon />
			<CheckpointTrigger tooltip="Restore checkpoint">
				Checkpoint saved
			</CheckpointTrigger>
		</Checkpoint>
	);
}
