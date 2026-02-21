const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createOrchestratorLog } = require("./orchestrator-log");

test("append persists rovoPort when provided", () => {
	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "orchestrator-log-"));
	const log = createOrchestratorLog({
		baseDir: tempDir,
		logger: {
			info: () => {},
			warn: () => {},
		},
	});

	log.append({
		portIndex: 1,
		rovoPort: 8001,
		userMessage: "what port are you on?",
		assistantResponse: "8001",
	});

	const entries = log.getEntries();
	assert.equal(entries.length, 1);
	assert.equal(entries[0].portIndex, 1);
	assert.equal(entries[0].rovoPort, 8001);

	const persisted = fs
		.readFileSync(path.join(tempDir, "orchestrator-log.jsonl"), "utf8")
		.trim()
		.split("\n")
		.map((line) => JSON.parse(line));
	assert.equal(persisted[0].rovoPort, 8001);

	fs.rmSync(tempDir, { recursive: true, force: true });
});

test("append keeps backward compatibility when rovoPort is omitted", () => {
	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "orchestrator-log-"));
	const log = createOrchestratorLog({
		baseDir: tempDir,
		logger: {
			info: () => {},
			warn: () => {},
		},
	});

	log.append({
		portIndex: 0,
		userMessage: "hi",
		assistantResponse: "hello",
	});

	const entry = log.getEntries()[0];
	assert.equal(entry.portIndex, 0);
	assert.equal(entry.rovoPort, undefined);

	fs.rmSync(tempDir, { recursive: true, force: true });
});
