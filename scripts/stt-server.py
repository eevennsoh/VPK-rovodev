"""
Local speech-to-text server for VPK.

Exposes an OpenAI-compatible POST /v1/audio/transcriptions endpoint
backed by mlx-whisper on Apple Silicon.

Usage:
    pnpm run dev:stt              # uses defaults
    STT_MODEL=large-v3 pnpm run dev:stt  # override model

Environment variables:
    STT_PORT   – port to listen on (default: 8801)
    STT_MODEL  – mlx-whisper model name (default: large-v3-turbo)
                 Supported: tiny, base, small, medium, large-v3, large-v3-turbo
                 Or a HuggingFace repo: mlx-community/whisper-large-v3-turbo
"""

import os
import tempfile
import time

import mlx_whisper
import uvicorn
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse

PORT = int(os.environ.get("STT_PORT", "8801"))
DEFAULT_MODEL = os.environ.get("STT_MODEL", "large-v3-turbo")

# Map short names to HuggingFace repos that mlx-whisper understands.
MODEL_MAP = {
	"tiny": "mlx-community/whisper-tiny-mlx",
	"base": "mlx-community/whisper-base-mlx-q4",
	"small": "mlx-community/whisper-small-mlx",
	"medium": "mlx-community/whisper-medium-mlx",
	"large-v3": "mlx-community/whisper-large-v3-mlx",
	"large-v3-turbo": "mlx-community/whisper-large-v3-turbo",
	# VPK preset aliases → actual Whisper models
	"qwen3-asr": "mlx-community/whisper-large-v3-turbo",
	"qwen3-0.6b": "mlx-community/whisper-tiny-mlx",
}

app = FastAPI(title="VPK Local STT Server")


def resolve_model(name: str) -> str:
	"""Resolve a short model name or pass through a full HF repo path."""
	if not name:
		name = DEFAULT_MODEL
	return MODEL_MAP.get(name, name)


@app.post("/v1/audio/transcriptions")
async def transcribe(
	file: UploadFile = File(...),
	model: str = Form(DEFAULT_MODEL),
	language: str | None = Form(None),
):
	resolved = resolve_model(model)
	start = time.perf_counter()

	# Write uploaded audio to a temp file for mlx_whisper.
	suffix = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"
	with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
		tmp.write(await file.read())
		tmp_path = tmp.name

	try:
		kwargs = {"path_or_hf_repo": resolved}
		if language:
			kwargs["language"] = language

		result = mlx_whisper.transcribe(tmp_path, **kwargs)
		text = (result.get("text") or "").strip()
		elapsed = time.perf_counter() - start

		print(f"[STT] Transcribed in {elapsed:.2f}s model={resolved} chars={len(text)}")

		return JSONResponse({"text": text})
	except Exception as exc:
		print(f"[STT] Transcription error: {exc}")
		return JSONResponse({"error": str(exc)}, status_code=500)
	finally:
		os.unlink(tmp_path)


@app.get("/health")
async def health():
	return {"status": "ok", "model": resolve_model(DEFAULT_MODEL)}


if __name__ == "__main__":
	model_display = resolve_model(DEFAULT_MODEL)
	print(f"[STT] Starting local STT server on port {PORT}")
	print(f"[STT] Model: {model_display}")
	print(f"[STT] Endpoint: http://localhost:{PORT}/v1/audio/transcriptions")

	# Warm up: trigger model download on first start.
	print(f"[STT] Warming up model (first run downloads weights)...")
	try:
		# Create a tiny silent WAV to trigger model load.
		import struct
		import wave

		with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
			warmup_path = tmp.name
			with wave.open(tmp, "wb") as wf:
				wf.setnchannels(1)
				wf.setsampwidth(2)
				wf.setframerate(16000)
				wf.writeframes(struct.pack("<h", 0) * 1600)  # 0.1s silence

		mlx_whisper.transcribe(warmup_path, path_or_hf_repo=model_display)
		os.unlink(warmup_path)
		print("[STT] Model ready.")
	except Exception as exc:
		print(f"[STT] Warmup failed (will retry on first request): {exc}")

	uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="warning")
