const assert = require("node:assert/strict");
const test = require("node:test");

const {
	__test__: {
		buildGenerateContentUrl,
		buildLocalWhisperArgs,
		buildOpenAiCompatibleTranscriptionUrl,
		mimeTypeToFileExtension,
		readPresetConfig,
		resolveConfiguredTranscriptionModel,
		resolveConfiguredTranscriptionProvider,
		resolveGoogleTranscriptionModel,
		hasConfiguredOpenAiCompatibleBaseUrl,
		resolveLocalWhisperModel,
		resolveOpenAiCompatibleTranscriptionModel,
		resolvePresetKey,
		STT_PRESET_ENV_MAP,
		STRICT_TRANSCRIPTION_PROMPT,
	},
} = require("./speech-transcription");

test("buildGenerateContentUrl rewrites Google chat completions to generateContent", () => {
	const result = buildGenerateContentUrl(
		"https://example.test/v1/google/v1/chat/completions",
		"gemini-3-flash-preview",
	);

	assert.equal(
		result,
		"https://example.test/v1/google/v1/publishers/google/models/gemini-3-flash-preview:generateContent",
	);
});

test("STRICT_TRANSCRIPTION_PROMPT forbids answer-like rewrites", () => {
	assert.match(STRICT_TRANSCRIPTION_PROMPT, /verbatim/i);
	assert.match(STRICT_TRANSCRIPTION_PROMPT, /do not answer/i);
	assert.match(STRICT_TRANSCRIPTION_PROMPT, /Create me a page about Apple/);
});

test("resolveGoogleTranscriptionModel uses GOOGLE_STT_MODEL exactly as configured", () => {
	assert.equal(
		resolveGoogleTranscriptionModel("gemini-3-flash-preview"),
		"gemini-3-flash-preview",
	);
	assert.equal(
		resolveGoogleTranscriptionModel("gemini-2.5-flash"),
		"gemini-2.5-flash",
	);
});

test("resolveGoogleTranscriptionModel throws when GOOGLE_STT_MODEL is missing", () => {
	assert.throws(
		() => resolveGoogleTranscriptionModel(""),
		/error: GOOGLE_STT_MODEL must be set/i,
	);
});

test("resolveLocalWhisperModel uses LOCAL_WHISPER_MODEL exactly as configured", () => {
	assert.equal(resolveLocalWhisperModel("tiny"), "tiny");
	assert.equal(resolveLocalWhisperModel("large-v3"), "large-v3");
});

test("resolveLocalWhisperModel throws when LOCAL_WHISPER_MODEL is missing", () => {
	assert.throws(
		() => resolveLocalWhisperModel(""),
		/error: LOCAL_WHISPER_MODEL must be set/i,
	);
});

test("resolveOpenAiCompatibleTranscriptionModel uses OPENAI_COMPATIBLE_STT_MODEL exactly as configured", () => {
	assert.equal(resolveOpenAiCompatibleTranscriptionModel("qwen3-asr"), "qwen3-asr");
});

test("resolvePresetKey normalizes supported env preset names", () => {
	assert.equal(resolvePresetKey("whisper-tiny"), "whisper-tiny");
	assert.equal(resolvePresetKey("QWEN3-ASR"), "qwen3-asr");
	assert.equal(resolvePresetKey("unknown"), null);
});

test("readPresetConfig resolves provider and model from env-mapped preset keys", () => {
	const env = {
		STT_PRESET_WHISPER_TINY_PROVIDER: "local-whisper",
		STT_PRESET_WHISPER_TINY_MODEL: "tiny",
	};

	assert.deepEqual(readPresetConfig(env, "whisper-tiny"), {
		presetKey: "whisper-tiny",
		provider: "local-whisper",
		model: "tiny",
	});
	assert.equal(readPresetConfig(env, null), null);
});

test("resolveConfiguredTranscriptionProvider prefers explicit request provider, then env preset", () => {
	assert.equal(
		resolveConfiguredTranscriptionProvider(
			"google",
			{ GOOGLE_STT_MODEL: "" },
			{ STT_PRESET: "whisper-tiny" },
		),
		"google",
	);

	assert.equal(
		resolveConfiguredTranscriptionProvider(
			null,
			{ GOOGLE_STT_MODEL: "" },
			{
				STT_PRESET: "whisper-tiny",
				STT_PRESET_WHISPER_TINY_PROVIDER: "local-whisper",
			},
		),
		"local-whisper",
	);
});

