import { Persona } from "@/components/ui-ai/persona";

export default function PersonaDemo() {
	return (
		<div className="flex items-center justify-center">
			<Persona state="idle" variant="obsidian" className="size-20" />
		</div>
	);
}
