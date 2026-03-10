"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RovoUIMessage } from "@/lib/rovo-ui-messages";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RealtimeVoiceState = "idle" | "connecting" | "listening" | "speaking";

export type RealtimeGenerationState =
	| "idle"
	| "delegating"
	| "generating"
	| "steering"
	| "complete";

export interface DelegationRequest {
	prompt: string;
	intentType: string;
	conversationSummary?: string;
	urgency?: string;
	referencedFiles?: string[];
}

export interface UseRealtimeVoiceOptions {
	/** Called when GPT calls delegate_to_rovo with a synthesized task. */
	onDelegateToRovo: (request: DelegationRequest) => void;
	/** Current chat messages for thread context. */
	chatMessages: RovoUIMessage[];
	/** Whether RovoDev is currently generating. */
	isGenerating?: boolean;
}

export interface UseRealtimeVoiceResult {
	connect: () => void;
	disconnect: () => void;
	voiceState: RealtimeVoiceState;
	generationState: RealtimeGenerationState;
	isConnected: boolean;
	currentTranscript: string;
	modelTranscript: string;
	/** The raw MediaStream for visualization (bar visualizer). */
	micStream: MediaStream | null;
	/** Push context updates into the Realtime session (artifact completions, thread messages). */
	injectContext: (data: {
		type: "thread_context" | "artifact_complete" | "thread_message";
		summary?: string;
		role?: string;
		content?: string;
	}) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WS_ENDPOINT = "/api/realtime/audio-conversation";
const WS_URL_DISCOVERY_ENDPOINT = "/api/realtime/ws-url";
const AUDIO_SAMPLE_RATE = 24_000;
const RECONNECT_DELAYS = [500, 1_000, 2_000];
const MAX_RECONNECT_ATTEMPTS = RECONNECT_DELAYS.length;
const THREAD_SUMMARY_MAX_MESSAGES = 10;

// ---------------------------------------------------------------------------
// Client → Server message types
// ---------------------------------------------------------------------------

interface ClientAudioBufferAppend {
	type: "audio_buffer_append";
	audio: string; // base64 PCM16
}

interface ClientAudioBufferCommit {
	type: "audio_buffer_commit";
}

interface ClientSessionUpdate {
	type: "session_update";
	config: Record<string, unknown>;
}

interface ClientContextInject {
	type: "context_inject";
	data: {
		type: "thread_context" | "artifact_complete" | "thread_message";
		summary?: string;
		role?: string;
		content?: string;
	};
}

type ClientMessage =
	| ClientAudioBufferAppend
	| ClientAudioBufferCommit
	| ClientSessionUpdate
	| ClientContextInject;

// ---------------------------------------------------------------------------
// Server → Client message types
// ---------------------------------------------------------------------------

interface ServerSessionReady {
	type: "session_ready";
}

interface ServerAudioDelta {
	type: "audio_delta";
	delta: string; // base64 PCM16
}

interface ServerTextDelta {
	type: "text_delta";
	delta: string;
}

interface ServerTranscriptionDelta {
	type: "transcription_delta";
	delta: string;
}

interface ServerTranscriptionCompleted {
	type: "transcription_completed";
	transcript: string;
}

interface ServerSpeechStarted {
	type: "speech_started";
}

interface ServerSpeechStopped {
	type: "speech_stopped";
}

interface ServerError {
	type: "error";
	message: string;
}

interface ServerFunctionCall {
	type: "function_call";
	name: string;
	arguments: string;
	callId: string;
}

type ServerMessage =
	| ServerSessionReady
	| ServerAudioDelta
	| ServerTextDelta
	| ServerTranscriptionDelta
	| ServerTranscriptionCompleted
	| ServerSpeechStarted
	| ServerSpeechStopped
	| ServerError
	| ServerFunctionCall;

// ---------------------------------------------------------------------------
// Audio helpers
// ---------------------------------------------------------------------------

/** Decode a base64 string into a Float32Array of PCM16 samples. */
function decodeBase64Pcm16(base64: string): Float32Array {
	const binaryString = atob(base64);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	const int16 = new Int16Array(bytes.buffer);
	const float32 = new Float32Array(int16.length);
	for (let i = 0; i < int16.length; i++) {
		float32[i] = int16[i] / 32768;
	}
	return float32;
}

/** Encode a Float32Array of PCM samples to a base64 PCM16 string. */
function encodeFloat32ToPcm16Base64(samples: Float32Array): string {
	const int16 = new Int16Array(samples.length);
	for (let i = 0; i < samples.length; i++) {
		const clamped = Math.max(-1, Math.min(1, samples[i]));
		int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
	}
	const bytes = new Uint8Array(int16.buffer);
	let binary = "";
	const chunkSize = 8192;
	for (let i = 0; i < bytes.length; i += chunkSize) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
	}
	return btoa(binary);
}

