import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's strip-types test runner requires the explicit .ts extension here.
import { buildBackendUrlCandidates } from "./backend-url.ts";

test("buildBackendUrlCandidates keeps the reserved backend port behind a stale recorded port", () => {
	assert.deepEqual(
		buildBackendUrlCandidates({
			recordedPort: 8081,
			reservedPort: 8080,
		}),
		["http://localhost:8081", "http://localhost:8080"],
	);
});

test("buildBackendUrlCandidates preserves env overrides ahead of port-file candidates", () => {
	assert.deepEqual(
		buildBackendUrlCandidates({
			backendUrlEnv: "http://remote.example",
			backendPortEnv: 8090,
			recordedPort: 8081,
			reservedPort: 8080,
		}),
		[
			"http://remote.example",
			"http://localhost:8090",
			"http://localhost:8081",
			"http://localhost:8080",
		],
	);
});
