#!/usr/bin/env node
/**
 * Creates .env.local from .asap-config
 * Usage: node create-env-local.js <use-case-id> [email]
 *        use-case-id: REQUIRED - Your AI Gateway use case ID
 *        email: Optional - defaults to git config user.email
 */

const fs = require('fs');
const { execSync } = require('child_process');

function getEnvValueFromText(envText, key) {
	if (!envText || typeof envText !== 'string') {
		return null;
	}

	const pattern = new RegExp(`^\\s*${key}\\s*=\\s*(.+)$`, 'm');
	const match = envText.match(pattern);
	if (!match || !match[1]) {
		return null;
	}

	return match[1].trim();
}

// Get use case ID from args (REQUIRED)
const useCaseId = process.argv[2];
if (!useCaseId) {
	console.error('❌ Use case ID is required. Usage:');
	console.error('   node create-env-local.js <use-case-id> [email]');
	console.error('');
	console.error('Example:');
	console.error('   node create-env-local.js my-use-case your-email@atlassian.com');
	process.exit(1);
}

// Get email from args or git config
let email = process.argv[3];
if (!email) {
	try {
		email = execSync('git config user.email', { encoding: 'utf8' }).trim();
	} catch {
		console.error('❌ Could not determine email. Please provide as argument:');
		console.error('   node create-env-local.js ' + useCaseId + ' your-email@atlassian.com');
		process.exit(1);
	}
}

// Check for .asap-config
if (!fs.existsSync('.asap-config')) {
	console.error('❌ .asap-config not found. Generate it first with:');
	console.error('   TIMESTAMP=$(date +%s)');
	console.error('   atlas asap key generate --key ' + useCaseId + '/$TIMESTAMP --file .asap-config');
	process.exit(1);
}

const config = JSON.parse(fs.readFileSync('.asap-config', 'utf8'));
const escaped = config.privateKey.replace(/\n/g, '\\n');
const existingEnvText = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';
const preservedGoogleUrl = getEnvValueFromText(existingEnvText, 'AI_GATEWAY_URL_GOOGLE');
const preservedFallbackFlag = getEnvValueFromText(existingEnvText, 'AUTO_FALLBACK_TO_AI_GATEWAY');
const preservedRovodevPoolSize = getEnvValueFromText(existingEnvText, 'ROVODEV_POOL_SIZE');
const preservedOpenaiModel = getEnvValueFromText(existingEnvText, 'OPENAI_MODEL');
const preservedGoogleImageModel = getEnvValueFromText(existingEnvText, 'GOOGLE_IMAGE_MODEL');
const preservedGoogleTtsModel = getEnvValueFromText(existingEnvText, 'GOOGLE_TTS_MODEL');
const preservedDebug = getEnvValueFromText(existingEnvText, 'DEBUG');
const preservedPort = getEnvValueFromText(existingEnvText, 'PORT');
const preservedBackendUrl = getEnvValueFromText(existingEnvText, 'BACKEND_URL');
const preservedPublicApiUrl = getEnvValueFromText(existingEnvText, 'NEXT_PUBLIC_API_URL');

const envContent = `# AI Gateway Configuration
# Default: Claude via Bedrock (to switch to OpenAI, see guide-model-switch.md)
# Claude: /v1/bedrock/model/{MODEL_ID}/invoke-with-response-stream
# OpenAI: /v1/openai/v1/chat/completions
AI_GATEWAY_URL=https://ai-gateway.us-east-1.staging.atl-paas.net/v1/bedrock/model/anthropic.claude-haiku-4-5-20251001-v1:0/invoke-with-response-stream

# OpenAI model ID (used when AI_GATEWAY_URL points to an OpenAI endpoint)
${preservedOpenaiModel ? `OPENAI_MODEL=${preservedOpenaiModel}` : '# OPENAI_MODEL=gpt-5.2-2025-12-11'}

# Google/Gemini endpoint (for provider: "google" chat/image requests and Google TTS route derivation)
${preservedGoogleUrl ? `AI_GATEWAY_URL_GOOGLE=${preservedGoogleUrl}` : '# AI_GATEWAY_URL_GOOGLE=https://ai-gateway.us-east-1.staging.atl-paas.net/v1/google/publishers/google/v1/chat/completions'}
${preservedGoogleImageModel ? `GOOGLE_IMAGE_MODEL=${preservedGoogleImageModel}` : '# GOOGLE_IMAGE_MODEL=gemini-3-pro-image-preview'}
${preservedGoogleTtsModel ? `GOOGLE_TTS_MODEL=${preservedGoogleTtsModel}` : '# GOOGLE_TTS_MODEL=tts-latest'}

AI_GATEWAY_USE_CASE_ID=${useCaseId}
AI_GATEWAY_CLOUD_ID=local-testing
AI_GATEWAY_USER_ID=${email}

# ASAP Credentials (Required for AI Gateway fallback and production)
ASAP_PRIVATE_KEY="${escaped}"
ASAP_KID=${config.kid}
ASAP_ISSUER=${config.issuer}

# Auto-fallback to AI Gateway when RovoDev Serve is unavailable${preservedFallbackFlag ? `\nAUTO_FALLBACK_TO_AI_GATEWAY=${preservedFallbackFlag}` : '\n# AUTO_FALLBACK_TO_AI_GATEWAY=true'}

# RovoDev Serve pool size (number of concurrent RovoDev instances for agents team, default: 6)${preservedRovodevPoolSize ? `\nROVODEV_POOL_SIZE=${preservedRovodevPoolSize}` : '\n# ROVODEV_POOL_SIZE=6'}

# Frontend configuration (for production builds)
# NEXT_PUBLIC_API_URL=https://your-service-name.us-west-2.platdev.atl-paas.net${preservedPublicApiUrl ? `\nNEXT_PUBLIC_API_URL=${preservedPublicApiUrl}` : ''}
${preservedDebug ? `\nDEBUG=${preservedDebug}` : ''}${preservedPort ? `\nPORT=${preservedPort}` : ''}${preservedBackendUrl ? `\nBACKEND_URL=${preservedBackendUrl}` : ''}
`;

fs.writeFileSync('.env.local', envContent);
console.log('✅ Created .env.local with AI Gateway configuration (Claude/Bedrock default)');
console.log(`   AI_GATEWAY_USE_CASE_ID: ${useCaseId}`);
console.log(`   AI_GATEWAY_USER_ID: ${email}`);
console.log('');
console.log('💡 To enable AI Gateway fallback, uncomment AUTO_FALLBACK_TO_AI_GATEWAY=true in .env.local');
console.log('💡 To switch default model, see: .cursor/skills/vpk-setup/references/guide-model-switch.md');
console.log('💡 To enable Google image + voice routing, uncomment AI_GATEWAY_URL_GOOGLE in .env.local');
