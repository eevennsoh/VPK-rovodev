import { Terminal } from "@/components/ui-ai/terminal";

export default function TerminalDemo() {
	return (
		<Terminal
			output={"$ npm install\nadded 120 packages in 3s"}
			className="w-full text-xs"
		/>
	);
}
