import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
	...nextVitals,
	...nextTs,
	// Override default ignores of eslint-config-next.
	globalIgnores([
		// Default ignores of eslint-config-next:
		".next/**",
		"out/**",
		"build/**",
		"next-env.d.ts",
		// Generated runtime assets; linting bundled vendor code is noisy and not actionable.
		"public/vad/**",
		"components/ui-ai/**",
		"components/blocks/dashboard/**",
		"components/blocks/sidebar/**",
		"components/blocks/login/**",
	]),
	{
		files: ["**/*.js", "**/*.cjs"],
		rules: {
			"@typescript-eslint/no-require-imports": "off",
		},
	},
]);

export default eslintConfig;
