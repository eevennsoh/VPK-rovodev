import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_BACKEND_URL = 'http://localhost:8080';
const PORT_FILE = path.join(process.cwd(), '.dev-backend-port');

function getBackendUrlFromPortFile(): string | null {
	try {
		const rawPort = fs.readFileSync(PORT_FILE, 'utf8').trim();
		if (!rawPort) {
			return null;
		}
		return `http://localhost:${rawPort}`;
	} catch {
		return null;
	}
}

export function getBackendUrl(): string {
	if (process.env.BACKEND_URL) {
		return process.env.BACKEND_URL;
	}

	if (process.env.BACKEND_PORT) {
		return `http://localhost:${process.env.BACKEND_PORT}`;
	}

	return getBackendUrlFromPortFile() ?? DEFAULT_BACKEND_URL;
}
