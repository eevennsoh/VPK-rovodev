import { execFile } from "node:child_process";
import { resolve } from "node:path";

const BIN = resolve(
	"node_modules",
	".bin",
	"agent-browser",
);

function run(args: string[]): Promise<string> {
	return new Promise((resolve, reject) => {
		execFile(BIN, args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
			if (err) {
				reject(new Error(`agent-browser ${args[0]} failed: ${stderr || err.message}`));
				return;
			}
			resolve(stdout.trim());
		});
	});
}

export class AgentBrowser {
	private installed = false;

	/** Ensure Chromium is installed (runs once). */
	async ensureInstalled(): Promise<void> {
		if (this.installed) return;
		await run(["install"]);
		this.installed = true;
	}

	/** Navigate to a URL. */
	async open(url: string): Promise<string> {
		await this.ensureInstalled();
		return run(["open", url]);
	}

	/** Return the accessibility tree snapshot. */
	async snapshot(): Promise<string> {
		return run(["snapshot"]);
	}

	/** Click an element by accessibility ref (e.g. "@e1"). */
	async click(ref: string): Promise<string> {
		return run(["click", ref]);
	}

	/** Fill a text field by accessibility ref. */
	async fill(ref: string, text: string): Promise<string> {
		return run(["fill", ref, text]);
	}

	/** Take a screenshot. Optionally provide a file path. */
	async screenshot(path?: string): Promise<string> {
		const args = ["screenshot"];
		if (path) args.push(path);
		return run(args);
	}

	/** Evaluate a JS expression on the page. */
	async eval(js: string): Promise<string> {
		return run(["eval", js]);
	}

	/** Get the page title. */
	async getTitle(): Promise<string> {
		return run(["get", "title"]);
	}

	/** Get the current URL. */
	async getUrl(): Promise<string> {
		return run(["get", "url"]);
	}

	/** Get text content of an element by accessibility ref. */
	async getText(ref: string): Promise<string> {
		return run(["get", "text", ref]);
	}

	/** Close the browser. */
	async close(): Promise<string> {
		return run(["close"]);
	}
}
