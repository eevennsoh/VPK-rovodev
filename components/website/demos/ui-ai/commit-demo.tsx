import {
	Commit,
	CommitHeader,
	CommitHash,
	CommitMessage,
} from "@/components/ui-ai/commit";

export default function CommitDemo() {
	return (
		<Commit className="w-full">
			<CommitHeader>
				<CommitHash>a1b2c3d</CommitHash>
				<CommitMessage>Fix button styling</CommitMessage>
			</CommitHeader>
		</Commit>
	);
}
