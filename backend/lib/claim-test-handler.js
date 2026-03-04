/**
 * Claim Test Handler
 * Backend route handler for parallel claim test execution
 */

const { ClaimTestRunner } = require("./parallel-claim-test");

// Store active runners
const activeRunners = new Map();

/**
 * Handle GET requests for claim test status
 * @param {Object} query - Query parameters
 * @returns {Promise<Object>} Status response
 */
async function handleGetClaimTest(query) {
	const { runId, summary } = query;

	if (!runId) {
		// List all active runs
		const runs = Array.from(activeRunners.entries()).map(([id, runner]) => ({
			runId: id,
			active: runner.activeExecutions.size > 0,
			claimsCount: runner.claims.size,
			resultsCount: runner.results.size,
		}));

		return {
			status: 200,
			body: {
				activeRuns: runs,
			},
		};
	}

	const runner = activeRunners.get(runId);
	if (!runner) {
		return {
			status: 404,
			body: {
				error: `Run ${runId} not found`,
			},
		};
	}

	if (summary) {
		return {
			status: 200,
			body: {
				runId,
				...runner.getSummary(),
			},
		};
	}

	return {
		status: 200,
		body: {
			runId,
			claimsCount: runner.claims.size,
			resultsCount: runner.results.size,
			activeCount: runner.activeExecutions.size,
			results: Object.fromEntries(runner.results),
		},
	};
}

/**
 * Handle POST requests to execute claim tests
 * @param {Object} body - Request body containing test configuration
 * @returns {Promise<Object>} Execution response
 */
async function handlePostClaimTest(body) {
	const { runId: providedRunId, config } = body;

	if (!config || !Array.isArray(config.claims)) {
		return {
			status: 400,
			body: {
				error: "Invalid request: config.claims must be an array",
			},
		};
	}

	const runId = providedRunId || `claim-test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

	// Create or get existing runner
	let runner;
	if (activeRunners.has(runId)) {
		runner = activeRunners.get(runId);
	} else {
		runner = new ClaimTestRunner({
			maxConcurrency: config.maxConcurrency || 4,
			timeoutMs: config.timeoutMs || 30000,
			retryAttempts: config.retryAttempts || 2,
		});
		activeRunners.set(runId, runner);
	}

	// Register claims
	const registrationErrors = [];
	for (const claim of config.claims) {
		try {
			// Register with a mock validator (real validators would be provided by agents)
			runner.registerClaim(claim.id, claim, async () => {
				// This would be replaced with actual validation logic
				// For now, we simulate validation based on claim metadata
				if (claim.metadata?.shouldFail) {
					throw new Error(`Claim validation failed: ${claim.description}`);
				}
				return {
					claimId: claim.id,
					validated: true,
					timestamp: new Date(),
				};
			});
		} catch (error) {
			registrationErrors.push({
				claimId: claim.id,
				error: error.message,
			});
		}
	}

	// Execute all claims in parallel
	try {
		const startTime = Date.now();
		await runner.executeAll();
		const duration = Date.now() - startTime;

		const summary = runner.getSummary();

		return {
			status: 200,
			body: {
				runId,
				status: "completed",
				duration,
				summary,
				registrationErrors: registrationErrors.length > 0 ? registrationErrors : undefined,
			},
		};
	} catch (error) {
		return {
			status: 500,
			body: {
				error: "Claim test execution failed",
				details: error.message,
				runId,
			},
		};
	}
}

/**
 * Handle DELETE requests to reset/cancel claim tests
 * @param {Object} query - Query parameters
 * @returns {Promise<Object>} Deletion response
 */
async function handleDeleteClaimTest(query) {
	const { runId } = query;

	if (!runId) {
		// Clear all runs
		const count = activeRunners.size;
		activeRunners.clear();
		return {
			status: 200,
			body: {
				message: `Cleared ${count} claim test run(s)`,
			},
		};
	}

	const runner = activeRunners.get(runId);
	if (!runner) {
		return {
			status: 404,
			body: {
				error: `Run ${runId} not found`,
			},
		};
	}

	const summary = runner.getSummary();
	runner.reset();
	activeRunners.delete(runId);

	return {
		status: 200,
		body: {
			message: `Reset run ${runId}`,
			summary,
		},
	};
}

module.exports = {
	handleGetClaimTest,
	handlePostClaimTest,
	handleDeleteClaimTest,
	activeRunners,
};
