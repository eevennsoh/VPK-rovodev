"use client";

import {
	EnvironmentVariables,
	EnvironmentVariablesHeader,
	EnvironmentVariablesTitle,
	EnvironmentVariablesToggle,
	EnvironmentVariablesContent,
	EnvironmentVariable,
	EnvironmentVariableName,
	EnvironmentVariableValue,
} from "@/components/ui-ai/environment-variables";

export default function EnvironmentVariablesDemo() {
	return (
		<EnvironmentVariables className="w-full">
			<EnvironmentVariablesHeader>
				<EnvironmentVariablesTitle />
				<EnvironmentVariablesToggle />
			</EnvironmentVariablesHeader>
			<EnvironmentVariablesContent>
				<EnvironmentVariable name="API_KEY" value="sk-123abc">
					<EnvironmentVariableName />
					<EnvironmentVariableValue />
				</EnvironmentVariable>
				<EnvironmentVariable name="NODE_ENV" value="production">
					<EnvironmentVariableName />
					<EnvironmentVariableValue />
				</EnvironmentVariable>
			</EnvironmentVariablesContent>
		</EnvironmentVariables>
	);
}
