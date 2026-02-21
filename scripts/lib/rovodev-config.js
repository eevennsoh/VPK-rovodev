const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const resolveRovodevConfigPath = () => {
	const ymlPath = path.join(os.homedir(), ".rovodev", "config.yml");
	if (fs.existsSync(ymlPath)) {
		return ymlPath;
	}

	const yamlPath = path.join(os.homedir(), ".rovodev", "config.yaml");
	if (fs.existsSync(yamlPath)) {
		return yamlPath;
	}

	return ymlPath;
};

const dedupeAllowedMcpServersInConfig = () => {
	const configPath = resolveRovodevConfigPath();
	if (!fs.existsSync(configPath)) {
		return { configPath, exists: false, changed: false, removed: 0 };
	}

	const original = fs.readFileSync(configPath, "utf8");
	const lines = original.split(/\r?\n/);
	const output = [];

	let inAllowedList = false;
	let allowedIndent = 0;
	let removed = 0;
	let seen = new Set();

	for (const line of lines) {
		if (!inAllowedList) {
			const startMatch = line.match(/^(\s*)allowedMcpServers:\s*$/);
			if (startMatch) {
				inAllowedList = true;
				allowedIndent = startMatch[1].length;
				seen = new Set();
			}

			output.push(line);
			continue;
		}

		const indent = (line.match(/^\s*/) || [""])[0].length;
		const trimmed = line.trim();
		const listMatch = trimmed.match(/^-\s+(.+)$/);
		const isContinuationLine = indent > allowedIndent;
		const isAlignedListItem = indent >= allowedIndent && listMatch;

		if (isContinuationLine || isAlignedListItem) {
			if (listMatch) {
				const signature = listMatch[1].trim();
				if (seen.has(signature)) {
					removed += 1;
					continue;
				}
				seen.add(signature);
			}

			output.push(line);
			continue;
		}

		// Current line is not nested under allowedMcpServers anymore.
		inAllowedList = false;
		output.push(line);
	}

	const normalized = output.join("\n");
	const changed = removed > 0 && normalized !== original;

	if (changed) {
		fs.writeFileSync(configPath, normalized, "utf8");
	}

	return {
		configPath,
		exists: true,
		changed,
		removed,
	};
};

module.exports = {
	resolveRovodevConfigPath,
	dedupeAllowedMcpServersInConfig,
};
