import {
	ChainOfThought,
	ChainOfThoughtStep,
} from "@/components/ui-ai/chain-of-thought";
import { SearchIcon, CheckIcon } from "lucide-react";

export default function ChainOfThoughtDemo() {
	return (
		<ChainOfThought defaultOpen>
			<ChainOfThoughtStep icon={SearchIcon} label="Searching" status="complete" />
			<ChainOfThoughtStep icon={CheckIcon} label="Analyzing results" status="active" />
		</ChainOfThought>
	);
}
