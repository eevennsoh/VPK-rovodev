import {
	Reasoning,
	ReasoningTrigger,
	ReasoningContent,
	AdsReasoningTrigger,
} from "@/components/ui-ai/reasoning";

const SAMPLE_REASONING =
	"Analyzing the problem step by step...\n\nFirst, I need to consider the key constraints and requirements. The user is asking about implementing a collapsible reasoning component that shows the AI's thought process.";
const SAMPLE_TIMELINE_REASONING =
	"Invoking mcp_invoke_tool\nInvoking search\nTool call failed: mcp_atlassian_mcp__invoke_tool";

export default function ReasoningDemo() {
	return (
		<Reasoning open duration={3}>
			<ReasoningTrigger />
			<ReasoningContent>{SAMPLE_REASONING}</ReasoningContent>
		</Reasoning>
	);
}

export function ReasoningDemoAdsStreaming() {
	return (
		<Reasoning isStreaming defaultOpen={false}>
			<AdsReasoningTrigger />
			<ReasoningContent>{SAMPLE_TIMELINE_REASONING}</ReasoningContent>
		</Reasoning>
	);
}

export function ReasoningDemoAdsCompleted() {
	return (
		<Reasoning open duration={5}>
			<AdsReasoningTrigger />
			<ReasoningContent>{SAMPLE_TIMELINE_REASONING}</ReasoningContent>
		</Reasoning>
	);
}

export function ReasoningDemoAdsIndicator() {
	return (
		<Reasoning isStreaming defaultOpen={false}>
			<AdsReasoningTrigger showChevron={false} />
			<ReasoningContent>{SAMPLE_TIMELINE_REASONING}</ReasoningContent>
		</Reasoning>
	);
}

export function ReasoningDemoStreaming() {
	return (
		<Reasoning isStreaming defaultOpen={false}>
			<ReasoningTrigger />
			<ReasoningContent>{SAMPLE_TIMELINE_REASONING}</ReasoningContent>
		</Reasoning>
	);
}

export function ReasoningDemoCustomLabel() {
	return (
		<Reasoning isStreaming defaultOpen={false}>
			<AdsReasoningTrigger label="Using vpk-design skill" />
			<ReasoningContent>{SAMPLE_TIMELINE_REASONING}</ReasoningContent>
		</Reasoning>
	);
}
