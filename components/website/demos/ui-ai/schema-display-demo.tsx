import {
	SchemaDisplay,
	SchemaDisplayHeader,
	SchemaDisplayMethod,
	SchemaDisplayPath,
} from "@/components/ui-ai/schema-display";

export default function SchemaDisplayDemo() {
	return (
		<SchemaDisplay method="GET" path="/api/users/{id}" className="w-full">
			<SchemaDisplayHeader>
				<SchemaDisplayMethod />
				<SchemaDisplayPath />
			</SchemaDisplayHeader>
		</SchemaDisplay>
	);
}
