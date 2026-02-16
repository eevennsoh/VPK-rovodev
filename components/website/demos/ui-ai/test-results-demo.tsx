import {
	TestResults,
	TestResultsHeader,
	TestResultsSummary,
	TestResultsContent,
	TestSuite,
	TestSuiteName,
	TestSuiteContent,
	Test,
	TestStatus,
	TestName,
} from "@/components/ui-ai/test-results";

export default function TestResultsDemo() {
	return (
		<TestResults summary={{ passed: 2, failed: 1, skipped: 0, total: 3 }} className="w-full">
			<TestResultsHeader>
				<TestResultsSummary />
			</TestResultsHeader>
			<TestResultsContent>
				<TestSuite name="utils.test.ts" status="failed" defaultOpen>
					<TestSuiteName />
					<TestSuiteContent>
						<Test name="adds numbers" status="passed">
							<TestStatus />
							<TestName />
						</Test>
						<Test name="handles nulls" status="failed">
							<TestStatus />
							<TestName />
						</Test>
					</TestSuiteContent>
				</TestSuite>
			</TestResultsContent>
		</TestResults>
	);
}