/**
 * Resample from source sample rate to target sample rate using linear interpolation.
 */
function resampleLinear(
	samples: Float32Array,
	sourceSampleRate: number,
	targetSampleRate: number,
): Float32Array {
	if (sourceSampleRate === targetSampleRate) {
		return samples;
	}
	const ratio = sourceSampleRate / targetSampleRate;
	const outputLength = Math.ceil(samples.length / ratio);
	const output = new Float32Array(outputLength);
	for (let i = 0; i < outputLength; i++) {
		const srcIndex = i * ratio;
		const srcIndexFloor = Math.floor(srcIndex);
		const srcIndexCeil = Math.min(srcIndexFloor + 1, samples.length - 1);
		const fraction = srcIndex - srcIndexFloor;
		output[i] =
			samples[srcIndexFloor] * (1 - fraction) +
			samples[srcIndexCeil] * fraction;
	}
	return output;
}

// ---------------------------------------------------------------------------
// PCM16 playback queue
// ---------------------------------------------------------------------------

interface PlaybackQueue {
	audioContext: AudioContext;
	nextStartTime: number;
	isPlaying: boolean;
}

function createPlaybackQueue(): PlaybackQueue {
	const audioContext = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
	return {
		audioContext,
		nextStartTime: 0,
		isPlaying: false,
	};
}

function enqueueAudio(queue: PlaybackQueue, samples: Float32Array): void {
	const buffer = queue.audioContext.createBuffer(
		1,
		samples.length,
		AUDIO_SAMPLE_RATE,
	);
	buffer.getChannelData(0).set(samples);

	const source = queue.audioContext.createBufferSource();
	source.buffer = buffer;
	source.connect(queue.audioContext.destination);

	const now = queue.audioContext.currentTime;
	const startTime = Math.max(now, queue.nextStartTime);
	source.start(startTime);
	queue.nextStartTime = startTime + buffer.duration;
	queue.isPlaying = true;
}

function flushPlayback(queue: PlaybackQueue): void {
	const currentContext = queue.audioContext;
	queue.nextStartTime = 0;
	queue.isPlaying = false;
	void currentContext.close().catch(() => {});
	queue.audioContext = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
}

function destroyPlaybackQueue(queue: PlaybackQueue): void {
	queue.isPlaying = false;
	void queue.audioContext.close().catch(() => {});
}

// ---------------------------------------------------------------------------
// WebSocket URL builder
// ---------------------------------------------------------------------------

/** Cached backend WS base URL so we only fetch once per page load. */
let cachedWsBaseUrl: string | null = null;

/**
 * Resolve the backend WebSocket URL.
 *
 * In dev mode Next.js cannot proxy WebSocket upgrades, so we ask the server
 * for the direct Express backend URL via a lightweight API route that reads
 * the `.dev-backend-port` file server-side. In production the backend serves
 * the app directly, so same-origin works.
 */
async function buildWsUrl(): Promise<string> {
	if (cachedWsBaseUrl) {
		return `${cachedWsBaseUrl}${WS_ENDPOINT}`;
	}

	try {
		const res = await fetch(WS_URL_DISCOVERY_ENDPOINT);
		if (res.ok) {
			const data = (await res.json()) as { wsUrl?: string };
			if (data.wsUrl) {
				cachedWsBaseUrl = data.wsUrl;
				return `${data.wsUrl}${WS_ENDPOINT}`;
			}
		}
	} catch {
		// Fall through to same-origin default
	}

	// Fallback: same-origin (works in production where Express serves everything)
	const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
	return `${protocol}//${window.location.host}${WS_ENDPOINT}`;
}

// ---------------------------------------------------------------------------
// Thread summary builder
// ---------------------------------------------------------------------------

