/**
 * Prompt builders for the visual summary generator.
 *
 * Constructs image generation prompts and the Visual Presenter HTML prompt
 * from agent run task outputs.
 */

/**
 * Extracts a short thematic description from task outputs for image generation.
 * Returns 1-2 image prompts based on the overall plan theme.
 */
function buildImagePrompts(run) {
	const planTitle = run.plan?.title || "Project Summary";
	const planDescription = run.plan?.description || "";
	const taskLabels = (run.tasks || [])
		.filter((task) => task.status === "done" && task.output)
		.map((task) => task.label)
		.slice(0, 6);

	const taskContext = taskLabels.length > 0
		? `The work covered: ${taskLabels.join(", ")}.`
		: "";

	const heroPrompt = [
		`Generate a professional, visually striking illustration for a project summary page.`,
		`The project is titled "${planTitle}".`,
		planDescription ? `Description: ${planDescription}` : null,
		taskContext,
		`Create an abstract, modern illustration that visually represents this work.`,
		`Use bold colors and clean geometric shapes. The image should work as a hero banner.`,
		`Do not include any text or words in the image.`,
	]
		.filter(Boolean)
		.join(" ");

	return [heroPrompt];
}

/**
 * Builds the prompt for the Visual Presenter agent to create a self-contained
 * HTML page from the run's task outputs and optional embedded images.
 *
 * @param {object} run - The agent run object
 * @param {Array<{ mimeType: string, dataUrl: string }>} images - Base64 data URL images
 * @param {string} textSummary - The plain text summary content
 * @param {string} skillContent - The frontend-design skill instructions
 * @returns {string} The prompt string
 */
function buildVisualPresenterPrompt(run, images, textSummary, skillContent) {
	const planTitle = run.plan?.title || "Project Summary";
	const planEmoji = run.plan?.emoji || "";
	const planDescription = run.plan?.description || "";

	const taskSections = (run.tasks || [])
		.filter((task) => task.status === "done" && task.output)
		.map((task) => {
			const output = task.output.trim();
			const truncated = output.length > 1500
				? `${output.slice(0, 1500)}...`
				: output;
			return `### ${task.label} (by ${task.agentName})\n${truncated}`;
		})
		.join("\n\n---\n\n");

	const imageSection = images.length > 0
		? [
			"## Available Images",
			"The following images have been generated for you to use in the page.",
			"Embed them using <img> tags with the exact src data URLs provided.",
			"",
			...images.map(
				(img, i) => `Image ${i + 1} (${img.mimeType}): src="${img.dataUrl}"`
			),
		].join("\n")
		: "No images were generated. Create the page without images, using CSS-only decorative elements instead.";

	return [
		skillContent ? `## Design Skill\n\n${skillContent}\n` : null,
		"## Your Task",
		"",
		"Create a single, self-contained HTML page that presents a visual summary of completed work.",
		"The page must be a complete HTML document with all CSS inlined in a <style> tag.",
		"Do NOT use any external resources (no CDN links, no external fonts, no external images).",
		"Do NOT include any JavaScript.",
		"",
		`## Project: ${planEmoji} ${planTitle}`,
		planDescription ? `\n${planDescription}\n` : "",
		"## Text Summary",
		"",
		textSummary || "No text summary available.",
		"",
		"## Task Outputs",
		"",
		taskSections || "No task outputs available.",
		"",
		imageSection,
		"",
		"## Requirements",
		"",
		"1. Output ONLY the HTML document. No markdown fences, no explanation, just the raw HTML.",
		"2. The page should be visually striking and professional.",
		"3. Use a clear visual hierarchy: hero section, key findings, detailed outcomes.",
		"4. If images are provided, use them prominently (hero banner, section illustrations).",
		"5. Use modern CSS (flexbox, grid, custom properties) for layout.",
		"6. Include proper semantic HTML (headings, sections, articles).",
		"7. Design for a max-width of ~960px, centered on the page.",
		"8. Ensure the page looks good in both light and dark backgrounds (use its own background).",
		"9. Synthesize the content — don't just dump raw task outputs. Create a cohesive narrative.",
		"10. Include a subtle footer with the project title and generation date.",
	]
		.filter((line) => line !== null)
		.join("\n");
}

module.exports = {
	buildImagePrompts,
	buildVisualPresenterPrompt,
};
