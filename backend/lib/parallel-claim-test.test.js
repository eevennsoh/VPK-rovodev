/**
 * Tests for Parallel Claim Test Framework
 */

const { ClaimTestRunner } = require("./parallel-claim-test");

describe("ClaimTestRunner", () => {
	let runner;

	beforeEach(() => {
		runner = new ClaimTestRunner({
			maxConcurrency: 2,
			timeoutMs: 1000,
			retryAttempts: 1,
		});
	});

	afterEach(() => {
		runner.reset();
	});

	describe("registerClaim", () => {
		test("registers a claim successfully", () => {
			const validatorFn = async () => ({ validated: true });
			runner.registerClaim("claim-1", { description: "Test claim" }, validatorFn);

			expect(runner.claims.has("claim-1")).toBe(true);
			expect(runner.claims.get("claim-1").status).toBe("pending");
		});

		test("throws on duplicate claim registration", () => {
			const validatorFn = async () => ({ validated: true });
			runner.registerClaim("claim-1", { description: "Test" }, validatorFn);

			expect(() => {
				runner.registerClaim("claim-1", { description: "Test" }, validatorFn);
			}).toThrow("Claim claim-1 already registered");
		});
	});

	describe("executeAll", () => {
		test("executes all claims and returns results", async () => {
			runner.registerClaim("claim-1", {}, async () => ({ result: "pass" }));
			runner.registerClaim("claim-2", {}, async () => ({ result: "pass" }));

			const results = await runner.executeAll();

			expect(results.size).toBe(2);
			expect(results.get("claim-1").status).toBe("passed");
			expect(results.get("claim-2").status).toBe("passed");
		});

		test("respects maxConcurrency limit", async () => {
			const executionOrder = [];
			let maxConcurrent = 0;
			let currentConcurrent = 0;

			runner.registerClaim("claim-1", {}, async () => {
				currentConcurrent++;
				maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
				executionOrder.push("start-1");
				await new Promise((resolve) => setTimeout(resolve, 100));
				currentConcurrent--;
				return { result: "pass" };
			});

			runner.registerClaim("claim-2", {}, async () => {
				currentConcurrent++;
				maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
				executionOrder.push("start-2");
				await new Promise((resolve) => setTimeout(resolve, 100));
				currentConcurrent--;
				return { result: "pass" };
			});

			runner.registerClaim("claim-3", {}, async () => {
				executionOrder.push("start-3");
				return { result: "pass" };
			});

			await runner.executeAll();

			// With maxConcurrency=2, should not exceed 2 concurrent executions
			expect(maxConcurrent).toBeLessThanOrEqual(2);
		});

		test("handles claim failures", async () => {
			runner.registerClaim("claim-pass", {}, async () => ({ result: "pass" }));
			runner.registerClaim("claim-fail", {}, async () => {
				throw new Error("Validation failed");
			});

			const results = await runner.executeAll();

			expect(results.get("claim-pass").status).toBe("passed");
			expect(results.get("claim-fail").status).toBe("failed");
			expect(results.get("claim-fail").error).toContain("Validation failed");
		});

		test("implements retry logic", async () => {
			let attemptCount = 0;
			runner.registerClaim("claim-retry", {}, async () => {
				attemptCount++;
				if (attemptCount < 2) {
					throw new Error("First attempt fails");
				}
				return { result: "pass" };
			});

			const results = await runner.executeAll();

			expect(results.get("claim-retry").status).toBe("passed");
			expect(results.get("claim-retry").attempt).toBe(1);
		});

		test("enforces timeout", async () => {
			runner = new ClaimTestRunner({
				timeoutMs: 100,
				retryAttempts: 0,
			});

			runner.registerClaim("claim-slow", {}, async () => {
				await new Promise((resolve) => setTimeout(resolve, 500));
				return { result: "pass" };
			});

			const results = await runner.executeAll();

			expect(results.get("claim-slow").status).toBe("failed");
			expect(results.get("claim-slow").error).toContain("timeout");
		});
	});

	describe("getSummary", () => {
		test("returns accurate summary statistics", async () => {
			runner.registerClaim("claim-1", {}, async () => ({ result: "pass" }));
			runner.registerClaim("claim-2", {}, async () => ({ result: "pass" }));
			runner.registerClaim("claim-3", {}, async () => {
				throw new Error("Fail");
			});

			await runner.executeAll();

			const summary = runner.getSummary();

			expect(summary.total).toBe(3);
			expect(summary.passed).toBe(2);
			expect(summary.failed).toBe(1);
			expect(summary.pending).toBe(0);
			expect(summary.passRate).toContain("66");
		});
	});

	describe("event emissions", () => {
		test("emits claim:passed event", async () => {
			const passedEvents = [];
			runner.on("claim:passed", (result) => {
				passedEvents.push(result);
			});

			runner.registerClaim("claim-1", {}, async () => ({ result: "pass" }));
			await runner.executeAll();

			expect(passedEvents).toHaveLength(1);
			expect(passedEvents[0].claimId).toBe("claim-1");
		});

		test("emits claim:failed event", async () => {
			const failedEvents = [];
			runner.on("claim:failed", (result) => {
				failedEvents.push(result);
			});

			runner.registerClaim("claim-fail", {}, async () => {
				throw new Error("Test fail");
			});
			await runner.executeAll();

			expect(failedEvents).toHaveLength(1);
			expect(failedEvents[0].claimId).toBe("claim-fail");
		});

		test("emits claim:retry event", async () => {
			const retryEvents = [];
			runner.on("claim:retry", (result) => {
				retryEvents.push(result);
			});

			let attempts = 0;
			runner.registerClaim("claim-retry", {}, async () => {
				attempts++;
				if (attempts === 1) {
					throw new Error("First fail");
				}
				return { result: "pass" };
			});
			await runner.executeAll();

			expect(retryEvents).toHaveLength(1);
		});
	});

	describe("reset", () => {
		test("clears all state", async () => {
			runner.registerClaim("claim-1", {}, async () => ({ result: "pass" }));
			await runner.executeAll();

			expect(runner.claims.size).toBe(1);
			expect(runner.results.size).toBe(1);

			runner.reset();

			expect(runner.claims.size).toBe(0);
			expect(runner.results.size).toBe(0);
			expect(runner.activeExecutions.size).toBe(0);
		});
	});
});
