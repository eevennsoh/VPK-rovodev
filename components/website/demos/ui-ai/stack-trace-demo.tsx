import { StackTrace } from "@/components/ui-ai/stack-trace";

const trace = `TypeError: Cannot read properties of undefined
    at processData (src/utils.ts:42:15)
    at handleRequest (src/api.ts:18:5)`;

export default function StackTraceDemo() {
	return <StackTrace trace={trace} className="w-full" />;
}
