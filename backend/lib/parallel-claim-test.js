/**
 * Parallel Claim Test Framework
 * Manages concurrent claim validation across multiple agents and processes
 */

const EventEmitter = require("events");

/**
 * ClaimTestRunner - Orchestrates parallel claim execution
 * @class
 */
class ClaimTestRunner extends EventEmitter {
	constructor(config = {}) {
		super();
		this.config = {
			maxConcurrency: config.maxConcurrency || 4,
			timeoutMs: config.timeoutMs || 30000,
			retryAttempts: config.retryAttempts || 2,
		};
		this.claims = new Map();
		this.results = new Map();
		this.activeExecutions = new Set();
	}

	/**
	 * Register a claim for testing
	 * @param {string} claimId - Unique identifier for the claim
	 * @param {Object} claimDef - Claim definition
	 * @param {Function} validatorFn - Async function that validates the claim
	 */
	registerClaim(claimId, claimDef, validatorFn) {
		if (this.claims.has(claimId)) {
			throw new Error(`Claim ${claimId} already registered`);
		}
		this.claims.set(claimId, {
			id: claimId,
			definition: claimDef,
			validator: validatorFn,
			status: "pending",
			createdAt: new Date(),
		});
		return claimId;
	}

	/**
	 * Execute all registered claims in parallel (respecting concurrency limit)
	 * @returns {Promise<Map>} Results keyed by claimId
	 */
	async executeAll() {
		const claimArray = Array.from(this.claims.values());
		const executionQueue = [...claimArray];
		const executing = [];

		return new Promise((resolve, reject) => {
			const processQueue = async () => {
				while (executionQueue.length > 0 && this.activeExecutions.size < this.config.maxConcurrency) {
					const claim = executionQueue.shift();
					const promise = this.executeClaim(claim).finally(() => {
						const idx = executing.indexOf(promise);
						if (idx !== -1) executing.splice(idx, 1);
						processQueue();
					});
					executing.push(promise);
				}

				if (executing.length === 0 && executionQueue.length === 0) {
					resolve(this.results);
				}
			};

			processQueue().catch(reject);
		});
	}

	/**
	 * Execute a single claim with retry logic
	 * @param {Object} claim - Claim object
	 * @returns {Promise<Object>} Execution result
	 */
	async executeClaim(claim) {
		this.activeExecutions.add(claim.id);
		const startTime = Date.now();

		let lastError;
		for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
			try {
				const result = await Promise.race([
					claim.validator(),
					this.createTimeoutPromise(this.config.timeoutMs),
				]);

				const executionResult = {
					claimId: claim.id,
					status: "passed",
					result,
					attempt,
					duration: Date.now() - startTime,
					timestamp: new Date(),
				};

				this.results.set(claim.id, executionResult);
				this.emit("claim:passed", executionResult);
				this.activeExecutions.delete(claim.id);
				return executionResult;
			} catch (error) {
				lastError = error;
				if (attempt < this.config.retryAttempts) {
					this.emit("claim:retry", {
						claimId: claim.id,
						attempt,
						error: error.message,
					});
				}
			}
		}

		// All retries exhausted
		const failureResult = {
			claimId: claim.id,
			status: "failed",
			error: lastError?.message || "Unknown error",
			attempts: this.config.retryAttempts + 1,
			duration: Date.now() - startTime,
			timestamp: new Date(),
		};

		this.results.set(claim.id, failureResult);
		this.emit("claim:failed", failureResult);
		this.activeExecutions.delete(claim.id);
		return failureResult;
	}

	/**
	 * Create a timeout promise
	 * @param {number} ms - Timeout in milliseconds
	 * @returns {Promise}
	 */
	createTimeoutPromise(ms) {
		return new Promise((_, reject) =>
			setTimeout(() => reject(new Error(`Claim execution timeout after ${ms}ms`)), ms)
		);
	}

	/**
	 * Get test results summary
	 * @returns {Object} Summary statistics
	 */
	getSummary() {
		const results = Array.from(this.results.values());
		const passed = results.filter((r) => r.status === "passed").length;
		const failed = results.filter((r) => r.status === "failed").length;
		const pending = this.claims.size - results.length;

		return {
			total: this.claims.size,
			passed,
			failed,
			pending,
			passRate: this.claims.size > 0 ? ((passed / this.claims.size) * 100).toFixed(2) + "%" : "N/A",
			results: Object.fromEntries(this.results),
		};
	}

	/**
	 * Reset runner state
	 */
	reset() {
		this.claims.clear();
		this.results.clear();
		this.activeExecutions.clear();
	}
}

module.exports = {
	ClaimTestRunner,
};
