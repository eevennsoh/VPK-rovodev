/**
 * Visual summary generator for agent team runs.
 *
 * Generates a self-contained HTML page summarizing agent run outputs,
 * optionally with AI-generated images embedded as base64 data URLs.
 *
 * Pipeline:
 * 1. Generate 1-2 images via Google/Gemini (if configured)
 * 2. Feed task outputs + images into Visual Presenter prompt
 * 3. Visual Presenter creates self-contained HTML page
 * 4. Persist to disk
 */

const fs = require("node:fs/promises");
const path = require("node:path");
const { buildImagePrompts, buildVisualPresenterPrompt } = require("./visual-summary-prompts");
const { generateTextViaRovoDev } = require("./rovodev-gateway");

function toIsoDate() {
	return new Date().toISOString();
}

/**
 * Generates images via Google/Gemini endpoint.
 * Returns an array of { mimeType, dataUrl } objects.
 * Returns empty array if Google endpoint is not configured or generation fails.
 *
 * @param {object} options
 * @param {object} options.run - The agent run object
 * @param {object} [options.logger] - Logger instance
 * @returns {Promise<Array<{ mimeType: string, dataUrl: string }>>}
async function generateImages({ run, logger = console }) {
	// Image generation disabled in RovoDev-only mode
	logger.info?.("[VISUAL-SUMMARY] Image generation disabled in RovoDev-only mode");
	return [];
}
}

/**
 * Generates the HTML page via the Visual Presenter prompt.
 * Uses the default AI gateway (typically Bedrock/Claude for HTML generation quality).
 *
 * @param {object} options
 * @param {object} options.run - The agent run object
 * @param {Array<{ mimeType: string, dataUrl: string }>} options.images - Generated images
 * @param {string} options.textSummary - The plain text summary
 * @param {string|null} options.skillContent - The frontend-design skill content
 * @param {function} options.getEnvVarsFn - Function to get env vars
 * @param {object} [options.logger] - Logger instance
 * @returns {Promise<string>} The generated HTML
 */
async function generateHtmlPage({ run, images, textSummary, skillContent, logger = console }) {
	logger.info?.(`[VISUAL-SUMMARY] Generating HTML page (${images.length} image(s), ${textSummary.length} chars text summary)`);
	const prompt = buildVisualPresenterPrompt(run, images, textSummary, skillContent);

	// Use RovoDev Serve for visual summary generation
	const fullText = await generateTextViaRovoDev({
		system: "You are a senior frontend designer and developer. You create distinctive, polished interfaces that avoid generic aesthetics. Output ONLY raw HTML — no markdown fences, no explanation.",
		prompt,
	});

	return cleanHtmlOutput(fullText.trim());
}

/**
 * Cleans the HTML output by removing markdown code fences if present.
 */
function cleanHtmlOutput(html) {
	let cleaned = html.trim();

	// Remove markdown code fences
	if (cleaned.startsWith("```html")) {
		cleaned = cleaned.slice(7);
	} else if (cleaned.startsWith("```")) {
		cleaned = cleaned.slice(3);
	}
	if (cleaned.endsWith("```")) {
		cleaned = cleaned.slice(0, -3);
	}

	cleaned = cleaned.trim();

	// Ensure it starts with <!DOCTYPE or <html
	if (!cleaned.toLowerCase().startsWith("<!doctype") && !cleaned.toLowerCase().startsWith("<html")) {
		// Try to find the start of the HTML document
		const doctypeIndex = cleaned.toLowerCase().indexOf("<!doctype");
		const htmlIndex = cleaned.toLowerCase().indexOf("<html");
		const startIndex = doctypeIndex >= 0 ? doctypeIndex : htmlIndex;
		if (startIndex > 0) {
			cleaned = cleaned.slice(startIndex);
		}
	}

	return cleaned;
}

/**
 * Main entry point: generates a visual summary for an agent run.
 *
 * @param {object} options
 * @param {object} options.run - The completed agent run
 * @param {string} options.runDir - The run's persistence directory
 * @param {object} options.configManager - The agent config manager (for resolving skills)
 * @param {function} options.getEnvVarsFn - Function to get env vars
 * @param {object} [options.logger] - Logger instance
 * @returns {Promise<{ html: string, hasImages: boolean, createdAt: string } | null>}
 */
