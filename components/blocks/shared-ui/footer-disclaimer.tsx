import InformationCircleIcon from "@atlaskit/icon/core/information-circle";
import { token } from "@/lib/tokens";

export default function FooterDisclaimer() {
	return (
		<div className="flex items-center justify-center gap-1 py-2 text-xs text-text-subtlest">
			<InformationCircleIcon label="Information" color={token("color.icon.subtlest")} size="small" />
			<span>Uses AI. Verify results.</span>
		</div>
	);
}
