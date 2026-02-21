/**
 * Strict RovoDev port assignment for multi-panel chat surfaces.
 *
 * This module centralizes deterministic mapping between panel index and
 * the exact RovoDev serve port so backend routing and prompt context stay aligned.
 */
const fs = require("node:fs");
const path = require("node:path");

const STRICT_ROVODEV_PORTS = Object.freeze([8000, 8001, 8002]);
const PANEL_LABELS = Object.freeze(["A", "B", "C"]);
const ROVODEV_PORTS_FILE = path.join(__dirname, "..", "..", ".dev-rovodev-ports");

function normalizePortList(value) {
	if (!Array.isArray(value)) {
		return [];
	}

	const uniquePorts = [];
	for (const item of value) {
		if (typeof item !== "number" || !Number.isInteger(item) || item <= 0) {
			continue;
		}

		if (!uniquePorts.includes(item)) {
			uniquePorts.push(item);
		}
	}

	return uniquePorts;
}

function readActiveRovoDevPorts() {
	try {
		if (!fs.existsSync(ROVODEV_PORTS_FILE)) {
			return [];
		}

		const parsed = JSON.parse(fs.readFileSync(ROVODEV_PORTS_FILE, "utf8").trim());
		if (!Array.isArray(parsed)) {
			return [];
		}

		return normalizePortList(parsed);
	} catch {
		return [];
	}
}

function assertValidPortIndex(portIndex) {
	if (!Number.isInteger(portIndex) || portIndex < 0) {
		const error = new Error("portIndex must be a non-negative integer");
		error.code = "INVALID_ROVODEV_PORT_INDEX";
		throw error;
	}
}

/**
 * Resolve all candidate ports for a panel index.
 *
 * With a standard 3-panel UI and 6 active ports, panel assignments become:
 *   index 0 -> [8000, 8003]
 *   index 1 -> [8001, 8004]
 *   index 2 -> [8002, 8005]
 *
 * @param {number} portIndex
 * @param {{ activePorts?: number[] }} [options]
 * @returns {number[]}
 */
function resolveStrictRovoDevPortCandidates(portIndex, options = {}) {
	assertValidPortIndex(portIndex);

	const hasExplicitActivePorts = Object.prototype.hasOwnProperty.call(
		options,
		"activePorts"
	);
	const normalizedActivePorts = normalizePortList(options.activePorts);
	const activePorts =
		hasExplicitActivePorts
			? normalizedActivePorts
			: readActiveRovoDevPorts();
	const fallbackPorts =
		activePorts.length > 0 ? activePorts : Array.from(STRICT_ROVODEV_PORTS);
	if (fallbackPorts.length === 0) {
		const error = new Error(
			`Unsupported portIndex ${portIndex}. No active RovoDev ports are available.`
		);
		error.code = "INVALID_ROVODEV_PORT_INDEX";
		throw error;
	}

	const panelCount = PANEL_LABELS.length;
	const panelShardPorts = fallbackPorts.filter(
		(_, index) => index % panelCount === portIndex % panelCount
	);
	const fallbackPort = fallbackPorts[portIndex % fallbackPorts.length];
	return normalizePortList(
		panelShardPorts.length > 0 ? panelShardPorts : [fallbackPort]
	);
}

function buildPoolStatusMap(poolStatus) {
	if (!poolStatus || typeof poolStatus !== "object") {
		return new Map();
	}

	if (!Array.isArray(poolStatus.ports)) {
		return new Map();
	}

	const statusMap = new Map();
	for (const entry of poolStatus.ports) {
		if (!entry || typeof entry !== "object") {
			continue;
		}

		const port = entry.port;
		if (typeof port !== "number" || !Number.isInteger(port) || port <= 0) {
			continue;
		}

		const status =
			typeof entry.status === "string" && entry.status.trim().length > 0
				? entry.status.trim().toLowerCase()
				: "unknown";
		statusMap.set(port, status);
	}

	return statusMap;
}

function pickPreferredCandidatePort(candidatePorts, poolStatus) {
	if (!Array.isArray(candidatePorts) || candidatePorts.length === 0) {
		return null;
	}

	const statusMap = buildPoolStatusMap(poolStatus);
	if (statusMap.size === 0) {
		return candidatePorts[0];
	}

	const availableCandidate = candidatePorts.find(
		(port) => statusMap.get(port) === "available"
	);
	if (typeof availableCandidate === "number") {
		return availableCandidate;
	}

	const nonUnhealthyCandidate = candidatePorts.find(
		(port) => statusMap.get(port) !== "unhealthy"
	);
	if (typeof nonUnhealthyCandidate === "number") {
		return nonUnhealthyCandidate;
	}

	return candidatePorts[0];
}

/**
 * Resolve strict assignment for a sticky panel index.
 *
 * @param {number} portIndex - Zero-based panel index.
 * @param {{ activePorts?: number[]; poolStatus?: { ports?: Array<{ port: number; status: string }> } }} [options]
 * @returns {{ portIndex: number; rovoPort: number; panelLabel: string; candidatePorts: number[] }}
 */
function resolveStrictRovoDevPortAssignment(portIndex, options = {}) {
	const candidatePorts = resolveStrictRovoDevPortCandidates(portIndex, {
		activePorts: options.activePorts,
	});
	const rovoPort = pickPreferredCandidatePort(candidatePorts, options.poolStatus);
	if (typeof rovoPort !== "number") {
		const error = new Error(
			`Unsupported portIndex ${portIndex}. No RovoDev port could be resolved.`
		);
		error.code = "INVALID_ROVODEV_PORT_INDEX";
		throw error;
	}

	return {
		portIndex,
		rovoPort,
		panelLabel: PANEL_LABELS[portIndex] ?? String(portIndex),
		candidatePorts,
	};
}

/**
 * Build a context block that tells the model the exact bound RovoDev port.
 *
 * @param {{ portIndex: number; rovoPort: number; panelLabel: string }} assignment
 * @returns {string}
 */
function buildRovoDevPortBindingInstruction(assignment) {
	return [
		"[RovoDev Port Binding]",
		`This chat panel is pinned to RovoDev port ${assignment.rovoPort} (panel ${assignment.panelLabel}, index ${assignment.portIndex}).`,
		`If asked which RovoDev port you are using, respond with exactly: ${assignment.rovoPort}`,
		"Do not claim a different RovoDev port for this panel.",
		"[End RovoDev Port Binding]",
	].join("\n");
}

module.exports = {
	STRICT_ROVODEV_PORTS,
	resolveStrictRovoDevPortCandidates,
	resolveStrictRovoDevPortAssignment,
	buildRovoDevPortBindingInstruction,
};
