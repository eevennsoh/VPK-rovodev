import {
	Confirmation,
	ConfirmationTitle,
	ConfirmationRequest,
	ConfirmationActions,
	ConfirmationAction,
} from "@/components/ui-ai/confirmation";

export default function ConfirmationDemo() {
	return (
		<Confirmation
			approval={{ id: "1" }}
			state="approval-requested"
			className="w-full"
		>
			<ConfirmationTitle>Allow file access?</ConfirmationTitle>
			<ConfirmationRequest>
				<ConfirmationActions>
					<ConfirmationAction variant="outline">Deny</ConfirmationAction>
					<ConfirmationAction>Allow</ConfirmationAction>
				</ConfirmationActions>
			</ConfirmationRequest>
		</Confirmation>
	);
}