test("resolveConfiguredTranscriptionProvider falls back to google when an OpenAI-compatible preset has no base URL", () => {
	assert.equal(
		resolveConfiguredTranscriptionProvider(
			null,
			{ GOOGLE_STT_MODEL: "gemini-3-flash-preview" },
			{
				STT_PRESET: "qwen3-asr",
				STT_PRESET_QWEN3_ASR_PROVIDER: "openai-compatible",
				OPENAI_COMPATIBLE_STT_BASE_URL: "",
			},
		),
		"google",
	);
});

test("resolveConfiguredTranscriptionModel uses the active env preset mapping", () => {
	assert.equal(
		resolveConfiguredTranscriptionModel({
			envVars: { GOOGLE_STT_MODEL: "gemini-3-flash-preview" },
			sttEnvVars: {
				STT_PRESET: "whisper-large-v3",
				STT_PRESET_WHISPER_LARGE_V3_PROVIDER: "local-whisper",
				STT_PRESET_WHISPER_LARGE_V3_MODEL: "large-v3",
			},
			provider: "local-whisper",
			rawModel: null,
		}),
		"large-v3",
	);
});

test("resolveConfiguredTranscriptionModel uses GOOGLE_STT_MODEL for the google preset", () => {
	assert.equal(
		resolveConfiguredTranscriptionModel({
			envVars: { GOOGLE_STT_MODEL: "gemini-3-flash-preview" },
			sttEnvVars: {
				STT_PRESET: "google",
				STT_PRESET_GOOGLE_PROVIDER: "google",
			},
			provider: "google",
			rawModel: null,
		}),
		"gemini-3-flash-preview",
	);
});

test("mimeTypeToFileExtension prefers a Whisper-compatible audio suffix", () => {
	assert.equal(mimeTypeToFileExtension("audio/wav"), "wav");
	assert.equal(mimeTypeToFileExtension("audio/webm;codecs=opus"), "webm");
	assert.equal(mimeTypeToFileExtension("audio/m4a"), "m4a");
});

test("buildLocalWhisperArgs pins deterministic transcription settings", () => {
	assert.deepEqual(
		buildLocalWhisperArgs({
			inputPath: "/tmp/input.wav",
			outputDir: "/tmp/whisper",
			model: "tiny",
			language: "en",
		}),
		[
			"/tmp/input.wav",
			"--model",
			"tiny",
			"--output_format",
			"json",
			"--output_dir",
			"/tmp/whisper",
			"--task",
			"transcribe",
			"--verbose",
			"False",
			"--condition_on_previous_text",
			"False",
			"--temperature",
			"0",
			"--fp16",
			"False",
			"--language",
			"en",
		],
	);
});

test("buildOpenAiCompatibleTranscriptionUrl appends the transcription endpoint to a base URL", () => {
	assert.equal(
		buildOpenAiCompatibleTranscriptionUrl("http://localhost:8001/v1"),
		"http://localhost:8001/v1/audio/transcriptions",
	);
	assert.equal(
		buildOpenAiCompatibleTranscriptionUrl("http://localhost:8001"),
		"http://localhost:8001/v1/audio/transcriptions",
	);
});

test("hasConfiguredOpenAiCompatibleBaseUrl requires an explicit base URL", () => {
	assert.equal(
		hasConfiguredOpenAiCompatibleBaseUrl({
			OPENAI_COMPATIBLE_STT_BASE_URL: "http://localhost:8001/v1",
		}),
		true,
	);
	assert.equal(
		hasConfiguredOpenAiCompatibleBaseUrl({
			OPENAI_COMPATIBLE_STT_BASE_URL: "",
		}),
		false,
	);
});

test("preset env map exposes the documented easy-switch presets", () => {
	assert.deepEqual(Object.keys(STT_PRESET_ENV_MAP).sort(), [
		"google",
		"qwen3-0.6b",
		"qwen3-asr",
		"whisper-large-v3",
		"whisper-tiny",
	]);
});