function buildThreadSummary(messages: RovoUIMessage[]): string {
	const recent = messages.slice(-THREAD_SUMMARY_MAX_MESSAGES);
	const lines: string[] = [];
	for (const msg of recent) {
		const role = msg.role === "user" ? "User" : "Assistant";
		const textParts = msg.parts
			.filter((p) => p.type === "text")
			.map((p) => (p as { text: string }).text)
			.join(" ");
		if (textParts.trim()) {
			lines.push(`${role}: ${textParts.trim().slice(0, 200)}`);
		}
	}
	return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useRealtimeVoice({
	onDelegateToRovo,
	chatMessages,
	isGenerating = false,
}: UseRealtimeVoiceOptions): UseRealtimeVoiceResult {
	const [voiceState, setVoiceState] = useState<RealtimeVoiceState>("idle");
	const [generationState, setGenerationState] =
		useState<RealtimeGenerationState>("idle");
	const [currentTranscript, setCurrentTranscript] = useState("");
	const [modelTranscript, setModelTranscript] = useState("");
	const [micStream, setMicStream] = useState<MediaStream | null>(null);

	// Refs for stable access in callbacks
	const voiceStateRef = useRef<RealtimeVoiceState>("idle");
	const activeRef = useRef(false);
	const wsRef = useRef<WebSocket | null>(null);
	const playbackQueueRef = useRef<PlaybackQueue | null>(null);
	const micStreamRef = useRef<MediaStream | null>(null);
	const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
	const micAudioContextRef = useRef<AudioContext | null>(null);
	const reconnectAttemptRef = useRef(0);
	const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const generationResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const pendingTranscriptRef = useRef("");
	const connectWsRef = useRef<() => void>(() => {});
	const disconnectRef = useRef<() => void>(() => {});
	const cleanupConnectionRef = useRef<() => void>(() => {});

	// Keep callback and context refs stable
	const onDelegateToRovoRef = useRef(onDelegateToRovo);
	useEffect(() => {
		onDelegateToRovoRef.current = onDelegateToRovo;
	}, [onDelegateToRovo]);

	const chatMessagesRef = useRef(chatMessages);
	useEffect(() => {
		chatMessagesRef.current = chatMessages;
	}, [chatMessages]);

	const isGeneratingRef = useRef(isGenerating);
	useEffect(() => {
		isGeneratingRef.current = isGenerating;
	}, [isGenerating]);

	// -- State helpers -------------------------------------------------------

	const setVoice = useCallback((state: RealtimeVoiceState) => {
		voiceStateRef.current = state;
		setVoiceState(state);
	}, []);

	const resetGenerationStateSoon = useCallback(() => {
		if (generationResetTimerRef.current !== null) {
			clearTimeout(generationResetTimerRef.current);
		}
		generationResetTimerRef.current = setTimeout(() => {
			generationResetTimerRef.current = null;
			setGenerationState("idle");
		}, 750);
	}, []);

	// -- Send WS message helper ----------------------------------------------

	const sendWsMessage = useCallback((message: ClientMessage) => {
		const ws = wsRef.current;
		if (ws && ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify(message));
		}
	}, []);

	// -- Inject context into Realtime session --------------------------------

	const injectContext = useCallback(
		(data: ClientContextInject["data"]) => {
			sendWsMessage({ type: "context_inject", data });
		},
		[sendWsMessage],
	);

	// -- Playback management -------------------------------------------------

	const stopPlayback = useCallback(() => {
		const queue = playbackQueueRef.current;
		if (queue) {
			flushPlayback(queue);
		}
		if (voiceStateRef.current === "speaking") {
			setVoice("listening");
		}
	}, [setVoice]);

	// -- Mic capture ---------------------------------------------------------

	const startMicCapture = useCallback(async () => {
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: {
				echoCancellation: true,
				noiseSuppression: true,
				autoGainControl: true,
				sampleRate: AUDIO_SAMPLE_RATE,
			},
		});
		micStreamRef.current = stream;
		setMicStream(stream);

		// Use ScriptProcessorNode for reliable cross-browser PCM capture.
		// AudioWorklet would be ideal but requires a separate worklet file.
		const audioContext = new AudioContext();
		micAudioContextRef.current = audioContext;
		const source = audioContext.createMediaStreamSource(stream);
		const processor = audioContext.createScriptProcessor(4096, 1, 1);
		scriptProcessorRef.current = processor;

		processor.onaudioprocess = (event: AudioProcessingEvent) => {
			if (!activeRef.current) {
				return;
			}
			const inputData = event.inputBuffer.getChannelData(0);
			const resampled = resampleLinear(
				inputData,
				audioContext.sampleRate,
				AUDIO_SAMPLE_RATE,
			);
			const base64 = encodeFloat32ToPcm16Base64(resampled);
			sendWsMessage({ type: "audio_buffer_append", audio: base64 });
		};

		source.connect(processor);
		processor.connect(audioContext.destination);
	}, [sendWsMessage]);

	const stopMicCapture = useCallback(() => {
		if (scriptProcessorRef.current) {
			scriptProcessorRef.current.disconnect();
			scriptProcessorRef.current = null;
		}
		if (micAudioContextRef.current) {
			void micAudioContextRef.current.close().catch(() => {});
			micAudioContextRef.current = null;
		}
		if (micStreamRef.current) {
			for (const track of micStreamRef.current.getTracks()) {
				track.stop();
			}
			micStreamRef.current = null;
			setMicStream(null);
		}
	}, []);

	// -- Handle completed transcription --------------------------------------
	// With delegate_to_rovo, GPT handles routing via function calling.
	// Transcription completion just updates the display state.

	// -- Handle server messages ----------------------------------------------

	const handleServerMessage = useCallback(
		(event: MessageEvent) => {
			if (!activeRef.current) {
				return;
			}

			let message: ServerMessage;
			try {
				message = JSON.parse(event.data as string) as ServerMessage;
			} catch {
				console.error("[RealtimeVoice] Failed to parse server message");
				return;
			}

			switch (message.type) {
				case "session_ready":
					reconnectAttemptRef.current = 0;
					setVoice("listening");
					// Inject initial thread context
					{
						const summary = buildThreadSummary(chatMessagesRef.current);
						if (summary) {
							injectContext({
								type: "thread_context",
								summary,
							});
						}
					}
					break;

				case "audio_delta": {
					const samples = decodeBase64Pcm16(message.delta);
					const queue = playbackQueueRef.current;
					if (queue) {
						enqueueAudio(queue, samples);
					}
					if (voiceStateRef.current !== "speaking") {
						setVoice("speaking");
					}
					break;
				}

				case "text_delta":
					setModelTranscript((prev) => prev + message.delta);
					break;

				case "transcription_delta":
					pendingTranscriptRef.current += message.delta;
					setCurrentTranscript(pendingTranscriptRef.current);
					break;

				case "transcription_completed": {
					const fullTranscript = message.transcript;
					pendingTranscriptRef.current = "";
					setCurrentTranscript(fullTranscript);
					// GPT handles routing via delegate_to_rovo function calling —
					// no client-side classification needed.
					break;
				}

				case "speech_started":
					// Barge-in: stop playback immediately
					stopPlayback();
					setModelTranscript("");
					pendingTranscriptRef.current = "";
					setCurrentTranscript("");
					if (voiceStateRef.current !== "listening") {
						setVoice("listening");
					}
					break;

				case "speech_stopped":
					// VAD detected end of speech. Transcription will follow.
					break;

				case "function_call":
					if (message.name === "end_voice_session") {
						// Model decided to end the voice session — disconnect after goodbye audio
						setTimeout(() => {
							disconnectRef.current();
						}, 1500);
					} else if (message.name === "delegate_to_rovo") {
						// GPT called delegate_to_rovo — parse and forward to shell
						try {
							const args = JSON.parse(message.arguments);
							setGenerationState("delegating");
							setCurrentTranscript("");
							onDelegateToRovoRef.current({
								prompt: args.prompt,
								intentType: args.intent_type,
								conversationSummary: args.conversation_summary,
								urgency: args.urgency,
								referencedFiles: args.referenced_files,
							});
							resetGenerationStateSoon();
						} catch (error) {
							console.error("[RealtimeVoice] Failed to parse delegate_to_rovo arguments:", error);
						}
					}
					break;

				case "error":
					console.error(
						"[RealtimeVoice] Server error:",
						message.message,
					);
					break;
			}
		},
		[
			injectContext,
			resetGenerationStateSoon,
			setVoice,
			stopPlayback,
		],
	);

	// -- Cleanup helper ------------------------------------------------------

	const cleanupConnection = useCallback(() => {
		if (reconnectTimerRef.current !== null) {
			clearTimeout(reconnectTimerRef.current);
			reconnectTimerRef.current = null;
		}
		if (generationResetTimerRef.current !== null) {
			clearTimeout(generationResetTimerRef.current);
			generationResetTimerRef.current = null;
		}
		if (wsRef.current) {
			wsRef.current.onopen = null;
			wsRef.current.onmessage = null;
			wsRef.current.onclose = null;
			wsRef.current.onerror = null;
			if (
				wsRef.current.readyState === WebSocket.OPEN ||
				wsRef.current.readyState === WebSocket.CONNECTING
			) {
				wsRef.current.close();
			}
			wsRef.current = null;
		}
		stopMicCapture();
		if (playbackQueueRef.current) {
			destroyPlaybackQueue(playbackQueueRef.current);
			playbackQueueRef.current = null;
		}
		pendingTranscriptRef.current = "";
	}, [stopMicCapture]);

	// Keep cleanupConnectionRef in sync so the unmount effect avoids TDZ during HMR
	useEffect(() => {
		cleanupConnectionRef.current = cleanupConnection;
	}, [cleanupConnection]);

	// -- Connect / reconnect -------------------------------------------------

	const connectWs = useCallback(() => {
		if (!activeRef.current) {
			return;
		}

		setVoice("connecting");

		void buildWsUrl().then((url) => {
			if (!activeRef.current) {
				return;
			}

			const ws = new WebSocket(url);
			wsRef.current = ws;

			// Initialize playback queue
			if (!playbackQueueRef.current) {
				playbackQueueRef.current = createPlaybackQueue();
			}

			ws.onopen = () => {
				if (!activeRef.current) {
					ws.close();
					return;
				}
				void startMicCapture().catch((error) => {
					console.error("[RealtimeVoice] Mic capture failed:", error);
					activeRef.current = false;
					cleanupConnection();
					setVoice("idle");
					setGenerationState("idle");
				});
			};

			ws.onmessage = handleServerMessage;

			ws.onclose = () => {
				if (!activeRef.current) {
					return;
				}

				// Attempt reconnect
				const attempt = reconnectAttemptRef.current;
				if (attempt < MAX_RECONNECT_ATTEMPTS) {
					setVoice("connecting");
					const delay = RECONNECT_DELAYS[attempt] ?? 2_000;
					reconnectAttemptRef.current = attempt + 1;
					stopMicCapture();
					reconnectTimerRef.current = setTimeout(() => {
						reconnectTimerRef.current = null;
						if (activeRef.current) {
							connectWsRef.current();
						}
					}, delay);
				} else {
					// Max retries exceeded — exit voice mode gracefully
					activeRef.current = false;
					cleanupConnection();
					setVoice("idle");
					setGenerationState("idle");
				}
			};

			ws.onerror = () => {
				// onclose will handle reconnection
			};
		}).catch((error) => {
			console.error("[RealtimeVoice] Failed to resolve WS URL:", error);
			activeRef.current = false;
			setVoice("idle");
		});
	}, [
		cleanupConnection,
		handleServerMessage,
		setVoice,
		startMicCapture,
		stopMicCapture,
	]);

	useEffect(() => {
		connectWsRef.current = connectWs;
	}, [connectWs]);

	// -- Public API ----------------------------------------------------------

	const connect = useCallback(() => {
		if (activeRef.current) {
			return;
		}
		activeRef.current = true;
		reconnectAttemptRef.current = 0;
		setCurrentTranscript("");
		setModelTranscript("");
		setGenerationState("idle");
		connectWs();
	}, [connectWs]);

	const disconnect = useCallback(() => {
		activeRef.current = false;
		cleanupConnection();
		setVoice("idle");
		setGenerationState("idle");
		setCurrentTranscript("");
		setModelTranscript("");
	}, [cleanupConnection, setVoice]);

	// Keep disconnectRef in sync so handleServerMessage can call it
	useEffect(() => {
		disconnectRef.current = disconnect;
	}, [disconnect]);

	// -- Cleanup on unmount --------------------------------------------------

	useEffect(() => {
		return () => {
			activeRef.current = false;
			cleanupConnectionRef.current();
		};
	}, [cleanupConnection]);

	// -- Return --------------------------------------------------------------

	const isConnected =
		voiceState === "listening" || voiceState === "speaking";

	return {
		connect,
		disconnect,
		voiceState,
		generationState,
		isConnected,
		currentTranscript,
		modelTranscript,
		micStream,
		injectContext,
	};
}
