import { Tool, ToolHeader } from "@/components/ui-ai/tool";

export default function ToolDemo() {
	return (
		<Tool className="w-full">
			<ToolHeader type="tool-invocation" state="output-available" />
		</Tool>
	);
}
