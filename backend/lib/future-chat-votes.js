const fs = require("node:fs/promises");
const path = require("node:path");

function safeJsonParse(rawValue) {
	try {
		return JSON.parse(rawValue);
	} catch {
		return null;
	}
}

function createFutureChatVoteManager({ baseDir }) {
	const votesRootDir = path.join(baseDir, "future-chat", "votes");

	const getThreadVotePath = (threadId) =>
		path.join(votesRootDir, `${encodeURIComponent(threadId)}.json`);

	const readVoteMap = async (threadId) => {
		const filePath = getThreadVotePath(threadId);
		try {
			const raw = await fs.readFile(filePath, "utf8");
			const parsed = safeJsonParse(raw);
			return parsed && typeof parsed === "object" ? parsed : {};
		} catch (error) {
			if (error && error.code === "ENOENT") {
				return {};
			}

			throw error;
		}
	};

	const writeVoteMap = async (threadId, voteMap) => {
		await fs.mkdir(votesRootDir, { recursive: true });
		await fs.writeFile(
			getThreadVotePath(threadId),
			`${JSON.stringify(voteMap, null, 2)}\n`,
			"utf8",
		);
	};

	const listVotes = async (threadId) => {
		const voteMap = await readVoteMap(threadId);
		return Object.entries(voteMap).flatMap(([messageId, direction]) => {
			if (direction !== "up" && direction !== "down") {
				return [];
			}

			return [{
				threadId,
				messageId,
				value: direction,
				isUpvoted: direction === "up",
			}];
		});
	};

	const setVote = async ({ threadId, messageId, value }) => {
		const voteMap = await readVoteMap(threadId);

		if (value !== "up" && value !== "down") {
			delete voteMap[messageId];
		} else {
			voteMap[messageId] = value;
		}

		const hasVotes = Object.keys(voteMap).length > 0;
		if (!hasVotes) {
			await fs.rm(getThreadVotePath(threadId), { force: true });
			return { threadId, messageId, value: null, isUpvoted: null };
		}

		await writeVoteMap(threadId, voteMap);
		return {
			threadId,
			messageId,
			value: value === "up" || value === "down" ? value : null,
			isUpvoted: value === "up" ? true : value === "down" ? false : null,
		};
	};

	const deleteVotesForThread = async (threadId) => {
		await fs.rm(getThreadVotePath(threadId), { force: true });
	};

	const deleteAllVotes = async () => {
		await fs.rm(votesRootDir, { recursive: true, force: true });
	};

	return {
		listVotes,
		setVote,
		deleteVotesForThread,
		deleteAllVotes,
	};
}

module.exports = {
	createFutureChatVoteManager,
};
