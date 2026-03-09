import fs from 'node:fs';
import path from 'node:path';
import * as worktreePorts from "../../../scripts/lib/worktree-ports.js";

const DEFAULT_BACKEND_PORT = 8080;
const DEFAULT_BACKEND_URL = 'http://localhost:8080';
const PORT_FILE = path.join(process.cwd(), '.dev-backend-port');

export interface BackendUrlCandidateOptions {
	backendPortEnv?: number | string | null;
	backendUrlEnv?: string | null;
	recordedPort?: number | string | null;
	reservedPort?: number | string | null;
}

function getNonEmptyString(value: string | null | undefined): string | null {
	if (typeof value !== "string") {
		return null;
	}

	const trimmedValue = value.trim();
	return trimmedValue.length > 0 ? trimmedValue : null;
}

function parsePort(value: number | string | null | undefined): number | null {
	if (typeof value === "number" && Number.isFinite(value) && value > 0) {
		return value;
	}

	if (typeof value !== "string") {
		return null;
	}

	const parsedPort = Number.parseInt(value.trim(), 10);
	return Number.isNaN(parsedPort) || parsedPort <= 0 ? null : parsedPort;
}

function buildBackendUrlFromPort(port: number | null): string | null {
	return typeof port === "number" ? `http://localhost:${port}` : null;
}

function dedupeUrls(urls: Array<string | null>): string[] {
	return urls.filter((url, index, array): url is string => {
		return typeof url === "string" && array.indexOf(url) === index;
	});
}

function getBackendPortFromPortFile(): number | null {
	try {
		const rawPort = fs.readFileSync(PORT_FILE, 'utf8').trim();
		return parsePort(rawPort);
	} catch {
		return null;
	}
}

function getReservedBackendPort(): number | null {
	try {
		const portInfo = worktreePorts.getPortInfo?.();
		return parsePort(portInfo?.backendBase ?? null);
	} catch {
		return null;
	}
}

export function buildBackendUrlCandidates(
	options: Readonly<BackendUrlCandidateOptions> = {},
): string[] {
	return dedupeUrls([
		getNonEmptyString(options.backendUrlEnv),
		buildBackendUrlFromPort(parsePort(options.backendPortEnv)),
		buildBackendUrlFromPort(parsePort(options.recordedPort)),
		buildBackendUrlFromPort(parsePort(options.reservedPort)),
		DEFAULT_BACKEND_URL,
	]);
}

export function getBackendUrlCandidates(): string[] {
	return buildBackendUrlCandidates({
		backendUrlEnv: process.env.BACKEND_URL ?? null,
		backendPortEnv: process.env.BACKEND_PORT ?? null,
		recordedPort: getBackendPortFromPortFile(),
		reservedPort: getReservedBackendPort() ?? DEFAULT_BACKEND_PORT,
	});
}

export function getBackendUrl(): string {
	return getBackendUrlCandidates()[0] ?? DEFAULT_BACKEND_URL;
}

export class BackendConnectionError extends Error {
	backendUrls: string[];
	override cause: unknown;

	constructor(backendUrls: string[], cause: unknown) {
		super("Cannot connect to backend server");
		this.name = "BackendConnectionError";
		this.backendUrls = backendUrls;
		this.cause = cause;
	}
}

export async function fetchBackend(
	backendPath: string,
	init?: RequestInit,
): Promise<{ backendUrl: string; response: Response }> {
	const backendUrls = getBackendUrlCandidates();
	let lastError: unknown = new Error("Backend request failed");

	for (const backendUrl of backendUrls) {
		try {
			const response = await fetch(`${backendUrl}${backendPath}`, init);
			return { backendUrl, response };
		} catch (error) {
			if (error instanceof Error && error.name === "AbortError") {
				throw error;
			}

			lastError = error;
		}
	}

	throw new BackendConnectionError(backendUrls, lastError);
}
