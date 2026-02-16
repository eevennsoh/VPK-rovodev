"use client";

import {
	Tool,
	ToolContent,
	ToolHeader,
	ToolInput,
	ToolOutput,
} from "@/components/ui-ai/tool";

const WEATHER_INPUT = {
	location: "San Francisco, CA",
	units: "fahrenheit",
};

const WEATHER_OUTPUT = {
	temperature: 64,
	condition: "Partly Cloudy",
	humidity: 72,
	windSpeed: 12,
	windDirection: "WSW",
};

export default function ToolDemo() {
	return (
		<Tool defaultOpen>
			<ToolHeader
				type="tool-invocation"
				state="output-available"
				title="fetch_weather_data"
			/>
			<ToolContent>
				<ToolInput input={WEATHER_INPUT} />
				<ToolOutput output={WEATHER_OUTPUT} errorText={undefined} />
			</ToolContent>
		</Tool>
	);
}

export function ToolDemoRunning() {
	return (
		<Tool defaultOpen>
			<ToolHeader
				type="tool-invocation"
				state="input-available"
				title="search_documents"
			/>
			<ToolContent>
				<ToolInput input={{ query: "quarterly revenue report", limit: 10 }} />
			</ToolContent>
		</Tool>
	);
}

export function ToolDemoError() {
	return (
		<Tool defaultOpen>
			<ToolHeader
				type="tool-invocation"
				state="output-error"
				title="fetch_api_data"
			/>
			<ToolContent>
				<ToolInput input={{ endpoint: "/users/123", method: "GET" }} />
				<ToolOutput
					output={undefined}
					errorText="ConnectionError: Failed to connect to api.example.com:443 — connection timed out after 30s"
				/>
			</ToolContent>
		</Tool>
	);
}

export function ToolDemoCollapsed() {
	return (
		<Tool defaultOpen={false}>
			<ToolHeader
				type="tool-invocation"
				state="output-available"
				title="generate_chart"
			/>
			<ToolContent>
				<ToolInput
					input={{ type: "bar", data: [12, 45, 23, 67, 34], title: "Monthly Sales" }}
				/>
				<ToolOutput
					output={{ chartUrl: "/charts/abc123.png", format: "png" }}
					errorText={undefined}
				/>
			</ToolContent>
		</Tool>
	);
}

export function ToolDemoPending() {
	return (
		<Tool>
			<ToolHeader
				type="tool-invocation"
				state="input-streaming"
				title="analyze_sentiment"
			/>
		</Tool>
	);
}

export function ToolDemoApproval() {
	return (
		<Tool defaultOpen>
			<ToolHeader
				type="tool-invocation"
				state="approval-requested"
				title="delete_file"
			/>
			<ToolContent>
				<ToolInput
					input={{ path: "/workspace/temp/old-data.csv", permanent: true }}
				/>
			</ToolContent>
		</Tool>
	);
}