async function generateVisualSummary({ run, runDir, configManager, getEnvVarsFn, logger = console }) {
	logger.info?.(`[VISUAL-SUMMARY] Starting visual summary generation for run ${run.id || run.runId}`);

	// Resolve the Visual Presenter's frontend-design skill content
	let skillContent = null;
	if (configManager) {
		const agents = configManager.listAgents();
		const visualPresenter = agents.find(
			(a) => a.name.toLowerCase() === "visual presenter"
		);
		if (visualPresenter && Array.isArray(visualPresenter.equippedSkills) && visualPresenter.equippedSkills.length > 0) {
			const resolvedSkills = configManager.resolveSkillContents(visualPresenter.equippedSkills);
			if (resolvedSkills.length > 0) {
				skillContent = resolvedSkills.map((s) => `### ${s.name}\n${s.content}`).join("\n\n");
			}
		}
	}

	// Get the text summary content
	const textSummary = run.summary?.content || "";

	// Step 1: Generate images (graceful degradation)
	let images = [];
	try {
		images = await generateImages({ run, logger });
	} catch (error) {
		logger.warn?.("[VISUAL-SUMMARY] Image generation phase failed entirely, continuing without images", error);
	}

	// Step 2: Generate HTML page
	let html;
	try {
		html = await generateHtmlPage({
			run,
			images,
			textSummary,
			skillContent,
			getEnvVarsFn,
			logger,
		});
	} catch (error) {
		logger.error?.("[VISUAL-SUMMARY] HTML generation failed", error);
		return null;
	}

	if (!html || html.length < 50) {
		logger.warn?.("[VISUAL-SUMMARY] Generated HTML is too short, discarding");
		return null;
	}

	// Step 3: Persist to disk
	const visualSummaryPath = path.join(runDir, "visual-summary.html");
	try {
		await fs.mkdir(runDir, { recursive: true });
		await fs.writeFile(visualSummaryPath, html, "utf8");
		logger.info?.(`[VISUAL-SUMMARY] Wrote visual summary to ${visualSummaryPath} (${html.length} chars)`);
	} catch (error) {
		logger.error?.("[VISUAL-SUMMARY] Failed to persist visual summary HTML", error);
		// Continue — we still have the HTML in memory
	}

	const result = {
		html,
		hasImages: images.length > 0,
		createdAt: toIsoDate(),
	};

	// Also persist metadata JSON
	try {
		const metadataPath = path.join(runDir, "visual-summary.json");
		await fs.writeFile(
			metadataPath,
			JSON.stringify({ hasImages: result.hasImages, createdAt: result.createdAt, htmlLength: html.length }, null, 2),
			"utf8"
		);
	} catch {
		// Non-critical
	}

	return result;
}

/**
 * Loads a visual summary from disk for a given run directory.
 *
 * @param {string} runDir - The run's persistence directory
 * @returns {Promise<{ html: string, hasImages: boolean, createdAt: string } | null>}
 */
async function loadVisualSummaryFromDisk(runDir) {
	const htmlPath = path.join(runDir, "visual-summary.html");
	const metadataPath = path.join(runDir, "visual-summary.json");

	try {
		const html = await fs.readFile(htmlPath, "utf8");
		if (!html || html.length < 50) {
			return null;
		}

		let hasImages = false;
		let createdAt = toIsoDate();
		try {
			const raw = await fs.readFile(metadataPath, "utf8");
			const metadata = JSON.parse(raw);
			if (typeof metadata.hasImages === "boolean") {
				hasImages = metadata.hasImages;
			}
			if (typeof metadata.createdAt === "string") {
				createdAt = metadata.createdAt;
			}
		} catch {
			// Metadata is optional
		}

		return { html, hasImages, createdAt };
	} catch {
		return null;
	}
}

module.exports = {
	generateVisualSummary,
	loadVisualSummaryFromDisk,
	cleanHtmlOutput,
};
